namespace Hrms.Domain.Entities;

/// <summary>
/// การตั้งค่ารอบเงินเดือนแยกตามประเภทสัญญา/ประเภทพนักงาน
/// แมปกับตาราง hrms.payroll_schedule_config
/// </summary>
public class PayrollScheduleConfig
{
    public long Id { get; set; }
    public long EmployeeTypeId { get; set; }
    /// <summary>ความถี่รอบจ่าย: MONTHLY, SEMI_MONTHLY, WEEKLY</summary>
    public string PayCycle { get; set; } = "MONTHLY";
    /// <summary>รายเดือน: FIRST_DAY หรือ CUSTOM_DAY</summary>
    public string StartDayType { get; set; } = "FIRST_DAY";
    public int StartDay { get; set; } = 1;
    /// <summary>รายเดือน: LAST_DAY หรือ CUSTOM_DAY</summary>
    public string EndDayType { get; set; } = "LAST_DAY";
    public int EndDay { get; set; } = 31;
    /// <summary>รายเดือน: วันจ่ายเงินของเดือน (1-31)</summary>
    public int PaymentDay { get; set; } = 29;
    /// <summary>รายปักษ์: วันสิ้นสุดงวดที่ 1 (ค่าเริ่มต้น 15)</summary>
    public int SemiMonthlyFirstCutoffDay { get; set; } = 15;
    /// <summary>รายปักษ์: วันจ่ายงวดที่ 1 (ค่าเริ่มต้น 15)</summary>
    public int SemiMonthlyFirstPayDay { get; set; } = 15;
    /// <summary>รายปักษ์: วันจ่ายงวดที่ 2 (ค่าเริ่มต้น 31 = สิ้นเดือน)</summary>
    public int SemiMonthlySecondPayDay { get; set; } = 31;
    /// <summary>รายสัปดาห์: วันเริ่มต้นสัปดาห์ (1=จันทร์ ... 0=อาทิตย์)</summary>
    public int WeeklyStartDayOfWeek { get; set; } = 1;
    /// <summary>รายสัปดาห์: จำนวนวันหลังสิ้นสุดงวดที่จ่ายเงิน (เช่น 3 = ตัดรอบอาทิตย์ จ่ายพุธ)</summary>
    public int WeeklyPayOffsetDays { get; set; } = 3;
    public bool AdjustWeekend { get; set; } = true;
    /// <summary>SAME_AS_PAYMENT หรือ CUSTOM_DAY</summary>
    public string ClaimCutoffType { get; set; } = "CUSTOM_DAY";
    public int ClaimCutoffDay { get; set; } = 25;
    /// <summary>BANK_BATCH หรือ DIRECT_TRANSFER</summary>
    public string DefaultPaymentMethod { get; set; } = "BANK_BATCH";
    public string? Note { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public EmployeeType? EmployeeType { get; set; }
}
