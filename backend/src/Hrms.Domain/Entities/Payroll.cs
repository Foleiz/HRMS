using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลสรุปการคำนวณเงินเดือนของพนักงานรายบุคคลในรอบนั้นๆ
/// แมปกับตาราง hrms.payroll
/// </summary>
public class Payroll : BaseEntity
{
    public long PeriodId { get; set; }
    public long EmployeeId { get; set; }
    public decimal TotalGrossIncome { get; set; }
    public decimal TotalDeductionAmount { get; set; }
    public decimal NetPayableSalary { get; set; }
    public string Status { get; set; } = "CALCULATED"; // CALCULATED, REVIEW, DRAFT, APPROVED, PAID
    public string? SnapshotEmployeeName { get; set; }
    public string? SnapshotDepartmentName { get; set; }
    public string? SnapshotPositionName { get; set; }
    public string? SnapshotWageType { get; set; }

    public PayrollPeriod? Period { get; set; }
    public Employee? Employee { get; set; }
    public ICollection<PayrollDetail> Details { get; set; } = new List<PayrollDetail>();
}
