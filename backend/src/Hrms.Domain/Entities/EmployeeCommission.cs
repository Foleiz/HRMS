using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลยอดขายและค่าคอมมิชชั่นประจำงวดของพนักงาน
/// แมปกับตาราง hrms.employee_commission
/// </summary>
public class EmployeeCommission : BaseEntity
{
    public long EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal SalesAmount { get; set; } = 0;
    public decimal CommissionRate { get; set; } = 0;
    public decimal CommissionAmount { get; set; } = 0;
    public decimal SpecialAmount { get; set; } = 0;
    public decimal TotalCommission { get; set; } = 0;
    public string CalculationMode { get; set; } = "PERCENTAGE";
    public string Status { get; set; } = "DRAFT"; // DRAFT, CONFIRMED, PAID
    public string? Note { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public long? ConfirmedByEmployeeId { get; set; }
    public long? PaidPeriodId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual Employee? ConfirmedByEmployee { get; set; }
    public virtual PayrollPeriod? PaidPeriod { get; set; }
}
