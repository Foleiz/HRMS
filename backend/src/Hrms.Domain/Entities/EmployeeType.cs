namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.employee_type'
/// จัดเก็บประเภทการจ้างงาน (เช่น พนักงานประจำ, พนักงานทดลองงาน, สัญญาจ้าง, รายวัน, พาร์ทไทม์, นักศึกษาฝึกงาน)
/// </summary>
public class EmployeeType
{
    public long Id { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string WageType { get; set; } = "MONTHLY"; // MONTHLY, DAILY, HOURLY, STIPEND
    public bool HasSocialSecurity { get; set; } = true;
    public bool HasLeaveEntitlement { get; set; } = true;
    public bool HasOvertime { get; set; } = true;
    public bool HasProvidentFund { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<EmployeeTypeBenefit> EmployeeTypeBenefits { get; set; } = new List<EmployeeTypeBenefit>();
}
