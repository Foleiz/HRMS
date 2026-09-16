using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// รอบการคำนวณเงินเดือน
/// แมปกับตาราง hrms.payroll_period
/// </summary>
public class PayrollPeriod : BaseEntity
{
    public int Year { get; set; }
    public int Month { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateOnly? PaymentDate { get; set; }
    public string Status { get; set; } = "REVIEW"; // DRAFT, REVIEW, APPROVED, PAID, CLOSED
    public DateTimeOffset? ClosedAt { get; set; }
    public long? ClosedByEmployeeId { get; set; }
    public long? ApprovalInstanceId { get; set; }
    public string? PreApprovalStatus { get; set; }

    public ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
}
