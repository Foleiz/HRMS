using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// คำขอเอกสารทั่วไป (General Request) — คำขอทั่วไปถึงฝ่ายบุคคลที่ต้องผ่านสายการอนุมัติ
/// เช่น ขอแก้ไขข้อมูลส่วนตัว ขอบัตรพนักงาน ส่งเอกสารให้ฝ่ายบุคคล
/// แมปกับตาราง hrms.general_request
/// </summary>
public class GeneralRequest : BaseEntity
{
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    /// <summary>ประเภทคำขอ (ข้อความ เช่น "ขอแก้ไขข้อมูลส่วนตัว")</summary>
    public string RequestType { get; set; } = string.Empty;
    /// <summary>รายละเอียด/วัตถุประสงค์ของคำขอ</summary>
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateOnly? IssueDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }

    // ไฟล์แนบ (เก็บในฐานข้อมูล ไม่เกิน 5 MB)
    public string? FileName { get; set; }
    public string? FileMimeType { get; set; }
    public long? FileSize { get; set; }
    public byte[]? FileData { get; set; }

    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    public string? RejectReason { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual ApprovalInstance? ApprovalInstance { get; set; }
}
