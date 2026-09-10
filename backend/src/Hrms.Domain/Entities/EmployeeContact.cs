using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลช่องทางการติดต่อพนักงาน
/// แมปกับตาราง hrms.employee_contact
/// </summary>
public class EmployeeContact : BaseEntity
{
    public long EmployeeId { get; set; }
    public string? PersonalPhone { get; set; }
    public string? PersonalEmail { get; set; }
    public string? OrganizationEmail { get; set; }

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
