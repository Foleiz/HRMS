using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// นโยบายและเกณฑ์สิทธิ์การลา (Leave Policy)
/// แมปกับตาราง hrms.leave_policy
/// </summary>
public class LeavePolicy : BaseEntity
{
    public long LeaveTypeId { get; set; }
    public long? EmployeeTypeId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public decimal EntitlementDays { get; set; }
    public int MinimumServiceDays { get; set; } = 0;
    public int AdvanceRequestDays { get; set; } = 0;
    public bool IsCarryForwardAllowed { get; set; } = false;
    public int? CarryForwardMaxMonths { get; set; }
    public int? CarryForwardExpiryMonths { get; set; }
    public bool IsDocumentRequired { get; set; } = false;
    public decimal? DocumentRequiredAfterDays { get; set; }
    public bool IsAllowedDuringProbation { get; set; } = false;
    public DateOnly EffectiveFrom { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? EffectiveTo { get; set; }
    public int? MaxLifetimeOccurrences { get; set; }
    public decimal? MaxDaysPerOccurrence { get; set; }
    public int? MaxOccurrencesPerYear { get; set; }
    /// <summary>ยกยอดข้ามปีได้สูงสุดกี่วัน (null = เท่าสิทธิ์ต่อปี)</summary>
    public decimal? CarryForwardMaxDays { get; set; }
    /// <summary>แนบเอกสารภายหลังได้ภายในกี่วัน (null/0 = ต้องแนบตอนยื่น) — นับจากวันสุดท้ายที่ลาหรือวันที่ยื่น แล้วแต่อันไหนช้ากว่า</summary>
    public int? DocumentGraceDays { get; set; }
    /// <summary>วิธีคิดสิทธิ์ปีแรกของพนักงานใหม่: FULL (เต็มปี) หรือ PRORATA_MONTHLY (ตามสัดส่วนเดือนที่เหลือ)</summary>
    public string ProrationMethod { get; set; } = "FULL";
    /// <summary>นับรวมวันหยุดประจำสัปดาห์และวันหยุดบริษัทในวันลาหรือไม่ (false = นับเฉพาะวันทำงาน, true = นับทุกวัน)</summary>
    public bool IncludeHolidays { get; set; } = false;

    // Navigation Properties
    public virtual LeaveType? LeaveType { get; set; }
    public virtual EmployeeType? EmployeeType { get; set; }
    public virtual EmployeeLevel? EmployeeLevel { get; set; }
}
