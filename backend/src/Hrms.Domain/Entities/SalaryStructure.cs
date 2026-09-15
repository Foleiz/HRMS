using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// โครงสร้างกรอบอัตราเงินเดือนตามตำแหน่งและระดับพนักงาน
/// แมปกับตาราง hrms.salary_structure
/// </summary>
public class SalaryStructure : BaseEntity
{
    public long? PositionId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public decimal MinSalary { get; set; } = 0;
    public decimal MaxSalary { get; set; } = 0;
    public decimal? DefaultSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public decimal? ApprovalLimit { get; set; } = 0;

    // Navigation Properties
    public virtual Position? Position { get; set; }
    public virtual EmployeeLevel? EmployeeLevel { get; set; }
}
