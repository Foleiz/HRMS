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

    // Individual Payment Tracking
    /// <summary>สถานะการโอนเงินรายบุคคล: PENDING, TRANSFERRED, FAILED</summary>
    public string PaymentStatus { get; set; } = "PENDING";
    /// <summary>เวลาที่โอนเงินสำเร็จ</summary>
    public DateTimeOffset? TransferredAt { get; set; }
    /// <summary>เลข Reference ของการโอนเงิน</summary>
    public string? TransferReference { get; set; }
    /// <summary>ไฟล์ Slip (binary) เก็บใน Database โดยตรง</summary>
    public byte[]? SlipData { get; set; }
    /// <summary>ชื่อไฟล์ Slip เดิม</summary>
    public string? SlipFileName { get; set; }
    /// <summary>MIME type ของ Slip เช่น image/jpeg, application/pdf</summary>
    public string? SlipContentType { get; set; }
    /// <summary>เวลาที่ Upload Slip</summary>
    public DateTimeOffset? SlipUploadedAt { get; set; }

    public PayrollPeriod? Period { get; set; }
    public Employee? Employee { get; set; }
    public ICollection<PayrollDetail> Details { get; set; } = new List<PayrollDetail>();
}
