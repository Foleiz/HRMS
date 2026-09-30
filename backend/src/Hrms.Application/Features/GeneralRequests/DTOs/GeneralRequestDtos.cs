namespace Hrms.Application.Features.GeneralRequests.DTOs;

public class GeneralRequestDto
{
    public long Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    /// <summary>ประเภทคำขอ (ชื่อฟิลด์เดิมฝั่งหน้าเว็บคือ documentType)</summary>
    public string DocumentType { get; set; } = string.Empty;
    /// <summary>ประเภทเอกสารใน Master (null เมื่อระบุประเภทเอง)</summary>
    public long? DocumentTypeId { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? IssueDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime SubmittedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }
    public int? CurrentStepNo { get; set; }
    public int TotalSteps { get; set; }
    public string? CurrentApproverDisplay { get; set; }
    public bool IsMyTurnToApprove { get; set; }
    public bool HasAlreadyApproved { get; set; }
    public bool CanApprove { get; set; }
    public bool CanReject { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectReason { get; set; }
    public bool CanCancel { get; set; }
}

public class CreateGeneralRequestDto
{
    public string DocumentType { get; set; } = string.Empty;
    /// <summary>ประเภทเอกสารใน Master (null เมื่อระบุประเภทเอง)</summary>
    public long? DocumentTypeId { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? IssueDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? FileName { get; set; }
    /// <summary>ไฟล์แนบแบบ base64 (รองรับทั้ง data URL และ base64 ล้วน)</summary>
    public string? FileData { get; set; }
}

public class ApproveGeneralRequestPayload
{
    public string? Comment { get; set; }
}

public class RejectGeneralRequestPayload
{
    public string Reason { get; set; } = string.Empty;
}

public class GeneralRequestAttachment
{
    public string FileName { get; set; } = "attachment";
    public string MimeType { get; set; } = "application/octet-stream";
    public byte[] Data { get; set; } = Array.Empty<byte>();
}
