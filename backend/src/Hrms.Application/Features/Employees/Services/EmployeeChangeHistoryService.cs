using System.Runtime.CompilerServices;
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
    /// <summary>UPDATE / INSERT / DELETE / REPLACE (แทนที่ทั้งชุด) / MOVE (เปลี่ยนตำแหน่ง/สังกัด)</summary>
    public string Action { get; set; } = string.Empty;
    /// <summary>ประโยคสรุปให้อ่านเข้าใจทันที เช่น "เปลี่ยนตำแหน่งเป็น นักบัญชี (แผนกบัญชี) มีผล 25 ก.ย. 2569"</summary>
    public string Summary { get; set; } = string.Empty;
    public List<EmployeeFieldChange> Changes { get; set; } = new();
}

public interface IEmployeeChangeHistoryService
{
    Task<List<EmployeeChangeHistoryEntry>> GetAsync(long employeeId, int limit = 300, CancellationToken cancellationToken = default);
}

/// <summary>
/// ประวัติการเปลี่ยนแปลงข้อมูลพนักงาน (อ่านจาก hrms.audit_log ที่ระบบบันทึกทุกครั้งที่แก้ข้อมูล)
/// แปลงให้อ่านเข้าใจทันที: ชื่อช่องภาษาไทย, รหัสอ้างอิง → ชื่อ (ตำแหน่ง/แผนก/ธนาคาร ฯลฯ), วันที่แบบไทย, ประโยคสรุปทุกรายการ
/// ปิดบังข้อมูลอ่อนไหว และรวม "ลบ+เพิ่มใหม่ทั้งชุด" / "สิ้นสุดตำแหน่งเดิม+เพิ่มตำแหน่งใหม่" ให้เป็นรายการเดียว
/// </summary>
public class EmployeeChangeHistoryService : IEmployeeChangeHistoryService
{
    private static readonly string[] AllowedRoles = { "ADMIN", "SUPER_ADMIN", "SYS_ADMIN", "SYSTEM_SUPER", "HR", "HR_ADMIN", "HR_MGR" };
    private static readonly string[] ThaiMonths = { "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };

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

    // ช่องที่ไม่แสดง: รหัสภายใน, ข้อมูลอ่อนไหว, และรหัสอ้างอิงที่มีช่องข้อความคู่กันอยู่แล้ว (ศาสนา/สัญชาติ ฯลฯ)
    private static readonly HashSet<string> IgnoredFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "Id", "EmployeeId", "CreatedAt", "UpdatedAt", "AvatarUpdatedAt", "CitizenId", "CitizenIdEncrypted",
        "SocialSecurityNo", "SocialSecurityNoEncrypted", "FileData", "FilePath", "StoragePath", "ExpiryWarningNotifiedAt", "ExpiredNotifiedAt",
        "GenderId", "NationalityId", "ReligionId", "MaritalStatusId", "SourceGeneralRequestId", "FileMimeType", "FileSize",
        "ProbationNotifiedAt", "ExpiryNotifiedAt", "AvatarUrl", "SignatureUrl", "AvatarData", "SignatureData", "UserId"
    };

    private static readonly Dictionary<string, string> FieldLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["EmployeeCode"] = "รหัสพนักงาน", ["BiometricId"] = "รหัสเครื่องสแกนนิ้ว", ["EmploymentStatus"] = "สถานะการจ้าง",
        ["Prefix"] = "คำนำหน้า", ["FirstName"] = "ชื่อ", ["LastName"] = "นามสกุล", ["CitizenIdMasked"] = "เลขบัตรประชาชน",
        ["BirthDate"] = "วันเกิด", ["Gender"] = "เพศ", ["Nationality"] = "สัญชาติ", ["Religion"] = "ศาสนา", ["MaritalStatus"] = "สถานภาพสมรส",
        ["MilitaryStatus"] = "สถานภาพทางทหาร", ["IsTopLevel"] = "เป็นผู้บริหารสูงสุด", ["SpouseHasIncome"] = "คู่สมรสมีเงินได้",
        ["NumberOfChildren"] = "จำนวนบุตร (ลดหย่อน)", ["ParentDeductionCount"] = "บิดามารดาที่ลดหย่อน", ["DisabilityDeductionCount"] = "ผู้พิการที่ลดหย่อน",
        ["PersonalPhone"] = "เบอร์โทรศัพท์", ["PersonalEmail"] = "อีเมล", ["OrganizationEmail"] = "อีเมลองค์กร",
        ["AddressType"] = "ประเภทที่อยู่", ["AddressLine"] = "บ้านเลขที่/ถนน", ["SubDistrict"] = "ตำบล/แขวง", ["District"] = "อำเภอ/เขต",
        ["Province"] = "จังหวัด", ["PostalCode"] = "รหัสไปรษณีย์", ["IsCurrent"] = "ใช้อยู่ปัจจุบัน",
        ["BankId"] = "ธนาคาร", ["AccountNumber"] = "เลขบัญชี", ["AccountType"] = "ประเภทบัญชี", ["AccountName"] = "ชื่อบัญชี",
        ["IsPrimary"] = "รายการหลัก", ["Status"] = "สถานะ", ["SocialSecurityNoMasked"] = "เลขประกันสังคม",
        ["HospitalName"] = "โรงพยาบาลประกันสังคม", ["HospitalCode"] = "รหัสโรงพยาบาล",
        ["EducationLevel"] = "ระดับการศึกษา", ["Institution"] = "สถาบัน", ["Major"] = "สาขาวิชา", ["GraduationYear"] = "ปีที่จบ", ["Gpa"] = "เกรดเฉลี่ย",
        ["CompanyName"] = "บริษัท", ["PositionName"] = "ตำแหน่ง", ["StartDate"] = "วันเริ่มงาน", ["EndDate"] = "วันที่ออก",
        ["LastSalary"] = "เงินเดือนล่าสุด", ["LeavingReason"] = "เหตุผลที่ออก", ["JobDescription"] = "หน้าที่รับผิดชอบ",
        ["RelationshipType"] = "ความสัมพันธ์", ["Relationship"] = "ความสัมพันธ์", ["EducationStatus"] = "สถานะการศึกษา", ["Occupation"] = "อาชีพ",
        ["PrimaryPhone"] = "เบอร์โทร", ["SecondaryPhone"] = "เบอร์โทรสำรอง", ["Address"] = "ที่อยู่",
        ["DivisionId"] = "ฝ่าย", ["DepartmentId"] = "แผนก", ["PositionId"] = "ตำแหน่ง", ["EmployeeLevelId"] = "ระดับ", ["EmployeeTypeId"] = "ประเภทพนักงาน",
        ["WorkScheduleId"] = "ตารางงาน", ["ManagerEmployeeId"] = "หัวหน้างานโดยตรง", ["EffectiveFrom"] = "มีผลตั้งแต่", ["EffectiveTo"] = "สิ้นสุดวันที่",
        ["WageType"] = "ประเภทค่าจ้าง",
        ["DocumentTypeId"] = "ประเภทเอกสาร", ["FileName"] = "ไฟล์", ["IssuedDate"] = "วันที่ออกเอกสาร", ["ExpiryDate"] = "วันหมดอายุ", ["Remarks"] = "หมายเหตุ",
    };

    // ชื่อช่องเฉพาะตาราง (ช่องเดียวกันแต่ความหมายต่างกัน)
    private static readonly Dictionary<(string Table, string Field), string> TableFieldLabels = new()
    {
        [("employee_address", "IsCurrent")] = "เป็นที่อยู่ปัจจุบัน",
        [("employee_assignment", "IsCurrent")] = "เป็นตำแหน่งปัจจุบัน",
        [("employee_assignment", "EffectiveTo")] = "สิ้นสุดตำแหน่งวันที่",
        [("employee_bank_account", "IsPrimary")] = "เป็นบัญชีหลักรับเงินเดือน",
        [("employee_document", "Status")] = "สถานะเอกสาร",
    };

    private static readonly Dictionary<string, Dictionary<string, string>> EnumLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["EmploymentStatus"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["ACTIVE"] = "ทำงานอยู่", ["PROBATION"] = "ทดลองงาน", ["INACTIVE"] = "ไม่ได้ทำงาน", ["RESIGNED"] = "ลาออก",
            ["TERMINATED"] = "เลิกจ้าง", ["SUSPENDED"] = "พักงาน", ["RETIRED"] = "เกษียณ"
        },
        ["WageType"] = new(StringComparer.OrdinalIgnoreCase) { ["MONTHLY"] = "รายเดือน", ["DAILY"] = "รายวัน", ["HOURLY"] = "รายชั่วโมง", ["STIPEND"] = "เบี้ยเลี้ยง" },
        ["AddressType"] = new(StringComparer.OrdinalIgnoreCase) { ["CURRENT"] = "ที่อยู่ปัจจุบัน", ["REGISTERED"] = "ตามทะเบียนบ้าน", ["PERMANENT"] = "ตามทะเบียนบ้าน", ["WORK"] = "ที่ทำงาน" },
        ["RelationshipType"] = new(StringComparer.OrdinalIgnoreCase) { ["FATHER"] = "บิดา", ["MOTHER"] = "มารดา", ["SPOUSE"] = "คู่สมรส", ["CHILD"] = "บุตร", ["SIBLING"] = "พี่น้อง" },
        ["Status"] = new(StringComparer.OrdinalIgnoreCase) { ["ACTIVE"] = "ใช้งาน", ["INACTIVE"] = "ไม่ใช้งาน" },
        ["AccountType"] = new(StringComparer.OrdinalIgnoreCase) { ["SAVINGS"] = "ออมทรัพย์", ["SAVING"] = "ออมทรัพย์", ["CURRENT"] = "กระแสรายวัน", ["FIXED"] = "ฝากประจำ" },
    };

    private static readonly HashSet<string> MoneyFields = new(StringComparer.OrdinalIgnoreCase) { "LastSalary" };

    // ช่องที่ใช้สรุปรายการ (ตอนเพิ่ม/ลบหลายแถวพร้อมกัน)
    private static readonly Dictionary<string, string[]> SummaryFields = new()
    {
        ["employee_education"] = new[] { "EducationLevel", "Institution", "Major", "GraduationYear" },
        ["employee_work_experience"] = new[] { "CompanyName", "PositionName", "StartDate", "EndDate" },
        ["family_member"] = new[] { "RelationshipType", "Prefix", "FirstName", "LastName" },
        ["emergency_contact"] = new[] { "Relationship", "FirstName", "LastName", "PrimaryPhone" },
        ["employee_address"] = new[] { "AddressLine", "SubDistrict", "District", "Province", "PostalCode" },
        ["employee_bank_account"] = new[] { "BankId", "AccountNumber", "AccountName" },
        ["employee_contact"] = new[] { "PersonalPhone", "PersonalEmail", "OrganizationEmail" },
        ["employee_assignment"] = new[] { "PositionId", "DepartmentId", "EffectiveFrom" },
        ["employee_document"] = new[] { "DocumentTypeId", "FileName", "ExpiryDate" },
        ["employee_social_security"] = new[] { "SocialSecurityNoMasked", "HospitalName" },
    };

    // ช่องอ้างอิงที่แปลงรหัส → ชื่อ
    private static readonly string[] LookupFields =
        { "DivisionId", "DepartmentId", "PositionId", "EmployeeLevelId", "EmployeeTypeId", "ManagerEmployeeId", "BankId", "DocumentTypeId" };

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private Dictionary<string, Dictionary<long, string>> _lookups = new(StringComparer.OrdinalIgnoreCase);

    public EmployeeChangeHistoryService(IHrmsDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<EmployeeChangeHistoryEntry>> GetAsync(long employeeId, int limit = 300, CancellationToken cancellationToken = default)
    {
        if (!AllowedRoles.Any(_currentUser.HasRole))
            throw new ForbiddenException("เฉพาะฝ่ายบุคคลเท่านั้นที่ดูประวัติการเปลี่ยนแปลงข้อมูลพนักงานได้");
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

        _lookups = await LoadLookupsAsync(rows.SelectMany(r => r.Old.Concat(r.New)), cancellationToken);

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

        for (var gi = 0; gi < groups.Count; gi++)
        {
            var g = groups[gi];
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

            // ย้าย/เปลี่ยนตำแหน่ง: "เพิ่มตำแหน่งใหม่" คู่กับ "สิ้นสุดตำแหน่งเดิม" ที่บันทึกพร้อมกัน → รายการเดียว
            if (first.Table == "employee_assignment" && first.Action == "INSERT" && g.Count == 1)
            {
                var pairIdx = FindEndedAssignment(groups, gi, first.UserId, first.At);
                if (pairIdx >= 0)
                {
                    var ended = groups[pairIdx][0];
                    BuildMove(entry, ended.Old, ended.New, first.New);
                    groups.RemoveAt(pairIdx);
                    if (entry.Changes.Count > 0) result.Add(entry);
                    if (result.Count >= limit) break;
                    continue;
                }
            }

            if (first.Action == "UPDATE" && g.Count == 1)
            {
                foreach (var key in first.New.Keys.Union(first.Old.Keys))
                {
                    if (IgnoredFields.Contains(key)) continue;
                    var oldV = Format(key, first.Old.TryGetValue(key, out var ov) ? (JsonElement?)ov : null);
                    var newV = Format(key, first.New.TryGetValue(key, out var nv) ? (JsonElement?)nv : null);
                    if (oldV == newV) continue;
                    entry.Changes.Add(new EmployeeFieldChange { Field = Label(first.Table, key), OldValue = oldV, NewValue = newV });
                }
                entry.Summary = UpdateSummary(first.Table, catLabel, first.Old, first.New, entry.Changes);
            }
            else if (g.Count == 1 && first.Action is "INSERT" or "DELETE")
            {
                // เพิ่ม/ลบแถวเดียว → แสดงทีละช่องพร้อมชื่อช่อง
                var values = first.Action == "INSERT" ? first.New : first.Old;
                foreach (var key in OrderedKeys(first.Table, values))
                {
                    var v = Format(key, values[key]);
                    if (string.IsNullOrWhiteSpace(v)) continue;
                    entry.Changes.Add(first.Action == "INSERT"
                        ? new EmployeeFieldChange { Field = Label(first.Table, key), NewValue = v }
                        : new EmployeeFieldChange { Field = Label(first.Table, key), OldValue = v });
                }
                var text = Summary(first.Table, values);
                entry.Summary = first.Action == "INSERT"
                    ? (first.Table == "employee_assignment" ? $"เพิ่มตำแหน่งงาน: {AssignmentText(values)}" : $"เพิ่ม{catLabel}: {text}")
                    : $"ลบ{catLabel}: {text}";
            }
            else
            {
                var removed = g.Where(x => x.Action == "DELETE").Select(x => Summary(x.Table, x.Old)).Where(s => s.Length > 0).ToList();
                var added = g.Where(x => x.Action == "INSERT").Select(x => Summary(x.Table, x.New)).Where(s => s.Length > 0).ToList();
                // ลบแล้วเพิ่มเหมือนเดิมทุกประการ = ไม่มีการเปลี่ยนแปลงจริง
                if (removed.OrderBy(s => s).SequenceEqual(added.OrderBy(s => s))) continue;

                var removedOnly = removed.Except(added).ToList();
                var addedOnly = added.Except(removed).ToList();
                entry.Action = removedOnly.Count > 0 && addedOnly.Count > 0 ? "REPLACE" : addedOnly.Count > 0 ? "INSERT" : "DELETE";
                foreach (var a in addedOnly) entry.Changes.Add(new EmployeeFieldChange { Field = "เพิ่ม", NewValue = a });
                foreach (var r in removedOnly) entry.Changes.Add(new EmployeeFieldChange { Field = "ลบ", OldValue = r });
                var parts = new List<string>();
                if (addedOnly.Count > 0) parts.Add($"เพิ่ม {addedOnly.Count} รายการ");
                if (removedOnly.Count > 0) parts.Add($"ลบ {removedOnly.Count} รายการ");
                entry.Summary = $"ปรับ{catLabel}: {string.Join(", ", parts)}";
            }

            if (entry.Changes.Count > 0) result.Add(entry);
            if (result.Count >= limit) break;
        }

        return result;
    }

    // ───────────────────────── สรุปเป็นประโยค ─────────────────────────

    private string UpdateSummary(string table, string category, Dictionary<string, JsonElement> old, Dictionary<string, JsonElement> @new, List<EmployeeFieldChange> changes)
    {
        if (table == "employee_assignment")
        {
            var merged = Merge(old, @new);
            var endedNow = Bool(old, "IsCurrent") == true && Bool(@new, "IsCurrent") == false;
            if (endedNow)
            {
                var endText = Format("EffectiveTo", merged.TryGetValue("EffectiveTo", out var et) ? et : null);
                return $"สิ้นสุดตำแหน่ง {AssignmentText(merged, includeDate: false)}" + (endText != null ? $" เมื่อ {endText}" : string.Empty);
            }
            if (changes.Count == 1 && changes[0].Field == Label(table, "ManagerEmployeeId"))
                return changes[0].NewValue != null ? $"ตั้งหัวหน้างานโดยตรงเป็น {changes[0].NewValue}" : "ยกเลิกหัวหน้างานโดยตรง";
        }
        if (changes.Count == 1)
        {
            var c = changes[0];
            if (c.OldValue == null) return $"กรอก{c.Field}: {c.NewValue}";
            if (c.NewValue == null) return $"ลบค่า{c.Field} (เดิม {c.OldValue})";
            return $"เปลี่ยน{c.Field} จาก {c.OldValue} เป็น {c.NewValue}";
        }
        var names = changes.Take(4).Select(c => c.Field).ToList();
        var more = changes.Count > 4 ? $" และอีก {changes.Count - 4} ช่อง" : string.Empty;
        return $"แก้ไข{category} {changes.Count} ช่อง: {string.Join(", ", names)}{more}";
    }

    private void BuildMove(EmployeeChangeHistoryEntry entry, Dictionary<string, JsonElement> endedOld, Dictionary<string, JsonElement> endedNew, Dictionary<string, JsonElement> created)
    {
        var before = Merge(endedOld, endedNew);
        entry.Action = "MOVE";
        foreach (var key in new[] { "PositionId", "DepartmentId", "DivisionId", "EmployeeLevelId", "EmployeeTypeId", "ManagerEmployeeId", "WageType" })
        {
            var oldV = Format(key, before.TryGetValue(key, out var o) ? o : null);
            var newV = Format(key, created.TryGetValue(key, out var nv) ? nv : null);
            if (oldV == newV) continue;
            entry.Changes.Add(new EmployeeFieldChange { Field = Label("employee_assignment", key), OldValue = oldV, NewValue = newV });
        }
        var from = Format("EffectiveFrom", created.TryGetValue("EffectiveFrom", out var ef) ? ef : null);
        var endedAt = Format("EffectiveTo", before.TryGetValue("EffectiveTo", out var et) ? et : null);
        if (endedAt != null) entry.Changes.Add(new EmployeeFieldChange { Field = "ตำแหน่งเดิมสิ้นสุดวันที่", NewValue = endedAt });
        if (from != null) entry.Changes.Add(new EmployeeFieldChange { Field = "ตำแหน่งใหม่มีผลตั้งแต่", NewValue = from });

        var changedKeys = entry.Changes.Count(c => c.OldValue != null || c.Field == Label("employee_assignment", "PositionId"));
        entry.Summary = changedKeys > 0 && entry.Changes.Any(c => c.OldValue != null)
            ? $"เปลี่ยนเป็น {AssignmentText(created, includeDate: false)}" + (from != null ? $" มีผล {from}" : string.Empty)
            : $"บันทึกตำแหน่งงานใหม่ (ตำแหน่งและสังกัดเหมือนเดิม)" + (from != null ? $" มีผล {from}" : string.Empty);
    }

    private string AssignmentText(Dictionary<string, JsonElement> v, bool includeDate = true)
    {
        string? F(string k) => Format(k, v.TryGetValue(k, out var x) ? x : null);
        var pos = F("PositionId") ?? "ไม่ระบุตำแหน่ง";
        var dept = F("DepartmentId");
        var text = dept != null ? $"{pos} (แผนก{dept})" : pos;
        var from = includeDate ? F("EffectiveFrom") : null;
        return from != null ? $"{text} มีผล {from}" : text;
    }

    private static int FindEndedAssignment<T>(List<List<T>> groups, int insertIdx, long? userId, DateTime at)
        where T : struct, ITuple
    {
        for (var j = Math.Max(0, insertIdx - 3); j < Math.Min(groups.Count, insertIdx + 4); j++)
        {
            if (j == insertIdx || groups[j].Count != 1) continue;
            var c = groups[j][0];
            var action = (string)c[2]!;
            var table = (string)c[3]!;
            var cUser = (long?)c[1];
            var cAt = (DateTime)c[4]!;
            if (table != "employee_assignment" || action != "UPDATE" || cUser != userId || Math.Abs((cAt - at).TotalSeconds) > 10) continue;
            var old = (Dictionary<string, JsonElement>)c[5]!;
            var @new = (Dictionary<string, JsonElement>)c[6]!;
            if (Bool(old, "IsCurrent") == true && Bool(@new, "IsCurrent") == false) return j;
        }
        return -1;
    }

    // ───────────────────────── แปลงค่า ─────────────────────────

    private async Task<Dictionary<string, Dictionary<long, string>>> LoadLookupsAsync(IEnumerable<KeyValuePair<string, JsonElement>> values, CancellationToken ct)
    {
        var ids = LookupFields.ToDictionary(f => f, _ => new HashSet<long>(), StringComparer.OrdinalIgnoreCase);
        foreach (var kv in values)
        {
            if (ids.TryGetValue(kv.Key, out var set) && kv.Value.ValueKind == JsonValueKind.Number && kv.Value.TryGetInt64(out var id)) set.Add(id);
        }

        var div = ids["DivisionId"].ToList();
        var dep = ids["DepartmentId"].ToList();
        var pos = ids["PositionId"].ToList();
        var lvl = ids["EmployeeLevelId"].ToList();
        var typ = ids["EmployeeTypeId"].ToList();
        var mgr = ids["ManagerEmployeeId"].ToList();
        var bank = ids["BankId"].ToList();
        var doc = ids["DocumentTypeId"].ToList();

        return new(StringComparer.OrdinalIgnoreCase)
        {
            ["DivisionId"] = div.Count == 0 ? new() : await _context.Divisions.AsNoTracking().Where(x => div.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.DivisionName, ct),
            ["DepartmentId"] = dep.Count == 0 ? new() : await _context.Departments.AsNoTracking().Where(x => dep.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.DepartmentName, ct),
            ["PositionId"] = pos.Count == 0 ? new() : await _context.Positions.AsNoTracking().Where(x => pos.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.PositionName, ct),
            ["EmployeeLevelId"] = lvl.Count == 0 ? new() : await _context.EmployeeLevels.AsNoTracking().Where(x => lvl.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.LevelName, ct),
            ["EmployeeTypeId"] = typ.Count == 0 ? new() : await _context.EmployeeTypes.AsNoTracking().Where(x => typ.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.TypeName, ct),
            ["ManagerEmployeeId"] = mgr.Count == 0 ? new() : (await _context.Employees.AsNoTracking().Where(x => mgr.Contains(x.Id))
                    .Select(x => new { x.Id, x.Prefix, x.FirstName, x.LastName, x.EmployeeCode }).ToListAsync(ct))
                .ToDictionary(x => x.Id, x => $"{x.Prefix} {x.FirstName} {x.LastName}".Trim() + $" ({x.EmployeeCode})"),
            ["BankId"] = bank.Count == 0 ? new() : await _context.Banks.AsNoTracking().Where(x => bank.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.BankName, ct),
            ["DocumentTypeId"] = doc.Count == 0 ? new() : await _context.DocumentTypes.AsNoTracking().Where(x => doc.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.DocumentName, ct),
        };
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

    private static Dictionary<string, JsonElement> Merge(Dictionary<string, JsonElement> a, Dictionary<string, JsonElement> b)
    {
        var m = new Dictionary<string, JsonElement>(a, StringComparer.OrdinalIgnoreCase);
        foreach (var kv in b) m[kv.Key] = kv.Value;
        return m;
    }

    private static bool? Bool(Dictionary<string, JsonElement> v, string key) =>
        v.TryGetValue(key, out var e) ? e.ValueKind switch { JsonValueKind.True => true, JsonValueKind.False => false, _ => null } : null;

    private static bool MatchesEmployee(Dictionary<string, JsonElement> values, string employeeId) =>
        values.TryGetValue("EmployeeId", out var v) && (v.ValueKind == JsonValueKind.Number ? v.GetRawText() : v.ToString()) == employeeId;

    private static string Label(string table, string key) =>
        TableFieldLabels.TryGetValue((table, key), out var tl) ? tl : FieldLabels.TryGetValue(key, out var l) ? l : key;

    private static IEnumerable<string> OrderedKeys(string table, Dictionary<string, JsonElement> values)
    {
        var preferred = SummaryFields.TryGetValue(table, out var f) ? f : Array.Empty<string>();
        return preferred.Where(values.ContainsKey)
            .Concat(values.Keys.Where(k => !preferred.Contains(k, StringComparer.OrdinalIgnoreCase)))
            .Where(k => !IgnoredFields.Contains(k) && FieldLabels.ContainsKey(k));
    }

    private string? Format(string key, JsonElement? value)
    {
        if (value is not { } v || v.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;

        if (_lookups.TryGetValue(key, out var lookup) && v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out var id))
            return lookup.TryGetValue(id, out var name) ? name : $"(ถูกลบแล้ว #{id})";

        if (v.ValueKind == JsonValueKind.True) return "ใช่";
        if (v.ValueKind == JsonValueKind.False) return "ไม่ใช่";

        var text = v.ValueKind == JsonValueKind.String ? v.GetString() : v.GetRawText();
        if (string.IsNullOrWhiteSpace(text)) return null;

        if (key.Equals("AccountNumber", StringComparison.OrdinalIgnoreCase))
            return text.Length > 4 ? new string('x', text.Length - 4) + text[^4..] : "xxxx";
        if (text.StartsWith("<ไบนารี")) return "(ข้อมูลไฟล์)";

        if (EnumLabels.TryGetValue(key, out var en) && en.TryGetValue(text, out var label)) return label;

        if (MoneyFields.Contains(key) && decimal.TryParse(text, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var money))
            return $"{money:#,##0.##} บาท";

        // วันที่ / วันเวลา (ISO) → แบบไทย
        var m = System.Text.RegularExpressions.Regex.Match(text, @"^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?");
        if (m.Success && int.TryParse(m.Groups[1].Value, out var y) && int.TryParse(m.Groups[2].Value, out var mo) && mo is >= 1 and <= 12
            && int.TryParse(m.Groups[3].Value, out var d))
        {
            var dateText = $"{d} {ThaiMonths[mo - 1]} {(y > 2400 ? y : y + 543)}";
            if (m.Groups[4].Success && !(m.Groups[4].Value == "00" && m.Groups[5].Value == "00"))
            {
                // เวลาใน audit log เป็น UTC → แสดงเวลาไทย
                if (DateTime.TryParse(text, System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var utc))
                {
                    var th = utc.AddHours(7);
                    return $"{th.Day} {ThaiMonths[th.Month - 1]} {th.Year + 543} {th:HH:mm} น.";
                }
            }
            return dateText;
        }

        if (key.Equals("GraduationYear", StringComparison.OrdinalIgnoreCase) && int.TryParse(text, out var gy) && gy < 2400) return (gy + 543).ToString();
        return text;
    }

    private string Summary(string table, Dictionary<string, JsonElement> values)
    {
        if (table == "employee_assignment") return AssignmentText(values);
        var fields = SummaryFields.TryGetValue(table, out var f) ? f : values.Keys.Where(k => !IgnoredFields.Contains(k)).Take(3).ToArray();
        return string.Join(" · ", fields.Select(k => Format(k, values.TryGetValue(k, out var v) ? (JsonElement?)v : null)).Where(s => !string.IsNullOrWhiteSpace(s)));
    }
}
