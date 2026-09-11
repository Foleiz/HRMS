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
    public virtual Employee? Employee { get; set; }
    public virtual Division? Division { get; set; }
    public virtual Department? Department { get; set; }
    public virtual Position? Position { get; set; }
    public virtual EmployeeLevel? EmployeeLevel { get; set; }
    public virtual EmployeeType? EmployeeType { get; set; }
    public virtual WorkSchedule? WorkSchedule { get; set; }
}
