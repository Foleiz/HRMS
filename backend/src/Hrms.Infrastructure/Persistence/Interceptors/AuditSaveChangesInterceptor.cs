using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Common.Attributes;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;

namespace Hrms.Infrastructure.Persistence.Interceptors;

/// <summary>
/// EF Core SaveChangesInterceptor สำหรับดักจับการเปลี่ยนแปลงข้อมูล (Change Data Capture: CDC)
/// - รองรับ Atomic Same-Transaction สำหรับทั้ง INSERT / UPDATE / DELETE
/// - บันทึก Actor Snapshot และ Write-time Subject Employee ทันทีตอนเขียน
/// - ปกปิดข้อมูลสำคัญด้วย [AuditSensitive] Attribute + Safety Pattern Fallback ตามมาตรฐาน PDPA
/// - บันทึกละเอียดเสมอสำหรับตารางพนักงาน การเงิน และสิทธิ์ (AlwaysDetailedTables)
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserService _currentUserService;
    private static readonly AsyncLocal<bool> _isAuditing = new();
    private static readonly ConcurrentDictionary<(Type EntityType, string PropName), AuditMaskMode?> _maskCache = new();

    private readonly List<AuditEntry> _pendingAddedEntries = new();
    private IDbContextTransaction? _autoTransaction;

    // รายการคอลัมน์ความลับสูงสุดที่ต้องปกปิดเป็น [REDACTED] เสมอ (Fallback ร่วมกับ [AuditSensitive])
    private static readonly HashSet<string> RedactedColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "PasswordHash", "password_hash", "password",
        "SalaryPinHash", "salary_pin_hash",
        "RefreshToken", "refresh_token", "Token", "OtpCode", "Secret",
        "SocialSecurityNoEncrypted", "social_security_no_encrypted",
        "CitizenIdEncrypted", "citizen_id_encrypted",
        "AccountHash", "account_hash",
        "SignatureData", "signature_data",
        "DocumentSnapshot", "DocumentFileData", "FileData", "SlipData", "PdfData", "ImageData", "AvatarData"
    };

    private static readonly HashSet<string> KeepLast4Columns = new(StringComparer.OrdinalIgnoreCase)
    {
        "CitizenId", "citizen_id",
        "SocialSecurityNo", "social_security_no",
        "AccountNumber", "account_number"
    };

    private static readonly HashSet<string> FinancialColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "BaseSalary", "TotalGrossIncome", "TotalDeductionAmount", "NetPayableSalary",
        "Amount", "Rate", "BonusAmount", "CommissionAmount", "SalesAmount", "ClaimAmount",
        "ApprovedAmount", "LastSalary", "MinSalary", "MaxSalary"
    };

    private static readonly HashSet<string> PiiColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "BirthDate", "PersonalPhone", "PersonalEmail", "PrimaryPhone", "SecondaryPhone",
        "AddressLine", "Address"
    };

    // ตารางที่ไม่ต้องบันทึก audit เพราะเป็นตาราง log ข้อผิดพลาดชั่วคราวของระบบนำเข้า
    private static readonly HashSet<string> ExcludedTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "attendance_import_error"
    };

    // ตารางสำคัญที่ห้ามยุบเป็น BULK เด็ดขาด (ประวัติพนักงาน + การเงิน/เงินเดือน + บทบาท/สิทธิ์/สายอนุมัติ)
    private static readonly HashSet<string> AlwaysDetailedTables = new(StringComparer.OrdinalIgnoreCase)
    {
        // ข้อมูลพนักงานและบัญชีผู้ใช้
        "employee", "employee_contact", "employee_address", "employee_bank_account",
        "employee_social_security", "employee_education", "employee_work_experience",
        "family_member", "emergency_contact", "employee_assignment", "employee_document",
        "employee_signature", "employee_transfer", "user_account", "user_role",
        // สิทธิ์ บทบาท และสายการอนุมัติ
        "role", "role_permission", "role_data_scope",
        "approval_flow", "approval_step", "approval_instance",
        // การเงิน เงินเดือน สัญญาจ้าง สวัสดิการ โบนัส ค่าคอมมิชชั่น
        "payroll", "payroll_detail", "payroll_period", "payroll_item", "payslip",
        "employee_salary", "salary_structure", "employment_contract",
        "employee_bonus", "employee_commission", "employee_benefit_claim", "benefit_claim"
    };

    private const int BulkThreshold = 20;
    private const int BulkSampleIdLimit = 50;
    private const int BulkColumnLimit = 30;

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

        OnBeforeSavingAsync(eventData.Context, sync: true, CancellationToken.None).GetAwaiter().GetResult();

        if (_pendingAddedEntries.Count > 0 && eventData.Context.Database.CurrentTransaction == null)
        {
            _autoTransaction = eventData.Context.Database.BeginTransaction();
        }

        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (_isAuditing.Value || eventData.Context == null)
            return await base.SavingChangesAsync(eventData, result, cancellationToken);

        await OnBeforeSavingAsync(eventData.Context, sync: false, cancellationToken);

        // หากมีรายการ INSERT ที่ต้องรอ Identity ID จาก PostgreSQL ให้เปิด Transaction ครอบอัตโนมัติ
        // เพื่อรับประกันว่าทั้งข้อมูลหลักและแถว AuditLog จะถูก Commit หรือ Rollback พร้อมกัน 100%
        if (_pendingAddedEntries.Count > 0 && eventData.Context.Database.CurrentTransaction == null)
        {
            _autoTransaction = await eventData.Context.Database.BeginTransactionAsync(cancellationToken);
        }

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
        if (_autoTransaction != null)
        {
            try { _autoTransaction.Rollback(); } catch { /* ignore rollback error */ }
            _autoTransaction.Dispose();
            _autoTransaction = null;
        }
        base.SaveChangesFailed(eventData);
    }

    public override async Task SaveChangesFailedAsync(
        DbContextErrorEventData eventData,
        CancellationToken cancellationToken = default)
    {
        _pendingAddedEntries.Clear();
        if (_autoTransaction != null)
        {
            try { await _autoTransaction.RollbackAsync(cancellationToken); } catch { /* ignore rollback error */ }
            await _autoTransaction.DisposeAsync();
            _autoTransaction = null;
        }
        await base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    private async Task OnBeforeSavingAsync(DbContext context, bool sync, CancellationToken cancellationToken)
    {
        _pendingAddedEntries.Clear();

        var actor = BuildActorSnapshot();
        var currentIp = _currentUserService.IpAddress;
        var currentUserAgent = _currentUserService.UserAgent;

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog &&
                        e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (entries.Count == 0) return;

        entries = entries.Where(e => !ExcludedTables.Contains(GetTableName(e))).ToList();
        if (entries.Count == 0) return;

        // 1. งานแบบกลุ่มขนาดใหญ่ (เฉพาะตารางที่ไม่อยู่ใน AlwaysDetailedTables เช่น นำเข้าเวลาสแกนนิ้ว):
        // ยุบเป็น 1 แถวสรุปและเก็บข้อมูลโครงสร้างลงคอลัมน์ metadata jsonb แทนการยัดลง FieldName
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
                var summary = BuildBulkSummary(group.Key, group.ToList(), actor, currentIp, currentUserAgent);
                if (summary != null) context.Set<AuditLog>().Add(summary);
            }
            entries = entries.Where(e => !bulkTables.Contains(GetTableName(e))).ToList();
            if (entries.Count == 0) return;
        }

        // 2. สืบหาพนักงานเจ้าของข้อมูล (Write-time Subject Employee Resolution) แบบ Batch
        var employeeMap = await ResolveEmployeesForEntriesAsync(context, entries, sync, cancellationToken);

        foreach (var entry in entries)
        {
            var tableName = GetTableName(entry);
            var entityClrType = entry.Entity.GetType();
            var subjectEmp = GetSubjectForEntry(entry, employeeMap);

            switch (entry.State)
            {
                case EntityState.Added:
                {
                    var auditEntry = new AuditEntry(entry)
                    {
                        TableName = tableName,
                        Action = "INSERT",
                        UserId = actor.UserId,
                        ActorType = actor.ActorType,
                        ActorUsername = actor.Username,
                        ActorName = actor.FullName,
                        ActorRole = actor.Roles,
                        SubjectEmployeeId = subjectEmp.Id,
                        SubjectEmployeeCode = subjectEmp.Code,
                        SubjectEmployeeName = subjectEmp.Name,
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

                        var mode = GetMaskMode(entityClrType, propName);
                        auditEntry.NewValues[propName] = ApplyMask(propName, prop.CurrentValue, mode, auditEntry.SensitiveFields);
                    }

                    var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
                    if (pkProp != null && !pkProp.IsTemporary && pkProp.CurrentValue != null &&
                        long.TryParse(pkProp.CurrentValue.ToString(), out var directId) && directId > 0)
                    {
                        auditEntry.EntityId = directId;
                        if (entry.Entity is Employee emp && !auditEntry.SubjectEmployeeId.HasValue)
                        {
                            auditEntry.SubjectEmployeeId = directId;
                            auditEntry.SubjectEmployeeCode = emp.EmployeeCode;
                            auditEntry.SubjectEmployeeName = emp.FullName;
                        }
                        context.Set<AuditLog>().Add(auditEntry.ToAuditLog());
                    }
                    else
                    {
                        _pendingAddedEntries.Add(auditEntry);
                    }
                    break;
                }

                case EntityState.Modified:
                {
                    var oldValues = new Dictionary<string, object?>();
                    var newValues = new Dictionary<string, object?>();
                    var changedColumns = new List<string>();
                    var sensitiveFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (var prop in entry.Properties)
                    {
                        if (prop.Metadata.IsPrimaryKey()) continue;

                        var propName = prop.Metadata.Name;
                        var original = prop.OriginalValue;
                        var current = prop.CurrentValue;

                        if (!Equals(original, current))
                        {
                            changedColumns.Add(propName);
                            var mode = GetMaskMode(entityClrType, propName);
                            oldValues[propName] = ApplyMask(propName, original, mode, sensitiveFields);
                            newValues[propName] = ApplyMask(propName, current, mode, sensitiveFields);
                        }
                    }

                    if (changedColumns.Count == 0) break;

                    // ข้ามการอัปเดต LastLoginAt / UpdatedAt ประจำรอบล็อกอิน
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
                        fieldName = fieldName[..497] + "...";
                    }

                    var metadataJson = sensitiveFields.Count > 0
                        ? JsonSerializer.Serialize(new { sensitiveFields = sensitiveFields.OrderBy(x => x).ToList() })
                        : null;

                    context.Set<AuditLog>().Add(new AuditLog
                    {
                        Action = "UPDATE",
                        EntityType = tableName,
                        EntityId = entityId,
                        FieldName = fieldName,
                        OldValue = JsonSerializer.Serialize(oldValues),
                        NewValue = JsonSerializer.Serialize(newValues),
                        Metadata = metadataJson,
                        UserId = actor.UserId,
                        ActorType = actor.ActorType,
                        ActorUsername = actor.Username,
                        ActorName = actor.FullName,
                        ActorRole = actor.Roles,
                        SubjectEmployeeId = subjectEmp.Id,
                        SubjectEmployeeCode = subjectEmp.Code,
                        SubjectEmployeeName = subjectEmp.Name,
                        IpAddress = currentIp,
                        UserAgent = currentUserAgent,
                        CreatedAt = DateTime.UtcNow
                    });
                    break;
                }

                case EntityState.Deleted:
                {
                    var oldValues = new Dictionary<string, object?>();
                    var sensitiveFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    long? entityId = null;

                    foreach (var prop in entry.Properties)
                    {
                        var propName = prop.Metadata.Name;
                        if (prop.Metadata.IsPrimaryKey() &&
                            prop.OriginalValue != null &&
                            long.TryParse(prop.OriginalValue.ToString(), out var id))
                        {
                            entityId = id;
                        }

                        var mode = GetMaskMode(entityClrType, propName);
                        oldValues[propName] = ApplyMask(propName, prop.OriginalValue, mode, sensitiveFields);
                    }

                    var metadataJson = sensitiveFields.Count > 0
                        ? JsonSerializer.Serialize(new { sensitiveFields = sensitiveFields.OrderBy(x => x).ToList() })
                        : null;

                    context.Set<AuditLog>().Add(new AuditLog
                    {
                        Action = "DELETE",
                        EntityType = tableName,
                        EntityId = entityId,
                        FieldName = null,
                        OldValue = JsonSerializer.Serialize(oldValues),
                        NewValue = null,
                        Metadata = metadataJson,
                        UserId = actor.UserId,
                        ActorType = actor.ActorType,
                        ActorUsername = actor.Username,
                        ActorName = actor.FullName,
                        ActorRole = actor.Roles,
                        // หากลบตัวพนักงานเอง subject_employee_id จะถูกเก็บเฉพาะในกรณีที่ไม่ติด FK ตอนลบตารางนั้น
                        SubjectEmployeeId = entry.Entity is Employee ? null : subjectEmp.Id,
                        SubjectEmployeeCode = subjectEmp.Code,
                        SubjectEmployeeName = subjectEmp.Name,
                        IpAddress = currentIp,
                        UserAgent = currentUserAgent,
                        CreatedAt = DateTime.UtcNow
                    });
                    break;
                }
            }
        }
    }

    private (long? UserId, string ActorType, string Username, string FullName, string? Roles) BuildActorSnapshot()
    {
        if (_currentUserService.UserId.HasValue)
        {
            var username = _currentUserService.Username ?? $"user#{_currentUserService.UserId.Value}";
            var fullName = !string.IsNullOrWhiteSpace(_currentUserService.FullName)
                ? _currentUserService.FullName!
                : username;
            var roles = _currentUserService.Roles.Count > 0
                ? string.Join(", ", _currentUserService.Roles)
                : null;
            return (_currentUserService.UserId.Value, "USER", username, fullName, roles);
        }

        return (null, "SYSTEM", "SYSTEM", "ระบบอัตโนมัติ", "SYSTEM");
    }

    private static async Task<Dictionary<long, (string Code, string Name)>> ResolveEmployeesForEntriesAsync(
        DbContext context,
        List<EntityEntry> entries,
        bool sync,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<long, (string Code, string Name)>();
        var neededEmpIds = new HashSet<long>();
        var neededPayrollIds = new HashSet<long>();

        // ดึงจาก Employee ที่ถูก Track อยู่ในหน่วยความจำก่อน
        foreach (var trackedEmp in context.ChangeTracker.Entries<Employee>())
        {
            if (trackedEmp.Entity.Id > 0)
            {
                result[trackedEmp.Entity.Id] = (trackedEmp.Entity.EmployeeCode, trackedEmp.Entity.FullName);
            }
        }

        foreach (var entry in entries)
        {
            if (entry.Entity is Employee emp)
            {
                if (emp.Id > 0) result[emp.Id] = (emp.EmployeeCode, emp.FullName);
                continue;
            }

            if (TryGetLongProperty(entry, "EmployeeId", out var empId) && empId > 0)
            {
                if (!result.ContainsKey(empId)) neededEmpIds.Add(empId);
                continue;
            }

            if (entry.Entity is PayrollDetail pd)
            {
                if (pd.Payroll != null && pd.Payroll.EmployeeId > 0)
                {
                    if (!result.ContainsKey(pd.Payroll.EmployeeId)) neededEmpIds.Add(pd.Payroll.EmployeeId);
                }
                else if (pd.PayrollId > 0)
                {
                    neededPayrollIds.Add(pd.PayrollId);
                }
            }
            else if (entry.Entity is Payslip ps && ps.PayrollId > 0)
            {
                neededPayrollIds.Add(ps.PayrollId);
            }
        }

        if (neededPayrollIds.Count > 0)
        {
            var payrollQuery = context.Set<Payroll>()
                .AsNoTracking()
                .Where(p => neededPayrollIds.Contains(p.Id))
                .Select(p => new { p.Id, p.EmployeeId });

            var payrollLinks = sync
                ? payrollQuery.ToList()
                : await payrollQuery.ToListAsync(cancellationToken);

            foreach (var pl in payrollLinks)
            {
                if (pl.EmployeeId > 0 && !result.ContainsKey(pl.EmployeeId))
                    neededEmpIds.Add(pl.EmployeeId);
            }

            // แนบ EmployeeId เข้า Navigation ชั่วคราวในกรณีที่ยังไม่ได้โหลด
            var payrollDict = payrollLinks.ToDictionary(x => x.Id, x => x.EmployeeId);
            foreach (var entry in entries)
            {
                if (entry.Entity is PayrollDetail pd && pd.Payroll == null && payrollDict.TryGetValue(pd.PayrollId, out var resolvedEmpId))
                {
                    entry.Metadata.FindNavigation(nameof(PayrollDetail.Payroll));
                    pd.Payroll = new Payroll { Id = pd.PayrollId, EmployeeId = resolvedEmpId };
                }
            }
        }

        if (neededEmpIds.Count > 0)
        {
            var empQuery = context.Set<Employee>()
                .AsNoTracking()
                .Where(e => neededEmpIds.Contains(e.Id))
                .Select(e => new { e.Id, e.EmployeeCode, e.FirstName, e.LastName, e.Prefix });

            var emps = sync
                ? empQuery.ToList()
                : await empQuery.ToListAsync(cancellationToken);

            foreach (var e in emps)
            {
                result[e.Id] = (e.EmployeeCode, $"{e.Prefix} {e.FirstName} {e.LastName}".Trim());
            }
        }

        return result;
    }

    private static (long? Id, string? Code, string? Name) GetSubjectForEntry(
        EntityEntry entry,
        Dictionary<long, (string Code, string Name)> employeeMap)
    {
        if (entry.Entity is Employee emp)
        {
            return (emp.Id > 0 ? emp.Id : null, emp.EmployeeCode, emp.FullName);
        }

        long? empId = null;
        if (TryGetLongProperty(entry, "EmployeeId", out var directEmpId) && directEmpId > 0)
        {
            empId = directEmpId;
        }
        else if (entry.Entity is PayrollDetail pd && pd.Payroll?.EmployeeId > 0)
        {
            empId = pd.Payroll.EmployeeId;
        }

        if (empId.HasValue)
        {
            if (employeeMap.TryGetValue(empId.Value, out var info))
            {
                return (empId.Value, info.Code, info.Name);
            }
            return (empId.Value, null, null);
        }

        return (null, null, null);
    }

    private static bool TryGetLongProperty(EntityEntry entry, string propName, out long result)
    {
        result = 0;
        var prop = entry.Properties.FirstOrDefault(p => string.Equals(p.Metadata.Name, propName, StringComparison.OrdinalIgnoreCase));
        if (prop == null) return false;
        var raw = prop.CurrentValue ?? prop.OriginalValue;
        return raw != null && long.TryParse(raw.ToString(), out result);
    }

    private static AuditMaskMode? GetMaskMode(Type entityType, string propName)
    {
        return _maskCache.GetOrAdd((entityType, propName), static key =>
        {
            var propInfo = key.EntityType.GetProperty(key.PropName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            var attr = propInfo?.GetCustomAttribute<AuditSensitiveAttribute>(inherit: true);
            if (attr != null) return attr.Mode;

            var name = key.PropName;
            if (RedactedColumns.Contains(name) ||
                name.Contains("Password", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("PinHash", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("Secret", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("Token", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("Encrypted", StringComparison.OrdinalIgnoreCase) ||
                name.EndsWith("Hash", StringComparison.OrdinalIgnoreCase))
            {
                return AuditMaskMode.Redacted;
            }

            if (KeepLast4Columns.Contains(name))
                return AuditMaskMode.KeepLast4;

            if (FinancialColumns.Contains(name))
                return AuditMaskMode.Financial;

            if (PiiColumns.Contains(name))
                return AuditMaskMode.PersonalPii;

            return null;
        });
    }

    private static object? ApplyMask(string propName, object? value, AuditMaskMode? mode, HashSet<string> sensitiveFieldsCollector)
    {
        if (mode == AuditMaskMode.Redacted)
        {
            return value == null ? null : "[REDACTED]";
        }

        if (mode == AuditMaskMode.KeepLast4)
        {
            if (value == null) return null;
            var str = value.ToString() ?? string.Empty;
            var digits = new string(str.Where(char.IsDigit).ToArray());
            if (string.IsNullOrEmpty(digits)) return string.IsNullOrWhiteSpace(str) ? null : "xxxx";
            return digits.Length > 4 ? new string('x', digits.Length - 4) + digits[^4..] : "xxxx";
        }

        if (mode is AuditMaskMode.Financial or AuditMaskMode.PersonalPii)
        {
            sensitiveFieldsCollector.Add(propName);
        }

        return FormatPropertyValue(value);
    }

    private static string GetTableName(EntityEntry entry) =>
        entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name.ToLowerInvariant();

    private static bool HasRealChange(EntityEntry entry) =>
        entry.Properties.Any(p => !p.Metadata.IsPrimaryKey() && !Equals(p.OriginalValue, p.CurrentValue));

    private static AuditLog? BuildBulkSummary(
        string tableName,
        List<EntityEntry> group,
        (long? UserId, string ActorType, string Username, string FullName, string? Roles) actor,
        string? ip,
        string? userAgent)
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

        var bulkPayload = JsonSerializer.Serialize(new
        {
            bulk = true,
            total,
            inserted,
            updated,
            deleted,
            changedColumns,
            sampleIds
        });

        return new AuditLog
        {
            Action = action,
            EntityType = tableName,
            EntityId = null,
            FieldName = changedColumns.Count > 0 ? string.Join(", ", changedColumns.Take(5)) : null,
            OldValue = null,
            NewValue = bulkPayload,
            Metadata = bulkPayload,
            UserId = actor.UserId,
            ActorType = actor.ActorType,
            ActorUsername = actor.Username,
            ActorName = actor.FullName,
            ActorRole = actor.Roles,
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

            if (_autoTransaction != null)
            {
                _autoTransaction.Commit();
            }
        }
        catch
        {
            if (_autoTransaction != null)
            {
                try { _autoTransaction.Rollback(); } catch { /* ignore */ }
            }
            throw;
        }
        finally
        {
            _pendingAddedEntries.Clear();
            _autoTransaction?.Dispose();
            _autoTransaction = null;
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

            if (_autoTransaction != null)
            {
                await _autoTransaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            if (_autoTransaction != null)
            {
                try { await _autoTransaction.RollbackAsync(cancellationToken); } catch { /* ignore */ }
            }
            throw;
        }
        finally
        {
            _pendingAddedEntries.Clear();
            if (_autoTransaction != null)
            {
                await _autoTransaction.DisposeAsync();
                _autoTransaction = null;
            }
            _isAuditing.Value = false;
        }
    }

    private List<AuditLog> ResolvePendingAddedEntries()
    {
        var logs = new List<AuditLog>();
        foreach (var audit in _pendingAddedEntries)
        {
            // ถอด Navigation ชั่วคราวที่สร้างเพื่อช่วยหา EmployeeId ไม่ให้ EF Core สับสน
            if (audit.Entry.Entity is PayrollDetail pd && pd.Payroll != null &&
                audit.Entry.Context.Entry(pd.Payroll).State == EntityState.Detached)
            {
                pd.Payroll = null;
            }

            var pkProp = audit.Entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            if (pkProp?.CurrentValue != null && long.TryParse(pkProp.CurrentValue.ToString(), out var finalId))
            {
                audit.EntityId = finalId;
                audit.NewValues[pkProp.Metadata.Name] = finalId;

                if (audit.Entry.Entity is Employee emp && finalId > 0)
                {
                    audit.SubjectEmployeeId = finalId;
                    audit.SubjectEmployeeCode = emp.EmployeeCode;
                    audit.SubjectEmployeeName = emp.FullName;
                }
            }
            logs.Add(audit.ToAuditLog());
        }
        return logs;
    }

    private static object? FormatPropertyValue(object? value)
    {
        if (value == null) return null;
        if (value is DateTime dt) return dt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        if (value is DateTimeOffset dto) return dto.ToString("O");
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
    public string ActorType { get; set; } = "USER";
    public string? ActorUsername { get; set; }
    public string? ActorName { get; set; }
    public string? ActorRole { get; set; }
    public long? SubjectEmployeeId { get; set; }
    public string? SubjectEmployeeCode { get; set; }
    public string? SubjectEmployeeName { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public Dictionary<string, object?> KeyValues { get; } = new();
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    public HashSet<string> SensitiveFields { get; } = new(StringComparer.OrdinalIgnoreCase);

    public AuditEntry(EntityEntry entry)
    {
        Entry = entry;
    }

    public AuditLog ToAuditLog()
    {
        var metadataJson = SensitiveFields.Count > 0
            ? JsonSerializer.Serialize(new { sensitiveFields = SensitiveFields.OrderBy(x => x).ToList() })
            : null;

        return new AuditLog
        {
            Action = Action,
            EntityType = TableName,
            EntityId = EntityId,
            FieldName = null,
            OldValue = OldValues.Count > 0 ? JsonSerializer.Serialize(OldValues) : null,
            NewValue = NewValues.Count > 0 ? JsonSerializer.Serialize(NewValues) : null,
            Metadata = metadataJson,
            UserId = UserId,
            ActorType = ActorType,
            ActorUsername = ActorUsername,
            ActorName = ActorName,
            ActorRole = ActorRole,
            SubjectEmployeeId = SubjectEmployeeId,
            SubjectEmployeeCode = SubjectEmployeeCode,
            SubjectEmployeeName = SubjectEmployeeName,
            IpAddress = IpAddress,
            UserAgent = UserAgent,
            CreatedAt = DateTime.UtcNow
        };
    }
}
