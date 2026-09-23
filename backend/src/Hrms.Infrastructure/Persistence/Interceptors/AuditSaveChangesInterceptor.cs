using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Hrms.Infrastructure.Persistence.Interceptors;

/// <summary>
/// EF Core SaveChangesInterceptor สำหรับดักจับการเปลี่ยนแปลงข้อมูล (Change Data Capture: CDC)
/// บันทึกลงตาราง hrms.audit_log แบบอัตโนมัติ 100% ระดับฐานข้อมูล
/// รองรับ INSERT, UPDATE, DELETE พร้อมค่าเดิม (old_value) และค่าใหม่ (new_value)
/// และ Masking ข้อมูลสำคัญ (Sensitive Data) ตามมาตรฐาน PDPA
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUserService;
    private static readonly AsyncLocal<bool> _isAuditing = new();

    // รายการคอลัมน์สำคัญที่ต้องปกปิด (Sensitive Data Masking)
    private static readonly HashSet<string> SensitiveColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "PasswordHash",
        "password_hash",
        "password",
        "RefreshToken",
        "refresh_token",
        "Token",
        "Secret",
        "SocialSecurityNoEncrypted",
        "social_security_no_encrypted",
        "SignatureData",
        "signature_data"
    };

    private readonly List<AuditEntry> _pendingAddedEntries = new();

    public AuditSaveChangesInterceptor(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        if (_isAuditing.Value || eventData.Context == null)
            return base.SavingChanges(eventData, result);

        OnBeforeSaving(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (_isAuditing.Value || eventData.Context == null)
            return await base.SavingChangesAsync(eventData, result, cancellationToken);

        OnBeforeSaving(eventData.Context);
        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override int SavedChanges(
        SaveChangesCompletedEventData eventData,
        int result)
    {
        if (_isAuditing.Value || eventData.Context == null || _pendingAddedEntries.Count == 0)
            return base.SavedChanges(eventData, result);

        OnAfterSaved(eventData.Context);
        return base.SavedChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        if (_isAuditing.Value || eventData.Context == null || _pendingAddedEntries.Count == 0)
            return await base.SavedChangesAsync(eventData, result, cancellationToken);

        await OnAfterSavedAsync(eventData.Context, cancellationToken);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData)
    {
        _pendingAddedEntries.Clear();
        base.SaveChangesFailed(eventData);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        _pendingAddedEntries.Clear();
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    private void OnBeforeSaving(DbContext context)
    {
        _pendingAddedEntries.Clear();

        var currentUserId = _currentUserService.UserId;
        var currentIp = _currentUserService.IpAddress;
        var currentUserAgent = _currentUserService.UserAgent;

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog &&
                        e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (entries.Count == 0) return;

        foreach (var entry in entries)
        {
            var tableName = entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name.ToLowerInvariant();

            switch (entry.State)
            {
                case EntityState.Added:
                {
                    var auditEntry = new AuditEntry(entry)
                    {
                        TableName = tableName,
                        Action = "INSERT",
                        UserId = currentUserId,
                        IpAddress = currentIp,
                        UserAgent = currentUserAgent
                    };

                    foreach (var prop in entry.Properties)
                    {
                        var propName = prop.Metadata.Name;
                        if (prop.Metadata.IsPrimaryKey())
                        {
                            auditEntry.KeyValues[propName] = prop.CurrentValue;
                        }

                        if (SensitiveColumns.Contains(propName))
                        {
                            auditEntry.NewValues[propName] = "[REDACTED]";
                        }
                        else
                        {
                            auditEntry.NewValues[propName] = FormatPropertyValue(prop.CurrentValue);
                        }
                    }

                    // หากมี Primary Key ที่ระบุมาแล้ว (ไม่ใช่ Temporary/0) สามารถเขียน AuditLog ได้ทันที
                    var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
                    if (pkProp != null && !pkProp.IsTemporary && pkProp.CurrentValue != null &&
                        long.TryParse(pkProp.CurrentValue.ToString(), out var directId) && directId > 0)
                    {
                        auditEntry.EntityId = directId;
                        context.Set<AuditLog>().Add(auditEntry.ToAuditLog());
                    }
                    else
                    {
                        // รอ Database Generate ID ใน SavedChanges
                        _pendingAddedEntries.Add(auditEntry);
                    }
                    break;
                }

                case EntityState.Modified:
                {
                    var oldValues = new Dictionary<string, object?>();
                    var newValues = new Dictionary<string, object?>();
                    var changedColumns = new List<string>();

                    foreach (var prop in entry.Properties)
                    {
                        if (prop.Metadata.IsPrimaryKey()) continue;

                        var propName = prop.Metadata.Name;
                        var original = prop.OriginalValue;
                        var current = prop.CurrentValue;

                        // ตรวจจับเฉพาะกรณีที่ค่าเปลี่ยนจริงๆ
                        if (!Equals(original, current))
                        {
                            changedColumns.Add(propName);

                            if (SensitiveColumns.Contains(propName))
                            {
                                oldValues[propName] = "[REDACTED]";
                                newValues[propName] = "[REDACTED]";
                            }
                            else
                            {
                                oldValues[propName] = FormatPropertyValue(original);
                                newValues[propName] = FormatPropertyValue(current);
                            }
                        }
                    }

                    // หากไม่มีคอลัมน์ใดเปลี่ยนแปลงเลย ไม่ต้องบันทึก AuditLog
                    if (changedColumns.Count == 0) break;

                    long? entityId = null;
                    var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
                    if (pkProp?.CurrentValue != null && long.TryParse(pkProp.CurrentValue.ToString(), out var id))
                    {
                        entityId = id;
                    }

                    var log = new AuditLog
                    {
                        Action = "UPDATE",
                        EntityType = tableName,
                        EntityId = entityId,
                        FieldName = string.Join(", ", changedColumns),
                        OldValue = JsonSerializer.Serialize(oldValues),
                        NewValue = JsonSerializer.Serialize(newValues),
                        UserId = currentUserId,
                        IpAddress = currentIp,
                        UserAgent = currentUserAgent,
                        CreatedAt = DateTime.UtcNow
                    };

                    context.Set<AuditLog>().Add(log);
                    break;
                }

                case EntityState.Deleted:
                {
                    var oldValues = new Dictionary<string, object?>();
                    long? entityId = null;

                    foreach (var prop in entry.Properties)
                    {
                        var propName = prop.Metadata.Name;
                        if (prop.Metadata.IsPrimaryKey())
                        {
                            if (prop.OriginalValue != null && long.TryParse(prop.OriginalValue.ToString(), out var id))
                            {
                                entityId = id;
                            }
                        }

                        if (SensitiveColumns.Contains(propName))
                        {
                            oldValues[propName] = "[REDACTED]";
                        }
                        else
                        {
                            oldValues[propName] = FormatPropertyValue(prop.OriginalValue);
                        }
                    }

                    var log = new AuditLog
                    {
                        Action = "DELETE",
                        EntityType = tableName,
                        EntityId = entityId,
                        FieldName = null,
                        OldValue = JsonSerializer.Serialize(oldValues),
                        NewValue = null,
                        UserId = currentUserId,
                        IpAddress = currentIp,
                        UserAgent = currentUserAgent,
                        CreatedAt = DateTime.UtcNow
                    };

                    context.Set<AuditLog>().Add(log);
                    break;
                }
            }
        }
    }

    private void OnAfterSaved(DbContext context)
    {
        if (_pendingAddedEntries.Count == 0) return;

        try
        {
            _isAuditing.Value = true;
            var logs = ResolvePendingAddedEntries();
            if (logs.Count > 0)
            {
                context.Set<AuditLog>().AddRange(logs);
                context.SaveChanges();
            }
        }
        finally
        {
            _pendingAddedEntries.Clear();
            _isAuditing.Value = false;
        }
    }

    private async Task OnAfterSavedAsync(DbContext context, CancellationToken cancellationToken)
    {
        if (_pendingAddedEntries.Count == 0) return;

        try
        {
            _isAuditing.Value = true;
            var logs = ResolvePendingAddedEntries();
            if (logs.Count > 0)
            {
                context.Set<AuditLog>().AddRange(logs);
                await context.SaveChangesAsync(cancellationToken);
            }
        }
        finally
        {
            _pendingAddedEntries.Clear();
            _isAuditing.Value = false;
        }
    }

    private List<AuditLog> ResolvePendingAddedEntries()
    {
        var logs = new List<AuditLog>();
        foreach (var audit in _pendingAddedEntries)
        {
            var pkProp = audit.Entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            if (pkProp?.CurrentValue != null && long.TryParse(pkProp.CurrentValue.ToString(), out var finalId))
            {
                audit.EntityId = finalId;
                audit.NewValues[pkProp.Metadata.Name] = finalId;
            }
            logs.Add(audit.ToAuditLog());
        }
        return logs;
    }

    private static object? FormatPropertyValue(object? value)
    {
        if (value == null) return null;
        if (value is DateTime dt) return dt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        if (value is DateOnly d) return d.ToString("yyyy-MM-dd");
        if (value is TimeOnly t) return t.ToString("HH:mm:ss");
        if (value is byte[] bytes) return $"<ไบนารี {bytes.Length} ไบต์>";
        return value;
    }
}

/// <summary>
/// Helper Class สำหรับเก็บสถานะ Audit Entry ก่อนทำการบันทึก
/// </summary>
public class AuditEntry
{
    public EntityEntry Entry { get; }
    public string TableName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public long? EntityId { get; set; }
    public long? UserId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Dictionary<string, object?> KeyValues { get; } = new();
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();

    public AuditEntry(EntityEntry entry)
    {
        Entry = entry;
    }

    public AuditLog ToAuditLog()
    {
        return new AuditLog
        {
            Action = Action,
            EntityType = TableName,
            EntityId = EntityId,
            FieldName = null,
            OldValue = OldValues.Count > 0 ? JsonSerializer.Serialize(OldValues) : null,
            NewValue = NewValues.Count > 0 ? JsonSerializer.Serialize(NewValues) : null,
            UserId = UserId,
            IpAddress = IpAddress,
            UserAgent = UserAgent,
            CreatedAt = DateTime.UtcNow
        };
    }
}
