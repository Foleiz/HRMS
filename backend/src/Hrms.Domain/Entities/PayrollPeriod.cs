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
    public string Status { get; set; } = "REVIEW"; // DRAFT, REVIEW, APPROVED, PROCESSING, PAID, CLOSED
    public DateTimeOffset? ClosedAt { get; set; }
    public long? ClosedByEmployeeId { get; set; }
    public long? ApprovalInstanceId { get; set; }
    public string? PreApprovalStatus { get; set; }

    // Payment Workflow Fields
    /// <summary>วิธีการจ่ายเงิน: BANK_BATCH หรือ DIRECT_TRANSFER</summary>
    public string? PaymentMethod { get; set; }
    /// <summary>เวลาที่ CEO กด Confirm การจ่ายเงิน</summary>
    public DateTimeOffset? PaymentConfirmedAt { get; set; }
    /// <summary>Employee ID ของผู้ที่ Confirm การจ่ายเงิน</summary>
    public long? PaymentConfirmedBy { get; set; }
    /// <summary>เวลาที่สร้างไฟล์ธนาคาร (Bank Batch mode)</summary>
    public DateTimeOffset? BankFileGeneratedAt { get; set; }
    /// <summary>จำนวนพนักงานที่โอนเงินแล้ว</summary>
    public int TotalTransferredCount { get; set; } = 0;
    /// <summary>หมายเหตุการจ่ายเงิน</summary>
    public string? PaymentNote { get; set; }

    public ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
}
