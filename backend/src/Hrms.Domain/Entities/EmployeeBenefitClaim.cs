namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.employee_benefit_claim'
/// จัดเก็บบันทึกประวัติการใช้สิทธิ์และเบิกจ่ายสวัสดิการของพนักงานรายบุคคล
/// </summary>
public class EmployeeBenefitClaim
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public long BenefitItemId { get; set; }
    public int ClaimYear { get; set; } = DateTime.UtcNow.Year;
    public DateOnly ClaimDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public decimal Amount { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ServiceProvider { get; set; }
    public string? Remarks { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentUrl { get; set; }
    public string Status { get; set; } = "APPROVED"; // PENDING, APPROVED, REJECTED, CANCELLED
    /// <summary>เลขที่คำขอ (เฉพาะที่พนักงานยื่นเบิกเอง) เช่น BC-202610-0001</summary>
    public string? RequestNo { get; set; }
    public long? ApprovalInstanceId { get; set; }
    /// <summary>ผู้ยื่นเบิก (พนักงาน) — null = ฝ่ายบุคคลบันทึกให้โดยตรง</summary>
    public long? RequestedByEmployeeId { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
    public string? RejectReason { get; set; }
    public DateTime? CompletedAt { get; set; }
    // ใบเสร็จ/หลักฐานแนบ
    public string? FileName { get; set; }
    public string? FileMimeType { get; set; }
    public long? FileSize { get; set; }
    public byte[]? FileData { get; set; }
    public long? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual Employee Employee { get; set; } = null!;
    public virtual BenefitItem BenefitItem { get; set; } = null!;
    public virtual UserAccount? ApprovedByUser { get; set; }
    public virtual Employee? ApprovedByEmployee { get; set; }
    public virtual ApprovalInstance? ApprovalInstance { get; set; }
}
