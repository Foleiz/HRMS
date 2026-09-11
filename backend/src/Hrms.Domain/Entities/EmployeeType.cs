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
    public string Status { get; set; } = "ACTIVE";
}
