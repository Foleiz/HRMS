using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติและฐานเงินเดือนของพนักงาน
/// แมปกับตาราง hrms.employee_salary
/// </summary>
public class EmployeeSalary : BaseEntity
{
    public long EmployeeId { get; set; }
    public decimal BaseSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? Reason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual Employee? ApprovedByEmployee { get; set; }
}
