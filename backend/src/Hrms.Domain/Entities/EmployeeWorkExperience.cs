using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติการทำงาน (ก่อนเข้าบริษัท) ของพนักงาน (Mapping: hrms.employee_work_experience)
/// </summary>
public class EmployeeWorkExperience : BaseEntity
{
    public long EmployeeId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? PositionName { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public decimal? LastSalary { get; set; }
    public string? LeavingReason { get; set; }
    /// <summary>หน้าที่ความรับผิดชอบ</summary>
    public string? JobDescription { get; set; }

    public virtual Employee Employee { get; set; } = null!;
}
