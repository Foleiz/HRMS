using Hrms.Domain.Common;
using Hrms.Domain.Common.Attributes;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลช่องทางการติดต่อพนักงาน
/// แมปกับตาราง hrms.employee_contact
/// </summary>
public class EmployeeContact : BaseEntity
{
    public long EmployeeId { get; set; }

    [AuditSensitive(AuditMaskMode.PersonalPii)]
    public string? PersonalPhone { get; set; }

    [AuditSensitive(AuditMaskMode.PersonalPii)]
    public string? PersonalEmail { get; set; }
    public string? OrganizationEmail { get; set; }

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
