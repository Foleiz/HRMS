using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติการเปลี่ยนแปลงสถานะพนักงาน (Employee Status History Timeline)
/// แมปกับตาราง hrms.employee_status_history
/// </summary>
public class EmployeeStatusHistory : BaseEntity
{
    public long EmployeeId { get; set; }
    public long? SourceContractId { get; set; }
    public string Status { get; set; } = "PROBATION"; // PROBATION, PERMANENT, FIXED_TERM, RESIGNED, TERMINATED, OTHER
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual EmploymentContract? SourceContract { get; set; }
}
