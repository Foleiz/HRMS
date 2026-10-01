using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.Services;

public class EmployeeFieldChange
{
    public string Field { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}

public class EmployeeChangeHistoryEntry
{
    public DateTime At { get; set; }
    public string? ChangedBy { get; set; }
    /// <summary>หมวด เช่น ข้อมูลส่วนตัว / ที่อยู่ / ครอบครัว</summary>
    public string Category { get; set; } = string.Empty;
    public string CategoryKey { get; set; } = string.Empty;
    /// <summary>UPDATE / INSERT / DELETE / REPLACE (แทนที่ทั้งชุด)</summary>
    public string Action { get; set; } = string.Empty;
    public List<EmployeeFieldChange> Changes { get; set; } = new();
}

public interface IEmployeeChangeHistoryService
{
    Task<List<EmployeeChangeHistoryEntry>> GetAsync(long employeeId, int limit = 300, CancellationToken cancellationToken = default);
}

/// <summary>
/// ประวัติการเปลี่ยนแปลงข้อมูลพนักงาน (อ่านจาก hrms.audit_log ที่ระบบบันทึกทุกครั้งที่แก้ข้อมูล)
/// ปิดบังข้อมูลอ่อนไหว (เลขบัตร/เลขบัญชี/เลขประกันสังคม) และรวมการ "ลบ+เพิ่มใหม่ทั้งชุด" ให้เป็นรายการเดียว
/// </summary>
public class EmployeeChangeHistoryService : IEmployeeChangeHistoryService
{
    private static readonly Dictionary<string, (string Key, string Label)> Tables = new()
    {
        ["employee"] = ("personal", "ข้อมูลส่วนตัว"),
        ["employee_contact"] = ("contact", "ข้อมูลติดต่อ"),
        ["employee_address"] = ("address", "ที่อยู่"),
        ["employee_bank_account"] = ("bank", "บัญชีธนาคาร"),
        ["employee_social_security"] = ("tax", "ประกันสังคม"),
        ["employee_education"] = ("education", "ประวัติการศึกษา"),
        ["employee_work_experience"] = ("work", "ประวัติการทำงาน"),
        ["family_member"] = ("family", "ครอบครัว"),
        ["emergency_contact"] = ("emergency", "ผู้ติดต่อกรณีฉุกเฉิน"),
        ["employee_assignment"] = ("position", "ตำแหน่งงาน"),
        ["employee_document"] = ("document", "แฟ้มเอกสาร"),
    };

    private static readonly HashSet<string> IgnoredFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "Id", "EmployeeId", "CreatedAt", "UpdatedAt", "AvatarUpdatedAt", "CitizenId", "CitizenIdEncrypted",
        "SocialSecurityNo", "SocialSecurityNoEncrypted", "FileData", "ExpiryWarningNotifiedAt", "ExpiredNotifiedAt"
    };

    private static readonly Dictionary<string, string> FieldLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["EmployeeCode"] = "รหัสพนักงาน", ["BiometricId"] = "รหัสเครื่องสแกน", ["EmploymentStatus"] = "สถานะการจ้าง",
        ["Prefix"] = "คำนำหน้า", ["FirstName"] = "ชื่อ", ["LastName"] = "นามสกุล", ["CitizenIdMasked"] = "เลขบัตรประชาชน",
        ["BirthDate"] = "วันเกิด", ["Gender"] = "เพศ", ["GenderId"] = "เพศ (รหัส)", ["Nationality"] = "สัญชาติ", ["NationalityId"] = "สัญชาติ (รหัส)",
        ["Religion"] = "ศาสนา", ["ReligionId"] = "ศาสนา (รหัส)", ["MaritalStatus"] = "สถานภาพสมรส", ["MaritalStatusId"] = "สถานภาพสมรส (รหัส)",
        ["MilitaryStatus"] = "สถานภาพทางทหาร", ["IsTopLevel"] = "ผู้บริหารสูงสุด", ["SpouseHasIncome"] = "คู่สมรสมีเงินได้",
        ["NumberOfChildren"] = "จำนวนบุตร", ["ParentDeductionCount"] = "บิดามารดาที่ลดหย่อน", ["DisabilityDeductionCount"] = "ผู้พิการที่ลดหย่อน",
        ["PersonalPhone"] = "เบอร์โทรศัพท์", ["PersonalEmail"] = "อีเมล", ["OrganizationEmail"] = "อีเมลองค์กร",
        ["AddressType"] = "ประเภทที่อยู่", ["AddressLine"] = "บ้านเลขที่/ถนน", ["SubDistrict"] = "ตำบล/แขวง", ["District"] = "อำเภอ/เขต",
        ["Province"] = "จังหวัด", ["PostalCode"] = "รหัสไปรษณีย์", ["IsCurrent"] = "ที่อยู่ปัจจุบัน",
        ["BankId"] = "ธนาคาร (รหัส)", ["AccountNumber"] = "เลขบัญชี", ["AccountType"] = "ประเภทบัญชี", ["AccountName"] = "ชื่อบัญชี",
        ["IsPrimary"] = "รายการหลัก", ["Status"] = "สถานะ", ["SocialSecurityNoMasked"] = "เลขประกันสังคม",
        ["HospitalName"] = "โรงพยาบาล", ["HospitalCode"] = "รหัสโรงพยาบาล",
        ["EducationLevel"] = "ระดับการศึกษา", ["Institution"] = "สถาบัน", ["Major"] = "สาขา", ["GraduationYear"] = "ปีที่จบ", ["Gpa"] = "เกรดเฉลี่ย",
        ["CompanyName"] = "บริษัท", ["PositionName"] = "ตำแหน่ง", ["StartDate"] = "วันเริ่มงาน", ["EndDate"] = "วันที่ออก",
        ["LastSalary"] = "เงินเดือนล่าสุด", ["LeavingReason"] = "เหตุผลที่ออก", ["JobDescription"] = "หน้าที่รับผิดชอบ",
        ["RelationshipType"] = "ความสัมพันธ์", ["Relationship"] = "ความสัมพันธ์", ["EducationStatus"] = "สถานะการศึกษา",
        ["PrimaryPhone"] = "เบอร์โทร", ["SecondaryPhone"] = "เบอร์โทรสำรอง", ["Address"] = "ที่อยู่",
        ["DivisionId"] = "ฝ่าย (รหัส)", ["DepartmentId"] = "แผนก (รหัส)", ["PositionId"] = "ตำแหน่ง (รหัส)", ["EmployeeLevelId"] = "ระดับ (รหัส)",
        ["ManagerEmployeeId"] = "หัวหน้างาน (รหัสพนักงาน)", ["EffectiveFrom"] = "มีผลตั้งแต่", ["EffectiveTo"] = "สิ้นสุด", ["WageType"] = "ประเภทค่าจ้าง",
        ["DocumentTypeId"] = "ประเภทเอกสาร (รหัส)", ["FileName"] = "ไฟล์", ["IssuedDate"] = "วันที่ออกเอกสาร", ["ExpiryDate"] = "วันหมดอายุ", ["Remarks"] = "หมายเหตุ",
    };

    // ช่องที่ใช้สรุปรายการ (ตอนเพิ่ม/ลบทั้งแถว)
    private static readonly Dictionary<string, string[]> SummaryFields = new()
    {
        ["employee_education"] = new[] { "EducationLevel", "Institution", "Major", "GraduationYear" },
        ["employee_work_experience"] = new[] { "CompanyName", "PositionName", "StartDate", "EndDate" },
        ["family_member"] = new[] { "RelationshipType", "Prefix", "FirstName", "LastName" },
        ["emergency_contact"] = new[] { "Relationship", "FirstName", "LastName", "PrimaryPhone" },
        ["employee_address"] = new[] { "AddressLine", "SubDistrict", "District", "Province", "PostalCode" },
        ["employee_bank_account"] = new[] { "AccountNumber", "AccountName" },
        ["employee_contact"] = new[] { "PersonalPhone", "PersonalEmail", "OrganizationEmail" },
        ["employee_assignment"] = new[] { "PositionId", "DepartmentId", "EffectiveFrom" },
        ["employee_document"] = new[] { "FileName", "ExpiryDate" },
        ["employee_social_security"] = new[] { "SocialSecurityNoMasked", "HospitalName" },
    };

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IDataScopeService _dataScope;

    public EmployeeChangeHistoryService(IHrmsDbContext context, ICurrentUserService currentUser, IDataScopeService dataScope)
    {
        _context = context;
        _currentUser = currentUser;
        _dataScope = dataScope;
    }

    public async Task<List<EmployeeChangeHistoryEntry>> GetAsync(long employeeId, int limit = 300, CancellationToken cancellationToken = default)
    {
        bool isSelf = _currentUser.EmployeeId.HasValue && _currentUser.EmployeeId.Value == employeeId;
        bool isSuper = _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER");
        bool hasPerm = _currentUser.HasPermission("EMP_HISTORY_VIEW") || _currentUser.HasPermission("EMP_PROFILE_VIEW");

        if (!isSelf && !isSuper && !hasPerm)
            throw new ForbiddenException("คุณไม่มีสิทธิ์ดูประวัติการเปลี่ยนแปลงข้อมูลพนักงาน");

        if (!isSelf && !isSuper)
        {
            var canAccess = await _dataScope.CanAccessEmployeeAsync(employeeId, "EMP_HISTORY_VIEW", cancellationToken)
                || await _dataScope.CanAccessEmployeeAsync(employeeId, "EMP_PROFILE_VIEW", cancellationToken);
            if (!canAccess)
                throw new ForbiddenException("คุณไม่มีสิทธิ์เข้าถึงข้อมูลพนักงานท่านนี้");
        }
        limit = Math.Clamp(limit, 1, 1000);

        // รหัสแถวปัจจุบันของตารางย่อย (แถวที่ถูกลบไปแล้วจะหาเจอจากค่า EmployeeId ใน old_value)
        var childIds = new Dictionary<string, List<long>>
        {
            ["employee_contact"] = await _context.EmployeeContacts.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_address"] = await _context.EmployeeAddresses.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_bank_account"] = await _context.EmployeeBankAccounts.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_social_security"] = await _context.EmployeeSocialSecurities.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_education"] = await _context.EmployeeEducations.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_work_experience"] = await _context.EmployeeWorkExperiences.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["family_member"] = await _context.FamilyMembers.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["emergency_contact"] = await _context.EmergencyContacts.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_assignment"] = await _context.EmployeeAssignments.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
            ["employee_document"] = await _context.EmployeeDocuments.Where(x => x.EmployeeId == employeeId).Select(x => x.Id).ToListAsync(cancellationToken),
        };
        var allChildIds = childIds.Values.SelectMany(v => v).Distinct().ToList();
        var childTables = childIds.Keys.ToList();
        var idText = employeeId.ToString();

        var logs = await _context.AuditLogs.AsNoTracking()
            .Where(a =>
                (a.EntityType == "employee" && a.EntityId == employeeId)
                || (childTables.Contains(a.EntityType)
                    && ((a.EntityId != null && allChildIds.Contains(a.EntityId.Value)) || a.Action == "INSERT" || a.Action == "DELETE")))
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit * 6)
            .Select(a => new { a.Id, a.UserId, a.Action, a.EntityType, a.EntityId, a.OldValue, a.NewValue, a.CreatedAt })
            .ToListAsync(cancellationToken);

        // กรองแถวตารางย่อยที่เป็นของพนักงานคนนี้จริง
        var rows = new List<(long Id, long? UserId, string Action, string Table, DateTime At, Dictionary<string, JsonElement> Old, Dictionary<string, JsonElement> New)>();
        foreach (var l in logs)
        {
            var oldValues = ParseJson(l.OldValue);
            var newValues = ParseJson(l.NewValue);
            if (l.EntityType != "employee")
            {
                var belongs = (l.EntityId.HasValue && childIds.TryGetValue(l.EntityType, out var ids) && ids.Contains(l.EntityId.Value))
                              || MatchesEmployee(oldValues, idText) || MatchesEmployee(newValues, idText);
                if (!belongs) continue;
            }
            rows.Add((l.Id, l.UserId, l.Action, l.EntityType, l.CreatedAt, oldValues, newValues));
        }

        var userIds = rows.Where(r => r.UserId.HasValue).Select(r => r.UserId!.Value).Distinct().ToList();
        var users = await _context.UserAccounts.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.Employee.Prefix, u.Employee.FirstName, u.Employee.LastName })
            .ToListAsync(cancellationToken);
        var userName = users.ToDictionary(u => u.Id, u => $"{u.Prefix} {u.FirstName} {u.LastName}".Trim() is { Length: > 0 } n ? n : u.Username);

        var result = new List<EmployeeChangeHistoryEntry>();

        // รวมรายการที่บันทึกพร้อมกัน (ตาราง/ผู้แก้/เวลาใกล้กันไม่เกิน 5 วินาที) — กรณี "ลบแล้วเพิ่มใหม่ทั้งชุด"
        var groups = new List<List<(long Id, long? UserId, string Action, string Table, DateTime At, Dictionary<string, JsonElement> Old, Dictionary<string, JsonElement> New)>>();
        foreach (var r in rows.OrderByDescending(r => r.At))
        {
            var g = groups.LastOrDefault();
            if (g != null && r.Action != "UPDATE" && g[0].Action != "UPDATE" && g[0].Table == r.Table && g[0].UserId == r.UserId
                && Math.Abs((g[0].At - r.At).TotalSeconds) <= 5)
            {
                g.Add(r);
            }
            else
            {
                groups.Add(new() { r });
            }
        }

        foreach (var g in groups)
        {
            var first = g[0];
            var (catKey, catLabel) = Tables.TryGetValue(first.Table, out var t) ? t : (first.Table, first.Table);
            var entry = new EmployeeChangeHistoryEntry
            {
                At = DateTime.SpecifyKind(first.At, DateTimeKind.Utc),
                ChangedBy = first.UserId.HasValue && userName.TryGetValue(first.UserId.Value, out var n) ? n : "ระบบ",
                Category = catLabel,
                CategoryKey = catKey,
                Action = first.Action
            };

            if (first.Action == "UPDATE" && g.Count == 1)
            {
                foreach (var key in first.New.Keys.Union(first.Old.Keys))
                {
                    if (IgnoredFields.Contains(key)) continue;
                    var oldV = Format(key, first.Old.TryGetValue(key, out var ov) ? (JsonElement?)ov : null);
                    var newV = Format(key, first.New.TryGetValue(key, out var nv) ? (JsonElement?)nv : null);
                    if (oldV == newV) continue;
                    entry.Changes.Add(new EmployeeFieldChange { Field = Label(key), OldValue = oldV, NewValue = newV });
                }
            }
            else
            {
                var removed = g.Where(x => x.Action == "DELETE").Select(x => Summary(x.Table, x.Old)).Where(s => s.Length > 0).ToList();
                var added = g.Where(x => x.Action == "INSERT").Select(x => Summary(x.Table, x.New)).Where(s => s.Length > 0).ToList();
                // ลบแล้วเพิ่มเหมือนเดิมทุกประการ = ไม่มีการเปลี่ยนแปลงจริง
                if (removed.OrderBy(s => s).SequenceEqual(added.OrderBy(s => s))) continue;

                entry.Action = removed.Count > 0 && added.Count > 0 ? "REPLACE" : added.Count > 0 ? "INSERT" : "DELETE";
                var removedOnly = removed.Except(added).ToList();
                var addedOnly = added.Except(removed).ToList();
                entry.Changes.Add(new EmployeeFieldChange
                {
                    Field = entry.Action switch { "INSERT" => "เพิ่มรายการ", "DELETE" => "ลบรายการ", _ => "ปรับรายการ" },
                    OldValue = removedOnly.Count > 0 ? string.Join("\n", removedOnly) : null,
                    NewValue = addedOnly.Count > 0 ? string.Join("\n", addedOnly) : null
                });
            }

            if (entry.Changes.Count > 0) result.Add(entry);
            if (result.Count >= limit) break;
        }

        return result;
    }

    private static Dictionary<string, JsonElement> ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return new();
            return doc.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone(), StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return new();
        }
    }

    private static bool MatchesEmployee(Dictionary<string, JsonElement> values, string employeeId) =>
        values.TryGetValue("EmployeeId", out var v) && (v.ValueKind == JsonValueKind.Number ? v.GetRawText() : v.ToString()) == employeeId;

    private static string Label(string key) => FieldLabels.TryGetValue(key, out var l) ? l : key;

    private static string? Format(string key, JsonElement? value)
    {
        if (value is not { } v || v.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
        var text = v.ValueKind switch
        {
            JsonValueKind.True => "ใช่",
            JsonValueKind.False => "ไม่ใช่",
            JsonValueKind.String => v.GetString(),
            _ => v.GetRawText()
        };
        if (string.IsNullOrEmpty(text)) return null;
        if (key.Equals("AccountNumber", StringComparison.OrdinalIgnoreCase))
            return text.Length > 4 ? new string('x', text.Length - 4) + text[^4..] : "xxxx";
        if (text.StartsWith("<ไบนารี")) return "(ข้อมูลไฟล์)";
        // วันที่แบบ ISO → ตัดเวลาทิ้งถ้าเป็นเที่ยงคืน
        if (text.Length >= 10 && text.EndsWith("T00:00:00.000Z")) return text[..10];
        return text;
    }

    private static string Summary(string table, Dictionary<string, JsonElement> values)
    {
        var fields = SummaryFields.TryGetValue(table, out var f) ? f : values.Keys.Where(k => !IgnoredFields.Contains(k)).Take(3).ToArray();
        return string.Join(" · ", fields.Select(k => Format(k, values.TryGetValue(k, out var v) ? (JsonElement?)v : null)).Where(s => !string.IsNullOrWhiteSpace(s)));
    }
}
