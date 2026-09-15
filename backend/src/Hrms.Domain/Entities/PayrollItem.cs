using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// รายการรายได้และรายหักสำหรับคำนวณเงินเดือน
/// แมปกับตาราง hrms.payroll_item
/// </summary>
public class PayrollItem : BaseEntity
{
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string ItemType { get; set; } = "EARNING"; // EARNING, DEDUCTION
    public string CalculationType { get; set; } = "FIXED"; // FIXED, FORMULA, MANUAL
    public bool IsTaxable { get; set; } = true;
    public bool IsSocialSecurityCalculated { get; set; } = true;
    public string Status { get; set; } = "ACTIVE";
}
