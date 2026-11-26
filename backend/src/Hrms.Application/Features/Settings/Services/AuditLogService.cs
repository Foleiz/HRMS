using System.Text;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Settings.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly IDataScopeService _dataScopeService;
    private readonly ICurrentUserService _currentUserService;

    // รายชื่อฟิลด์การเงินและข้อมูลส่วนบุคคลที่ต้องมีสิทธิ์ SETTINGS_AUDIT_SENSITIVE_VIEW จึงจะเปิดดูค่าจริงได้
    private static readonly HashSet<string> SensitiveViewerFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "BaseSalary", "TotalGrossIncome", "TotalDeductionAmount", "NetPayableSalary",
        "Amount", "Rate", "BonusAmount", "CommissionAmount", "SalesAmount", "ClaimAmount",
        "ApprovedAmount", "LastSalary", "MinSalary", "MaxSalary",
        "BirthDate", "PersonalPhone", "PersonalEmail", "PrimaryPhone", "SecondaryPhone",
        "AddressLine", "Address"
    };

    public AuditLogService(
        IHrmsDbContext dbContext,
        IDataScopeService dataScopeService,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _dataScopeService = dataScopeService;
        _currentUserService = currentUserService;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        long? entityId = null,
        string? fieldName = null,
        string? oldValue = null,
        string? newValue = null,
        long? userId = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? metadata = null,
        long? subjectEmployeeId = null,
        string? actorType = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveUserId = userId ?? _currentUserService.UserId;
        string resolvedActorType;
        string? actorUsername = null;
        string? actorName = null;
        string? actorRole = null;

        if (effectiveUserId.HasValue)
        {
            resolvedActorType = actorType ?? "USER";
            if (_currentUserService.UserId == effectiveUserId.Value && !string.IsNullOrWhiteSpace(_currentUserService.Username))
            {
                actorUsername = StripDeletedSuffix(_currentUserService.Username);
                actorName = !string.IsNullOrWhiteSpace(_currentUserService.FullName) ? _currentUserService.FullName : actorUsername;
                actorRole = _currentUserService.Roles.Count > 0 ? string.Join(", ", _currentUserService.Roles) : null;
            }
            else
            {
                var u = await _dbContext.UserAccounts.AsNoTracking()
                    .Where(x => x.Id == effectiveUserId.Value)
                    .Select(x => new
                    {
                        x.Username,
                        FirstName = x.Employee != null ? x.Employee.FirstName : null,
                        LastName = x.Employee != null ? x.Employee.LastName : null,
                        Roles = x.UserRoles.Select(ur => ur.Role.RoleCode).ToList()
                    })
                    .FirstOrDefaultAsync(cancellationToken);

                if (u != null)
                {
                    actorUsername = StripDeletedSuffix(u.Username);
                    var full = $"{u.FirstName} {u.LastName}".Trim();
                    actorName = !string.IsNullOrWhiteSpace(full) ? full : actorUsername;
                    actorRole = u.Roles.Count > 0 ? string.Join(", ", u.Roles) : null;
                }
            }
        }
        else
        {
            resolvedActorType = actorType ?? "SYSTEM";
            actorUsername = resolvedActorType == "ANONYMOUS" ? "ANONYMOUS" : "SYSTEM";
            actorName = resolvedActorType == "ANONYMOUS" ? "ไม่ระบุตัวตน" : "ระบบอัตโนมัติ";
            actorRole = resolvedActorType;
        }

        string? subjectCode = null;
        string? subjectName = null;
        var resolvedSubjectId = subjectEmployeeId ?? ReadEmployeeId(newValue) ?? ReadEmployeeId(oldValue);
        if (!resolvedSubjectId.HasValue && string.Equals(entityType, "employee", StringComparison.OrdinalIgnoreCase) && entityId.HasValue)
        {
            resolvedSubjectId = entityId.Value;
        }

        if (resolvedSubjectId.HasValue)
        {
            var emp = await _dbContext.Employees.AsNoTracking()
                .Where(e => e.Id == resolvedSubjectId.Value)
                .Select(e => new { e.EmployeeCode, e.Prefix, e.FirstName, e.LastName })
                .FirstOrDefaultAsync(cancellationToken);
            if (emp != null)
            {
                subjectCode = emp.EmployeeCode;
                subjectName = $"{emp.Prefix} {emp.FirstName} {emp.LastName}".Trim();
            }
            else
            {
                resolvedSubjectId = null;
            }
        }

        var log = new AuditLog
        {
            Action = action.ToUpperInvariant(),
            EntityType = entityType.ToUpperInvariant(),
            EntityId = entityId,
            FieldName = fieldName,
            OldValue = EnsureJson(oldValue),
            NewValue = EnsureJson(newValue),
            Metadata = EnsureJson(metadata),
            UserId = effectiveUserId,
            ActorType = resolvedActorType,
            ActorUsername = actorUsername,
            ActorName = actorName,
            ActorRole = actorRole,
            SubjectEmployeeId = resolvedSubjectId,
            SubjectEmployeeCode = subjectCode,
            SubjectEmployeeName = subjectName,
            IpAddress = ipAddress ?? _currentUserService.IpAddress,
            UserAgent = userAgent ?? _currentUserService.UserAgent,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.AuditLogs.Add(log);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private bool CanViewSensitiveAuditValues()
    {
        return _currentUserService.HasRole("ADMIN") ||
               _currentUserService.HasRole("SYSTEM_SUPER") ||
               _currentUserService.HasPermission("SETTINGS_AUDIT_SENSITIVE_VIEW");
    }

    private IQueryable<AuditLog> BuildFilterQuery(AuditLogQueryFilter filter)
    {
        var baseQuery = _dbContext.AuditLogs
            .AsNoTracking()
            .AsQueryable();

        if (filter.StartDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(filter.StartDate.Value.Date, DateTimeKind.Utc);
            baseQuery = baseQuery.Where(a => a.CreatedAt >= startUtc);
        }

        if (filter.EndDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(filter.EndDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            baseQuery = baseQuery.Where(a => a.CreatedAt <= endUtc);
        }

        if (filter.UserId.HasValue)
        {
            baseQuery = baseQuery.Where(a => a.UserId == filter.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action) && filter.Action != "ทั้งหมด")
        {
            var act = filter.Action.Trim().ToUpperInvariant();
            baseQuery = baseQuery.Where(a => a.Action == act);
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityType) && filter.EntityType != "ทั้งหมด")
        {
            var ent = filter.EntityType.Trim().ToLowerInvariant();
            baseQuery = baseQuery.Where(a => a.EntityType.ToLower() == ent);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(a =>
                (a.ActorUsername != null && a.ActorUsername.ToLower().Contains(s)) ||
                (a.ActorName != null && a.ActorName.ToLower().Contains(s)) ||
                (a.SubjectEmployeeName != null && a.SubjectEmployeeName.ToLower().Contains(s)) ||
                (a.SubjectEmployeeCode != null && a.SubjectEmployeeCode.ToLower().Contains(s)) ||
                (a.User != null && a.User.Username.ToLower().Contains(s)) ||
                (a.User != null && a.User.Employee != null && (a.User.Employee.FirstName.ToLower().Contains(s) || a.User.Employee.LastName.ToLower().Contains(s))) ||
                (a.FieldName != null && a.FieldName.ToLower().Contains(s)) ||
                (a.IpAddress != null && a.IpAddress.ToLower().Contains(s)) ||
                a.EntityType.ToLower().Contains(s) ||
                (a.EntityId != null && a.EntityId.ToString()!.Contains(s)));
        }

        return baseQuery;
    }

    private static IQueryable<AuditLog> ApplyDataScope(IQueryable<AuditLog> baseQuery, List<long>? accessibleEmpIds)
    {
        if (accessibleEmpIds == null) return baseQuery;

        // กรองตามพนักงานเจ้าของข้อมูล (SubjectEmployeeId) เป็นหลัก เพื่อให้หัวหน้างานเห็นทุกการกระทำที่เกิดกับลูกน้องในสังกัด
        // และเห็นกิจกรรมระบบทั่วไปของผู้ใช้ในสังกัดที่ไม่กระทบข้อมูลส่วนบุคคลของคนนอกขอบเขต
        return baseQuery.Where(a =>
            (a.SubjectEmployeeId.HasValue && accessibleEmpIds.Contains(a.SubjectEmployeeId.Value)) ||
            (!a.SubjectEmployeeId.HasValue && a.User != null && accessibleEmpIds.Contains(a.User.EmployeeId)));
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var accessibleEmpIds = await _dataScopeService.GetAccessibleEmployeeIdsAsync("SETTINGS_AUDIT_VIEW", cancellationToken);
        var baseQuery = ApplyDataScope(BuildFilterQuery(filter), accessibleEmpIds);

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        int page = filter.Page > 0 ? filter.Page : 1;
        int pageSize = filter.PageSize > 0 ? filter.PageSize : 10;

        var entities = await baseQuery
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(a => a.User)
                .ThenInclude(u => u!.Employee)
            .ToListAsync(cancellationToken);

        // ค้นหา Fallback เฉพาะแถวเก่าที่ยังไม่มี SubjectEmployeeId ตอนเขียน
        var legacyRows = entities.Where(e => !e.SubjectEmployeeId.HasValue && string.IsNullOrEmpty(e.SubjectEmployeeName)).ToList();
        var fallbackSubjects = legacyRows.Count > 0
            ? await ResolveSubjectEmployeesAsync(legacyRows, cancellationToken)
            : new Dictionary<long, (long Id, string Code, string Name)>();

        bool canViewSensitive = CanViewSensitiveAuditValues();

        var items = entities.Select(a =>
        {
            var (username, fullName, actorType, actorRole) = ResolveActorDisplay(a);

            long? subId = a.SubjectEmployeeId;
            string? subCode = a.SubjectEmployeeCode;
            string? subName = a.SubjectEmployeeName;
            if (!subId.HasValue && fallbackSubjects.TryGetValue(a.Id, out var fb))
            {
                subId = fb.Id;
                subCode = fb.Code;
                subName = fb.Name;
            }

            var displayOld = canViewSensitive ? CleanJsonDisplay(a.OldValue) : MaskSensitiveJsonForViewer(a.OldValue, a.Metadata);
            var displayNew = canViewSensitive ? CleanJsonDisplay(a.NewValue) : MaskSensitiveJsonForViewer(a.NewValue, a.Metadata);

            var desc = FormatDescription(a.Action, a.EntityType, a.EntityId, a.FieldName, a.Metadata);
            if (!string.IsNullOrWhiteSpace(subName) && a.Action is not ("LOGIN" or "LOGOUT" or "LOGIN_FAILED"))
            {
                desc += $" ของ {subName}";
            }

            return new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                ActorType = actorType,
                Username = username,
                FullName = fullName,
                ActorRole = actorRole,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                FieldName = a.FieldName,
                OldValue = displayOld,
                NewValue = displayNew,
                Metadata = CleanJsonDisplay(a.Metadata),
                IpAddress = a.IpAddress,
                UserAgent = a.UserAgent,
                Description = desc,
                CreatedAt = a.CreatedAt,
                SubjectEmployeeId = subId,
                SubjectEmployeeCode = subCode,
                SubjectEmployeeName = subName,
            };
        }).ToList();

        return new PagedResult<AuditLogDto>(items, totalCount, page, pageSize);
    }

    public async Task<byte[]> ExportLogsCsvAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var accessibleEmpIds = await _dataScopeService.GetAccessibleEmployeeIdsAsync("SETTINGS_AUDIT_VIEW", cancellationToken);
        var baseQuery = ApplyDataScope(BuildFilterQuery(filter), accessibleEmpIds);
        bool canViewSensitive = CanViewSensitiveAuditValues();

        var query = baseQuery
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.CreatedAt,
                a.ActorType,
                a.ActorUsername,
                a.ActorName,
                a.ActorRole,
                FallbackUsername = a.User != null ? a.User.Username : null,
                FallbackFullName = a.User != null && a.User.Employee != null
                    ? a.User.Employee.FirstName + " " + a.User.Employee.LastName
                    : null,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.SubjectEmployeeCode,
                a.SubjectEmployeeName,
                a.FieldName,
                a.OldValue,
                a.NewValue,
                a.Metadata,
                a.IpAddress
            });

        using var memoryStream = new MemoryStream();
        using (var writer = new StreamWriter(memoryStream, new UTF8Encoding(true), bufferSize: 65536, leaveOpen: true))
        {
            await writer.WriteLineAsync("ID,วันเวลา,ประเภทผู้กระทำ,ผู้ใช้งาน,ชื่อ-นามสกุล,บทบาท,การกระทำ,ประเภทข้อมูล,รหัสข้อมูล,พนักงานเจ้าของข้อมูล,ฟิลด์ที่แก้ไข,ค่าเดิม,ค่าใหม่,IP Address");

            await foreach (var item in query.AsAsyncEnumerable().WithCancellation(cancellationToken))
            {
                var dateStr = item.CreatedAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
                var username = StripDeletedSuffix(item.ActorUsername ?? item.FallbackUsername) ?? "SYSTEM";
                var fullName = item.ActorName ?? item.FallbackFullName ?? (username == "SYSTEM" ? "ระบบอัตโนมัติ" : username);
                var oldVal = EscapeCsv(canViewSensitive ? CleanJsonDisplay(item.OldValue) : MaskSensitiveJsonForViewer(item.OldValue, item.Metadata));
                var newVal = EscapeCsv(canViewSensitive ? CleanJsonDisplay(item.NewValue) : MaskSensitiveJsonForViewer(item.NewValue, item.Metadata));
                var subjectText = !string.IsNullOrWhiteSpace(item.SubjectEmployeeName)
                    ? $"{item.SubjectEmployeeName} ({item.SubjectEmployeeCode})".Trim()
                    : "";

                await writer.WriteLineAsync(
                    $"{item.Id},\"{dateStr}\",\"{EscapeCsv(item.ActorType)}\",\"{EscapeCsv(username)}\",\"{EscapeCsv(fullName)}\",\"{EscapeCsv(item.ActorRole)}\",\"{item.Action}\",\"{EscapeCsv(item.EntityType)}\",\"{item.EntityId}\",\"{EscapeCsv(subjectText)}\",\"{EscapeCsv(item.FieldName)}\",\"{oldVal}\",\"{newVal}\",\"{EscapeCsv(item.IpAddress)}\"");
            }

            await writer.FlushAsync(cancellationToken);
        }

        return memoryStream.ToArray();
    }

    public async Task<List<string>> GetDistinctEntityTypesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.AuditLogs
            .AsNoTracking()
            .Select(a => a.EntityType)
            .Distinct()
            .OrderBy(e => e)
            .ToListAsync(cancellationToken);
    }

    private static (string Username, string FullName, string ActorType, string? ActorRole) ResolveActorDisplay(AuditLog a)
    {
        var username = StripDeletedSuffix(a.ActorUsername)
                       ?? StripDeletedSuffix(a.User?.Username)
                       ?? (a.UserId.HasValue ? $"user#{a.UserId.Value}" : "SYSTEM");

        var fullName = !string.IsNullOrWhiteSpace(a.ActorName)
            ? a.ActorName!
            : (a.User?.Employee != null
                ? $"{a.User.Employee.FirstName} {a.User.Employee.LastName}".Trim()
                : (username == "SYSTEM" ? "ระบบอัตโนมัติ" : username));

        var actorType = !string.IsNullOrWhiteSpace(a.ActorType)
            ? a.ActorType
            : (a.UserId.HasValue ? "USER" : "SYSTEM");

        var role = a.ActorRole;
        if (a.User?.Status == "DELETED" && (role == null || !role.Contains("ระงับบัญชีแล้ว")))
        {
            role = string.IsNullOrWhiteSpace(role) ? "บัญชีถูกระงับแล้ว" : $"{role} (ระงับบัญชีแล้ว)";
        }

        return (username, fullName, actorType, role);
    }

    private static string? StripDeletedSuffix(string? username)
    {
        if (string.IsNullOrWhiteSpace(username)) return null;
        var idx = username.IndexOf("#deleted_", StringComparison.OrdinalIgnoreCase);
        return idx > 0 ? username[..idx] : username;
    }

    private static string? MaskSensitiveJsonForViewer(string? rawJson, string? metadataJson)
    {
        var cleaned = CleanJsonDisplay(rawJson);
        if (string.IsNullOrWhiteSpace(cleaned) || !cleaned.TrimStart().StartsWith("{"))
            return cleaned;

        var extraSensitive = new HashSet<string>(SensitiveViewerFields, StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(metadataJson) && metadataJson.TrimStart().StartsWith("{"))
        {
            try
            {
                using var metaDoc = JsonDocument.Parse(metadataJson);
                if (metaDoc.RootElement.TryGetProperty("sensitiveFields", out var sfArr) && sfArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in sfArr.EnumerateArray())
                    {
                        var name = el.GetString();
                        if (!string.IsNullOrWhiteSpace(name)) extraSensitive.Add(name);
                    }
                }
            }
            catch { /* ignore malformed metadata */ }
        }

        try
        {
            using var doc = JsonDocument.Parse(cleaned);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return cleaned;

            bool modified = false;
            var output = new Dictionary<string, object?>();
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (extraSensitive.Contains(prop.Name))
                {
                    output[prop.Name] = prop.Value.ValueKind == JsonValueKind.Null ? null : "[ปกปิดตามสิทธิ์]";
                    modified = true;
                }
                else
                {
                    output[prop.Name] = JsonSerializer.Deserialize<object>(prop.Value.GetRawText());
                }
            }

            return modified ? JsonSerializer.Serialize(output) : cleaned;
        }
        catch
        {
            return cleaned;
        }
    }

    private static readonly HashSet<string> _employeeTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "employee", "employee_assignment", "employment_contract", "employee_bank_account",
        "employee_contact", "employee_address", "employee_education", "employee_work_experience",
        "employee_social_security", "employee_tax_deduction", "employee_document", "employee_avatar",
        "employee_change_history", "employee_transfer", "leave_balance", "leave_request",
        "attendance_record", "attendance_daily_log", "attendance_adjustment", "payroll",
        "benefit_claim", "employee_benefit_claim", "resignation_request", "certificate_request", "general_request",
        "notification", "user_account"
    };

    private async Task<Dictionary<long, (long Id, string Code, string Name)>> ResolveSubjectEmployeesAsync(
        List<AuditLog> logs, CancellationToken cancellationToken)
    {
        var result = new Dictionary<long, (long, string, string)>();
        var logToEmployee = new Dictionary<long, long>();
        var lookups = new Dictionary<string, List<(long LogId, long RowId)>>();

        foreach (var a in logs)
        {
            var table = a.EntityType.ToLowerInvariant();
            if (a.Action is "LOGIN" or "LOGOUT" or "LOGIN_FAILED") continue;
            if (table == "employee" && a.EntityId.HasValue)
            {
                logToEmployee[a.Id] = a.EntityId.Value;
                continue;
            }
            var fromJson = ReadEmployeeId(a.NewValue) ?? ReadEmployeeId(a.OldValue);
            if (fromJson.HasValue)
            {
                logToEmployee[a.Id] = fromJson.Value;
                continue;
            }
            if (a.EntityId.HasValue)
            {
                if (!lookups.TryGetValue(table, out var list)) lookups[table] = list = new();
                list.Add((a.Id, a.EntityId.Value));
            }
        }

        if (lookups.Count > 0)
        {
            foreach (var (table, rows) in lookups)
            {
                try
                {
                    string? sql = null;
                    if (_employeeTables.Contains(table))
                        sql = $"select id as \"Id\", employee_id as \"EmployeeId\" from hrms.\"{table}\" where id = any({{0}})";
                    else if (table == "payroll_detail")
                        sql = "select d.id as \"Id\", p.employee_id as \"EmployeeId\" from hrms.payroll_detail d join hrms.payroll p on p.id = d.payroll_id where d.id = any({0})";
                    if (sql == null) continue;

                    var ids = rows.Select(r => r.RowId).Distinct().ToArray();
                    var owners = await _dbContext.Database
                        .SqlQueryRaw<AuditRowOwner>(sql, new object[] { ids })
                        .ToListAsync(cancellationToken);
                    var map = owners.Where(o => o.EmployeeId.HasValue).ToDictionary(o => o.Id, o => o.EmployeeId!.Value);
                    foreach (var (logId, rowId) in rows)
                        if (map.TryGetValue(rowId, out var empId)) logToEmployee[logId] = empId;
                }
                catch
                {
                    // ข้ามตารางที่ค้นไม่ได้
                }
            }
        }

        if (logToEmployee.Count == 0) return result;

        var empIds = logToEmployee.Values.Distinct().ToList();
        var employees = await _dbContext.Employees.AsNoTracking()
            .Where(e => empIds.Contains(e.Id))
            .Select(e => new { e.Id, e.EmployeeCode, e.FirstName, e.LastName })
            .ToDictionaryAsync(e => e.Id, cancellationToken);

        foreach (var (logId, empId) in logToEmployee)
            if (employees.TryGetValue(empId, out var e))
                result[logId] = (e.Id, e.EmployeeCode, $"{e.FirstName} {e.LastName}".Trim());
        return result;
    }

    private static long? ReadEmployeeId(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || !json.TrimStart().StartsWith("{")) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (!string.Equals(prop.Name, "EmployeeId", StringComparison.OrdinalIgnoreCase)) continue;
                if (prop.Value.ValueKind == JsonValueKind.Number && prop.Value.TryGetInt64(out var v)) return v;
                if (prop.Value.ValueKind == JsonValueKind.String && long.TryParse(prop.Value.GetString(), out var sv)) return sv;
            }
        }
        catch (JsonException)
        {
        }
        return null;
    }

    private static string? EnsureJson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if ((trimmed.StartsWith("{") && trimmed.EndsWith("}")) ||
            (trimmed.StartsWith("[") && trimmed.EndsWith("]")) ||
            (trimmed.StartsWith("\"") && trimmed.EndsWith("\"")))
        {
            return trimmed;
        }
        return JsonSerializer.Serialize(value);
    }

    private static string? CleanJsonDisplay(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.StartsWith("\"") && trimmed.EndsWith("\"") && trimmed.Length >= 2)
        {
            return trimmed[1..^1];
        }
        return trimmed;
    }

    private static string FormatDescription(string action, string entityType, long? entityId, string? field, string? metadata)
    {
        var thaiEntity = TranslateEntityType(entityType);
        var idStr = entityId.HasValue ? $" #{entityId}" : "";

        // 1. รองรับข้อมูลงานกลุ่มจาก Metadata JSONB รูปแบบใหม่
        if (!string.IsNullOrWhiteSpace(metadata) && metadata.TrimStart().StartsWith("{"))
        {
            try
            {
                using var doc = JsonDocument.Parse(metadata);
                var root = doc.RootElement;
                if (root.TryGetProperty("bulk", out var bulkEl) && bulkEl.ValueKind == JsonValueKind.True)
                {
                    int ins = root.TryGetProperty("inserted", out var iEl) ? iEl.GetInt32() : 0;
                    int upd = root.TryGetProperty("updated", out var uEl) ? uEl.GetInt32() : 0;
                    int del = root.TryGetProperty("deleted", out var dEl) ? dEl.GetInt32() : 0;
                    var segs = new List<string>();
                    if (ins > 0) segs.Add($"เพิ่ม {ins:N0}");
                    if (upd > 0) segs.Add($"แก้ไข {upd:N0}");
                    if (del > 0) segs.Add($"ลบ {del:N0}");
                    return $"เปลี่ยนแปลง{thaiEntity}แบบกลุ่ม {ins + upd + del:N0} รายการ ({string.Join(" · ", segs)})";
                }

                if (action is "VIEW" or "DOWNLOAD" or "EXPORT")
                {
                    var label = root.TryGetProperty("label", out var lEl) && lEl.ValueKind == JsonValueKind.String
                        ? lEl.GetString()
                        : null;
                    var exportedRows = root.TryGetProperty("exportedRows", out var rEl) && rEl.ValueKind == JsonValueKind.Number
                        ? rEl.GetInt32()
                        : (int?)null;
                    var fileName = root.TryGetProperty("fileName", out var fEl) && fEl.ValueKind == JsonValueKind.String
                        ? fEl.GetString()
                        : null;

                    var baseText = !string.IsNullOrWhiteSpace(label)
                        ? $"{label}{idStr}"
                        : (action == "VIEW" ? $"เปิดดู{thaiEntity}{idStr}"
                            : action == "DOWNLOAD" ? $"ดาวน์โหลด{thaiEntity}{idStr}"
                            : $"ส่งออกข้อมูล {thaiEntity}");

                    if (exportedRows.HasValue)
                        baseText += $" ({exportedRows.Value:N0} แถว)";
                    else if (!string.IsNullOrWhiteSpace(fileName))
                        baseText += $" ({fileName})";

                    return baseText;
                }
            }
            catch { /* fallback below */ }
        }

        // 2. รองรับแถวเก่า: FieldName = "BULK|เพิ่ม|แก้ไข|ลบ"
        if (field != null && field.StartsWith("BULK|", StringComparison.Ordinal))
        {
            var parts = field.Split('|');
            int.TryParse(parts.ElementAtOrDefault(1), out var ins);
            int.TryParse(parts.ElementAtOrDefault(2), out var upd);
            int.TryParse(parts.ElementAtOrDefault(3), out var del);
            var segs = new List<string>();
            if (ins > 0) segs.Add($"เพิ่ม {ins:N0}");
            if (upd > 0) segs.Add($"แก้ไข {upd:N0}");
            if (del > 0) segs.Add($"ลบ {del:N0}");
            return $"เปลี่ยนแปลง{thaiEntity}แบบกลุ่ม {ins + upd + del:N0} รายการ ({string.Join(" · ", segs)})";
        }

        return action switch
        {
            "LOGIN" => "เข้าสู่ระบบสำเร็จ",
            "LOGIN_FAILED" => !string.IsNullOrWhiteSpace(field) ? field : "เข้าสู่ระบบไม่สำเร็จ",
            "LOGOUT" => "ออกจากระบบ",
            "VIEW" => $"เปิดดู{thaiEntity}{idStr}",
            "DOWNLOAD" => $"ดาวน์โหลด{thaiEntity}{idStr}",
            "INSERT" => $"สร้าง{thaiEntity}ใหม่{idStr}",
            "UPDATE" => $"แก้ไข{thaiEntity}{idStr}" + (!string.IsNullOrEmpty(field) ? $" (ฟิลด์ {field})" : ""),
            "DELETE" => $"ลบ{thaiEntity}{idStr}",
            "APPROVE" => $"อนุมัติรายการ {thaiEntity}{idStr}",
            "REJECT" => $"ปฏิเสธรายการ {thaiEntity}{idStr}",
            "EXPORT" => $"ส่งออกข้อมูล {thaiEntity}",
            "CLEANUP" => $"จัดการข้อมูลเก่าตามนโยบายเก็บรักษา ({thaiEntity})",
            _ => $"{action} {thaiEntity}{idStr}"
        };
    }

    private static string TranslateEntityType(string entityType)
    {
        return entityType.ToLowerInvariant() switch
        {
            "employee" => "ข้อมูลพนักงาน",
            "employee_signature" => "ลายเซ็นอิเล็กทรอนิกส์",
            "user_account" or "useraccount" => "บัญชีผู้ใช้งาน",
            "role" => "บทบาทและสิทธิ์",
            "role_permissions" or "role_permission" or "rolepermission" => "สิทธิ์ของบทบาท",
            "role_data_scope" or "roledatascope" => "ขอบเขตข้อมูลของบทบาท",
            "payslip" or "my_payslip" => "สลิปเงินเดือน",
            "bank_transfer_file" => "ไฟล์โอนเงินธนาคาร",
            "payroll_period_cleanup" => "ข้อมูลประกอบรอบเงินเดือน",
            "approval_flow" or "approvalflow" => "สายการอนุมัติ",
            "approval_instance" or "approvalinstance" => "รายการอนุมัติ",
            "leave_request" or "leaverequest" => "คำร้องขอลา",
            "leave_balance" or "leavebalance" => "ยอดวันลาคงเหลือ",
            "attendance_daily" or "attendancedaily" => "ข้อมูลเวลาทำงาน",
            "announcement" => "ประกาศองค์กร",
            "notification" => "การแจ้งเตือน",
            "certificate_request" or "certificaterequest" => "คำขอหนังสือรับรอง",
            "resignation_request" or "resignationrequest" => "คำขอลาออก",
            "general_request" => "คำร้องทั่วไป",
            "employee_transfer" => "คำสั่งโอนย้าย/ปรับตำแหน่ง",
            "employment_contract" or "employmentcontract" => "สัญญาจ้างงาน",
            "salary_structure" or "salarystructure" => "โครงสร้างเงินเดือน",
            "department" => "แผนก",
            "division" => "ฝ่าย",
            "position" => "ตำแหน่ง",
            "company" => "บริษัท",
            "employee_bonus" => "โบนัสพนักงาน",
            "employee_salary" => "ฐานเงินเดือน",
            "employee_document" => "เอกสารพนักงาน",
            "employee_bank_account" => "บัญชีธนาคารพนักงาน",
            "employee_benefit_claim" or "benefit_claim" => "คำขอเบิกสวัสดิการ",
            "employee_commission" => "ค่าคอมมิชชั่น",
            "payroll" => "เงินเดือนพนักงาน",
            "payroll_detail" => "รายการในสลิปเงินเดือน",
            "payroll_period" => "รอบเงินเดือน",
            "payroll_item" => "รายการรายได้/รายหัก",
            "benefit_item" => "สวัสดิการ",
            "auth" => "ระบบการยืนยันตัวตน",
            "audit_log" or "audit-logs" => "บันทึกการใช้งานระบบ",
            "reports" => "รายงานวิเคราะห์",
            _ => entityType
        };
    }

    private static string EscapeCsv(string? val)
    {
        if (string.IsNullOrEmpty(val)) return "";
        return val.Replace("\"", "\"\"").Replace("\r", "").Replace("\n", " ");
    }
}
