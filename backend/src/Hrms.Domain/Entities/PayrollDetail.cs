using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// รายละเอียดรายการรายได้และรายหักแต่ละรายการของพนักงาน
/// แมปกับตาราง hrms.payroll_detail
/// </summary>
public class PayrollDetail : BaseEntity
{
    public long PayrollId { get; set; }
    public long PayrollItemId { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Rate { get; set; }
    public decimal Amount { get; set; }
    public string? CalculationSource { get; set; }

    public Payroll? Payroll { get; set; }
    public PayrollItem? PayrollItem { get; set; }
}
