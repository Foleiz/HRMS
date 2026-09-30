namespace Hrms.Application.Features.EmployeeDocuments.DTOs;

public class EmployeeDocumentDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public long DocumentTypeId { get; set; }
    public string DocumentTypeCode { get; set; } = string.Empty;
    public string DocumentTypeName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; }
    public int NotifyBeforeDays { get; set; }
    public string? FileName { get; set; }
    public string? FileMimeType { get; set; }
    public long? FileSize { get; set; }
    public bool HasFile { get; set; }
    public string? IssuedDate { get; set; }
    public string? ExpiryDate { get; set; }
    /// <summary>VALID / EXPIRING_SOON (ภายในจำนวนวันแจ้งเตือนของประเภทเอกสาร) / EXPIRED / NO_EXPIRY</summary>
    public string ExpiryStatus { get; set; } = "NO_EXPIRY";
    public int? DaysToExpiry { get; set; }
    public string? Remarks { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? UploadedByName { get; set; }
    public long? SourceGeneralRequestId { get; set; }
    public string? SourceRequestNo { get; set; }
}

public class CreateEmployeeDocumentDto
{
    public long DocumentTypeId { get; set; }
    public string? FileName { get; set; }
    /// <summary>ไฟล์แบบ base64 (รองรับทั้ง data URL และ base64 ล้วน)</summary>
    public string? FileData { get; set; }
    public string? IssuedDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? Remarks { get; set; }
}

public class DocumentExpiryCheckResult
{
    public int ExpiringSoonNotified { get; set; }
    public int ExpiredNotified { get; set; }
    public int HrRecipients { get; set; }
}

public class EmployeeDocumentFile
{
    public string FileName { get; set; } = "document";
    public string MimeType { get; set; } = "application/octet-stream";
    public byte[] Data { get; set; } = Array.Empty<byte>();
}
