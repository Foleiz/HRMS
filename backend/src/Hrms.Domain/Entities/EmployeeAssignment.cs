using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติและสถานะการมอบหมายงาน/ตำแหน่งงานของพนักงาน (Employee Assignment)
/// แมปกับตาราง hrms.employee_assignment
/// </summary>
public class EmployeeAssignment : BaseEntity
{
    public long EmployeeId { get; set; }
    public long DivisionId { get; set; }
    public long DepartmentId { get; set; }
    public long PositionId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public long? EmployeeTypeId { get; set; }
    public long? WorkScheduleId { get; set; }
    public long? ManagerEmployeeId { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsCurrent { get; set; } = true;
    public string WageType { get; set; } = "MONTHLY"; // MONTHLY, DAILY

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual Division Division { get; set; } = null!;
    public virtual Department Department { get; set; } = null!;
    public virtual Position Position { get; set; } = null!;
}
