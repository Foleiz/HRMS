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
        "CitizenIdEncrypted",
        "citizen_id_encrypted",
        "SignatureData",
        "signature_data",
        // ฉบับตรึงของหนังสือรับรอง (JSON ใหญ่ มีรูปภาพ) — ไม่เก็บซ้ำใน audit log
        "DocumentSnapshot"
    };

    // ตารางที่ไม่ต้องบันทึก audit เพราะเป็นบันทึกผลการทำงานของระบบอยู่แล้ว
    private static readonly HashSet<string> ExcludedTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "attendance_import_error"
    };

    // ถ้าตารางเดียวเปลี่ยนเกินจำนวนนี้ใน SaveChanges ครั้งเดียว (เช่น นำเข้าเวลา, คำนวณเงินเดือน, บันทึกสิทธิ์)
    // จะบันทึกเป็นแถวสรุป 1 แถวแทนการบันทึกทีละแถว เพื่อไม่ให้ audit_log โตเร็ว
    private const int BulkThreshold = 20;

    // ตารางข้อมูลพนักงานที่หน้า "ประวัติการแก้ไข" ของพนักงานอ่านทีละแถว: บันทึกละเอียดเสมอ ไม่สรุป
    private static readonly HashSet<string> AlwaysDetailedTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "employee", "employee_contact", "employee_address", "employee_bank_account",
        "employee_social_security", "employee_education", "employee_work_experience",
        "family_member", "emergency_contact", "employee_assignment", "employee_document",
        "user_account", "user_role"
    };
    private const int BulkSampleIdLimit = 50;
    private const int BulkColumnLimit = 30;

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

        entries = entries.Where(e => !ExcludedTables.Contains(GetTableName(e))).ToList();
        if (entries.Count == 0) return;

        // งานแบบกลุ่ม: สรุปเป็น 1 แถวต่อตาราง แล้วไม่บันทึกทีละแถว
        var bulkGroups = entries
            .GroupBy(GetTableName, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > BulkThreshold && !AlwaysDetailedTables.Contains(g.Key))
            .ToList();
        if (bulkGroups.Count > 0)
        {
            var bulkTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var group in bulkGroups)
            {
                bulkTables.Add(group.Key);
                var summary = BuildBulkSummary(group.Key, group.ToList(), currentUserId, currentIp, currentUserAgent);
                if (summary != null) context.Set<AuditLog>().Add(summary);
            }
            entries = entries.Where(e => !bulkTables.Contains(GetTableName(e))).ToList();
            if (entries.Count == 0) return;
        }

        foreach (var entry in entries)
        {
            var tableName = GetTableName(entry);

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
                            auditEntry.NewValues[propName] = FormatPropertyValue(propName, prop.CurrentValue);
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
                                oldValues[propName] = FormatPropertyValue(propName, original);
                                newValues[propName] = FormatPropertyValue(propName, current);
                            }
                        }
                    }

                    // หากไม่มีคอลัมน์ใดเปลี่ยนแปลงเลย ไม่ต้องบันทึก AuditLog
                    if (changedColumns.Count == 0) break;

                    // ข้ามการบันทึก AuditLog สำหรับการอัปเดต LastLoginAt / UpdatedAt ประจำรอบล็อกอิน เพื่อป้องกัน log บวม
                    if (entry.Entity is UserAccount && changedColumns.All(c => c == "LastLoginAt" || c == "UpdatedAt"))
                    {
                        break;
                    }

                    long? entityId = null;
                    var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
                    if (pkProp?.CurrentValue != null && long.TryParse(pkProp.CurrentValue.ToString(), out var id))
                    {
                        entityId = id;
                    }

                    var fieldName = string.Join(", ", changedColumns);
                    if (fieldName.Length > 500)
                    {
                        fieldName = fieldName.Substring(0, 497) + "...";
                    }

                    var log = new AuditLog
                    {
                        Action = "UPDATE",
                        EntityType = tableName,
                        EntityId = entityId,
                        FieldName = fieldName,
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
                            oldValues[propName] = FormatPropertyValue(propName, prop.OriginalValue);
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

    private static string GetTableName(EntityEntry entry) =>
        entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name.ToLowerInvariant();

    private static bool HasRealChange(EntityEntry entry) =>
        entry.Properties.Any(p => !p.Metadata.IsPrimaryKey() && !Equals(p.OriginalValue, p.CurrentValue));

    /// <summary>
    /// สร้างแถวสรุปสำหรับการเปลี่ยนแปลงแบบกลุ่ม: FieldName = "BULK|เพิ่ม|แก้ไข|ลบ",
    /// NewValue เก็บจำนวน, คอลัมน์ที่เปลี่ยน และตัวอย่างรหัสข้อมูล (ไม่เก็บค่าของแต่ละแถว)
    /// </summary>
    private static AuditLog? BuildBulkSummary(string tableName, List<EntityEntry> group, long? userId, string? ip, string? userAgent)
    {
        var inserted = group.Count(e => e.State == EntityState.Added);
        var deletedEntries = group.Where(e => e.State == EntityState.Deleted).ToList();
        var updatedEntries = group.Where(e => e.State == EntityState.Modified && HasRealChange(e)).ToList();
        var deleted = deletedEntries.Count;
        var updated = updatedEntries.Count;
        var total = inserted + updated + deleted;
        if (total == 0) return null;

        var action = inserted == total ? "INSERT" : deleted == total ? "DELETE" : "UPDATE";

        var sampleIds = updatedEntries.Concat(deletedEntries)
            .Select(e => e.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.OriginalValue)
            .Select(v => v != null && long.TryParse(v.ToString(), out var id) ? id : (long?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Take(BulkSampleIdLimit)
            .ToList();

        var changedColumns = updatedEntries
            .SelectMany(e => e.Properties
                .Where(p => !p.Metadata.IsPrimaryKey() && !Equals(p.OriginalValue, p.CurrentValue))
                .Select(p => p.Metadata.Name))
            .Distinct()
            .Take(BulkColumnLimit)
            .ToList();

        return new AuditLog
        {
            Action = action,
            EntityType = tableName,
            EntityId = null,
            FieldName = $"BULK|{inserted}|{updated}|{deleted}",
            OldValue = null,
            NewValue = JsonSerializer.Serialize(new
            {
                bulk = true,
                total,
                inserted,
                updated,
                deleted,
                changedColumns,
                sampleIds
            }),
            UserId = userId,
            IpAddress = ip,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };
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

    /// <summary>เลขบัญชีธนาคารเก็บใน audit แบบ 4 ตัวท้าย, account_hash ไม่เก็บ (PDPA)</summary>
    private static object? FormatPropertyValue(string propName, object? value)
    {
        if (value is string s && propName.Equals("AccountNumber", StringComparison.OrdinalIgnoreCase))
        {
            var digits = new string(s.Where(char.IsDigit).ToArray());
            return digits.Length > 4 ? new string('x', digits.Length - 4) + digits[^4..] : "xxxx";
        }
        // เลขบัตรประชาชน: เก็บใน audit แบบปิดบัง เหลือ 4 ตัวท้าย (PDPA)
        if (value is string cid && propName.Equals("CitizenId", StringComparison.OrdinalIgnoreCase))
        {
            var digits = new string(cid.Where(char.IsDigit).ToArray());
            return digits.Length > 4 ? new string('x', digits.Length - 4) + digits[^4..] : "xxxx";
        }
        if (propName.Equals("AccountHash", StringComparison.OrdinalIgnoreCase))
            return value == null ? null : "[REDACTED]";
        return FormatPropertyValue(value);
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
