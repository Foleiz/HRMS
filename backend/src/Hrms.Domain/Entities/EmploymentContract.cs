using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สัญญาจ้างงานของพนักงาน (Employment Contract)
/// แมปกับตาราง hrms.employment_contract
/// </summary>
public class EmploymentContract : BaseEntity
{
    public long EmployeeId { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string ContractType { get; set; } = "PROBATION"; // PROBATION, PERMANENT, FIXED_TERM, OTHER
    public string? WageType { get; set; } = "MONTHLY"; // MONTHLY, DAILY
    public DateOnly StartDate { get; set; }
    public DateOnly? ProbationEndDate { get; set; }
    public DateOnly? ProbationPassedDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public DateOnly? TerminationDate { get; set; }
    public string? TerminationReason { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, PENDING_APPROVAL, COMPLETED, TERMINATED, CANCELLED
    public long? ApprovalInstanceId { get; set; }

    /// <summary>แจ้งเตือนใกล้สิ้นสุดทดลองงานไปแล้วเมื่อ (กันแจ้งซ้ำ)</summary>
    public DateTime? ProbationNotifiedAt { get; set; }
    /// <summary>แจ้งเตือนสัญญาใกล้หมดอายุไปแล้วเมื่อ (กันแจ้งซ้ำ)</summary>
    public DateTime? ExpiryNotifiedAt { get; set; }
    /// <summary>นำประเภทพนักงานของสัญญานี้ไปอัปเดตข้อมูลพนักงานแล้วเมื่อ (null = ยังไม่ได้ใช้)</summary>
    public DateTime? EmployeeTypeAppliedAt { get; set; }

    // เอกสารสัญญาจ้างแนบ (Document Attachment)
    public string? DocumentFileName { get; set; }
    public byte[]? DocumentFileData { get; set; }
    public string? DocumentMimeType { get; set; }
    public long? DocumentFileSize { get; set; }
    public DateTime? DocumentUploadedAt { get; set; }

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual EmployeeType? EmployeeType { get; set; }
}
