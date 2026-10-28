using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Settings.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IHrmsDbContext _dbContext;

    public AuditLogService(IHrmsDbContext dbContext)
    {
        _dbContext = dbContext;
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
        CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Action = action.ToUpperInvariant(),
            EntityType = entityType.ToUpperInvariant(),
            EntityId = entityId,
            FieldName = fieldName,
            OldValue = EnsureJson(oldValue),
            NewValue = EnsureJson(newValue),
            UserId = userId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.AuditLogs.Add(log);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
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
            baseQuery = baseQuery.Where(a => a.Action == filter.Action.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityType) && filter.EntityType != "ทั้งหมด")
        {
            baseQuery = baseQuery.Where(a => a.EntityType == filter.EntityType.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(a =>
                (a.User != null && a.User.Username.ToLower().Contains(s)) ||
                (a.User != null && a.User.Employee != null && (a.User.Employee.FirstName.ToLower().Contains(s) || a.User.Employee.LastName.ToLower().Contains(s))) ||
                (a.FieldName != null && a.FieldName.ToLower().Contains(s)) ||
                (a.IpAddress != null && a.IpAddress.ToLower().Contains(s)) ||
                a.EntityType.ToLower().Contains(s) ||
                (a.EntityId != null && a.EntityId.ToString()!.Contains(s)));
        }

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

        var subjects = await ResolveSubjectEmployeesAsync(entities, cancellationToken);

        var items = entities.Select(a => new AuditLogDto
        {
            Id = a.Id,
            UserId = a.UserId,
            Username = a.User != null ? a.User.Username : "SYSTEM",
            FullName = a.User != null && a.User.Employee != null
                ? $"{a.User.Employee.FirstName} {a.User.Employee.LastName}"
                : (a.User != null ? a.User.Username : "ระบบ"),
            Action = a.Action,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            FieldName = a.FieldName,
            OldValue = CleanJsonDisplay(a.OldValue),
            NewValue = CleanJsonDisplay(a.NewValue),
            IpAddress = a.IpAddress,
            Description = FormatDescription(a.Action, a.EntityType, a.EntityId, a.FieldName)
                + (subjects.TryGetValue(a.Id, out var sub) ? $" ของ {sub.Name}" : string.Empty),
            CreatedAt = a.CreatedAt,
            SubjectEmployeeId = subjects.TryGetValue(a.Id, out var sub2) ? sub2.Id : null,
            SubjectEmployeeCode = subjects.TryGetValue(a.Id, out var sub3) ? sub3.Code : null,
            SubjectEmployeeName = subjects.TryGetValue(a.Id, out var sub4) ? sub4.Name : null,
        }).ToList();

        return new PagedResult<AuditLogDto>(items, totalCount, page, pageSize);
    }

    public async Task<byte[]> ExportLogsCsvAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
    {
        // Limit export to max 5,000 rows
        filter.Page = 1;
        filter.PageSize = 5000;
        var pagedResult = await GetLogsAsync(filter, cancellationToken);

        var sb = new StringBuilder();
        // UTF-8 BOM for Thai Excel support
        sb.AppendLine("ID,วันเวลา,ผู้ใช้งาน,ชื่อ-นามสกุล,การกระทำ,ประเภทข้อมูล,รหัสข้อมูล,ฟิลด์ที่แก้ไข,ค่าเดิม,ค่าใหม่,IP Address");

        foreach (var item in pagedResult.Items)
        {
            var dateStr = item.CreatedAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
            var oldVal = EscapeCsv(item.OldValue);
            var newVal = EscapeCsv(item.NewValue);
            var user = EscapeCsv(item.Username);
            var name = EscapeCsv(item.FullName);
            var field = EscapeCsv(item.FieldName);
            var ip = EscapeCsv(item.IpAddress);

            sb.AppendLine($"{item.Id},\"{dateStr}\",\"{user}\",\"{name}\",\"{item.Action}\",\"{item.EntityType}\",\"{item.EntityId}\",\"{field}\",\"{oldVal}\",\"{newVal}\",\"{ip}\"");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var content = Encoding.UTF8.GetBytes(sb.ToString());
        var finalBytes = new byte[preamble.Length + content.Length];
        Buffer.BlockCopy(preamble, 0, finalBytes, 0, preamble.Length);
        Buffer.BlockCopy(content, 0, finalBytes, preamble.Length, content.Length);

        return finalBytes;
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

    /// <summary>ตารางในสคีมา hrms ที่มีคอลัมน์ employee_id (ใช้เป็น whitelist ตอนค้นเจ้าของข้อมูล)</summary>
    private static readonly HashSet<string> _employeeTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "employee", "employee_assignment", "employment_contract", "employee_bank_account",
        "employee_contact", "employee_address", "employee_education", "employee_work_experience",
        "employee_social_security", "employee_tax_deduction", "employee_document", "employee_avatar",
        "employee_change_history", "employee_transfer", "leave_balance", "leave_request",
        "attendance_record", "attendance_daily_log", "attendance_adjustment", "payroll",
        "benefit_claim", "resignation_request", "certificate_request", "general_request",
        "notification", "user_account"
    };
    /// <summary>
    /// หาเจ้าของข้อมูล (พนักงาน) ของแต่ละ log: ตาราง employee ใช้รหัสข้อมูล, ค่าใน log ที่มี EmployeeId,
    /// หรือค้น employee_id จากแถวจริง (กรณีแก้ไขที่ log เก็บแค่ฟิลด์ที่เปลี่ยน)
    /// </summary>
    private async Task<Dictionary<long, (long Id, string Code, string Name)>> ResolveSubjectEmployeesAsync(
        List<AuditLog> logs, CancellationToken cancellationToken)
    {
        var result = new Dictionary<long, (long, string, string)>();
        var logToEmployee = new Dictionary<long, long>();
        var lookups = new Dictionary<string, List<(long LogId, long RowId)>>();

        foreach (var a in logs)
        {
            var table = a.EntityType.ToLowerInvariant();
            if (a.Action is "LOGIN" or "LOGOUT") continue;
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
            try
            {
                foreach (var (table, rows) in lookups)
                try
                {
                    string? sql = null;
                    // ชื่อตารางมาจาก information_schema เท่านั้น (ไม่รับจากผู้ใช้)
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
                    // ตารางนี้ค้นไม่ได้ (เช่น ไม่มีคอลัมน์ id) — ข้ามไป
                }
            }
            catch
            {
                // ค้นเจ้าของข้อมูลไม่ได้ (เช่น ตารางไม่มีคอลัมน์ id) — แสดง log ตามปกติ
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
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (!string.Equals(prop.Name, "EmployeeId", StringComparison.OrdinalIgnoreCase)) continue;
                if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.Number && prop.Value.TryGetInt64(out var v)) return v;
                if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.String && long.TryParse(prop.Value.GetString(), out var sv)) return sv;
            }
        }
        catch (System.Text.Json.JsonException)
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
        return System.Text.Json.JsonSerializer.Serialize(value);
    }

    private static string? CleanJsonDisplay(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.StartsWith("\"") && trimmed.EndsWith("\"") && trimmed.Length >= 2)
        {
            return trimmed.Substring(1, trimmed.Length - 2);
        }
        return trimmed;
    }

    private static string FormatDescription(string action, string entityType, long? entityId, string? field)
    {
        var thaiEntity = TranslateEntityType(entityType);
        var idStr = entityId.HasValue ? $" #{entityId}" : "";

        return action switch
        {
            "LOGIN" => "เข้าสู่ระบบสำเร็จ",
            "LOGOUT" => "ออกจากระบบ",
            "INSERT" => $"สร้าง{thaiEntity}ใหม่{idStr}",
            "UPDATE" => $"แก้ไข{thaiEntity}{idStr}" + (!string.IsNullOrEmpty(field) ? $" (ฟิลด์ {field})" : ""),
            "DELETE" => $"ลบ{thaiEntity}{idStr}",
            "APPROVE" => $"อนุมัติรายการ {thaiEntity}{idStr}",
            "REJECT" => $"ปฏิเสธรายการ {thaiEntity}{idStr}",
            "EXPORT" => $"ส่งออกข้อมูล {thaiEntity}",
            _ => $"{action} {thaiEntity}{idStr}"
        };
    }

    private static string TranslateEntityType(string entityType)
    {
        return entityType.ToLowerInvariant() switch
        {
            "employee" => "ข้อมูลพนักงาน",
            "user_account" or "useraccount" => "บัญชีผู้ใช้งาน",
            "role" => "บทบาทและสิทธิ์",
            "approval_flow" or "approvalflow" => "สายการอนุมัติ",
            "approval_instance" or "approvalinstance" => "รายการอนุมัติ",
            "leave_request" or "leaverequest" => "คำร้องขอลา",
            "leave_balance" or "leavebalance" => "ยอดวันลาคงเหลือ",
            "attendance_daily" or "attendancedaily" => "ข้อมูลเวลาทำงาน",
            "announcement" => "ประกาศองค์กร",
            "notification" => "การแจ้งเตือน",
            "certificate_request" or "certificaterequest" => "คำขอหนังสือรับรอง",
            "resignation_request" or "resignationrequest" => "คำขอลาออก",
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
            "employee_benefit_claim" => "คำขอเบิกสวัสดิการ",
            "employee_commission" => "ค่าคอมมิชชั่น",
            "payroll" => "เงินเดือนพนักงาน",
            "payroll_detail" => "รายการในสลิปเงินเดือน",
            "payroll_period" => "รอบเงินเดือน",
            "payroll_item" => "รายการรายได้/รายหัก",
            "benefit_item" => "สวัสดิการ",
            "auth" => "ระบบการยืนยันตัวตน",
            "audit_log" or "audit-logs" => "บันทึกการใช้งานระบบ",
            _ => entityType
        };
    }

    private static string EscapeCsv(string? val)
    {
        if (string.IsNullOrEmpty(val)) return "";
        return val.Replace("\"", "\"\"").Replace("\r", "").Replace("\n", " ");
    }
}
