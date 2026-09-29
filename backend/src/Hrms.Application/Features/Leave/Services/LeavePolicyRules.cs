using Hrms.Application.Features.Attendance.Services;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Leave.Services;

/// <summary>
/// กฎกลางของนโยบายการลา (ใช้ร่วมกันทั้งการจัดสรรยอดวันลาและการตรวจคำขอลา)
/// </summary>
public static class LeavePolicyRules
{
    public const string ProrationFull = "FULL";
    public const string ProrationMonthly = "PRORATA_MONTHLY";

    /// <summary>หมวดในแบบฟอร์มใบลา</summary>
    public static readonly string[] FormCategories = { "SICK", "PERSONAL", "VACATION", "SPECIAL" };

    public static string? NormalizeFormCategory(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim().ToUpperInvariant();
        return FormCategories.Contains(v)
            ? v
            : throw new InvalidOperationException("หมวดแบบฟอร์มใบลาไม่ถูกต้อง (SICK, PERSONAL, VACATION, SPECIAL)");
    }

    /// <summary>เดาหมวดแบบฟอร์มจากรหัส/ชื่อประเภทการลา (ใช้กับข้อมูลเดิม)</summary>
    public static string InferFormCategory(string? code, string? name)
    {
        var c = (code ?? string.Empty).ToUpperInvariant();
        var n = name ?? string.Empty;
        if (c.Contains("SICK") || n.Contains("ป่วย")) return "SICK";
        if (c.Contains("PERSONAL") || c.Contains("BUSINESS") || n.Contains("กิจ")) return "PERSONAL";
        if (c.Contains("ANNUAL") || c.Contains("VACATION") || n.Contains("พักร้อน") || n.Contains("พักผ่อน")) return "VACATION";
        return "SPECIAL";
    }

    public static string NormalizeProration(string? value)
    {
        var v = string.IsNullOrWhiteSpace(value) ? ProrationFull : value.Trim().ToUpperInvariant();
        return v is ProrationFull or ProrationMonthly
            ? v
            : throw new InvalidOperationException("วิธีคิดสิทธิ์ไม่ถูกต้อง (FULL หรือ PRORATA_MONTHLY)");
    }

    private static int Specificity(LeavePolicy p) =>
        (p.EmployeeTypeId.HasValue ? 2 : 0) + (p.EmployeeLevelId.HasValue ? 1 : 0);

    /// <summary>
    /// เลือกนโยบายที่ใช้กับพนักงาน ณ วันที่กำหนด (ประเภทการลาเดียวกัน)
    /// - ต้องตรงประเภทพนักงาน/ระดับ (ค่าว่าง = ทุกประเภท/ทุกระดับ) และมีผลในวันนั้น
    /// - หลายอันตรง → เลือกอันที่เจาะจงที่สุด แล้วเลือกอันที่มีผลล่าสุด
    /// - ไม่มีอันไหนมีผลในวันนั้น → ใช้นโยบายปัจจุบัน (ไม่มีวันสิ้นสุด)
    ///   รองรับข้อมูลเดิมที่วันเริ่มมีผลถูกเขียนทับเป็นวันที่แก้ไขล่าสุด
    /// </summary>
    public static LeavePolicy? SelectPolicy(
        IEnumerable<LeavePolicy> policiesOfType, long? employeeTypeId, long? employeeLevelId, DateOnly onDate)
    {
        var applicable = policiesOfType
            .Where(p => (p.EmployeeTypeId == null || p.EmployeeTypeId == employeeTypeId)
                        && (p.EmployeeLevelId == null || p.EmployeeLevelId == employeeLevelId))
            .ToList();

        var effective = applicable
            .Where(p => p.EffectiveFrom <= onDate && (p.EffectiveTo == null || p.EffectiveTo >= onDate))
            .OrderByDescending(Specificity)
            .ThenByDescending(p => p.EffectiveFrom)
            .FirstOrDefault();

        return effective ?? applicable
            .Where(p => p.EffectiveTo == null)
            .OrderByDescending(Specificity)
            .ThenByDescending(p => p.EffectiveFrom)
            .FirstOrDefault();
    }

    /// <summary>
    /// สิทธิ์ต่อปีของพนักงาน — ปีที่เริ่มงานคิดตามสัดส่วนเดือนที่เหลือ (ถ้านโยบายกำหนด) ปัดลงทีละครึ่งวัน
    /// </summary>
    public static decimal ComputeEntitlement(LeavePolicy policy, DateOnly? hireDate, int year)
    {
        if (policy.ProrationMethod == ProrationMonthly && hireDate.HasValue)
        {
            if (hireDate.Value.Year > year) return 0m;
            if (hireDate.Value.Year == year)
            {
                var months = 12 - hireDate.Value.Month + 1;
                var raw = policy.EntitlementDays * months / 12m;
                return Math.Floor(raw * 2m) / 2m;
            }
        }
        return policy.EntitlementDays;
    }

    public static DateOnly ThaiToday() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, AttendanceDailyService.ThaiZone));

    /// <summary>วันที่ใช้เลือกนโยบายของปีวันลา: ปีนี้ = วันนี้, ปีหน้า = 1 ม.ค., ปีก่อน = 31 ธ.ค.</summary>
    public static DateOnly PolicyDateForYear(int year)
    {
        var today = ThaiToday();
        if (year == today.Year) return today;
        return year > today.Year ? new DateOnly(year, 1, 1) : new DateOnly(year, 12, 31);
    }

    /// <summary>ยกยอดข้ามปีได้สูงสุด (ไม่ได้กำหนด = เท่าสิทธิ์ต่อปี)</summary>
    public static decimal CarryForwardMaxDays(LeavePolicy policy) =>
        policy.CarryForwardMaxDays ?? policy.EntitlementDays;

    /// <summary>ยอดยกมาต้องใช้ภายในกี่เดือน (ไม่ได้กำหนด = 3 เดือน)</summary>
    public static int CarryForwardExpiryMonths(LeavePolicy policy) =>
        policy.CarryForwardExpiryMonths is > 0 ? policy.CarryForwardExpiryMonths.Value : 3;
}
