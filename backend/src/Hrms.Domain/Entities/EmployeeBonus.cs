using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลการจัดสรรโบนัสและเงินรางวัลประจำปีของพนักงาน
/// แมปกับตาราง hrms.employee_bonus
/// </summary>
public class EmployeeBonus : BaseEntity
{
    public long EmployeeId { get; set; }
    public int Year { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal Multiplier { get; set; }
    public decimal BonusAmount { get; set; }
    public string CalculationMode { get; set; } = "MULTIPLIER";
    public string? Note { get; set; }
    public string Status { get; set; } = "DRAFT";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
}
