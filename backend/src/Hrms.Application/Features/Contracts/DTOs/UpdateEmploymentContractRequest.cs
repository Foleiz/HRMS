namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// DTO สำหรับแก้ไขสัญญาจ้างงาน
/// </summary>
public class UpdateEmploymentContractRequest
{
    public string? ContractType { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string? WageType { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? ProbationEndDate { get; set; }
    public DateOnly? ProbationPassedDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public DateOnly? TerminationDate { get; set; }
    public string? TerminationReason { get; set; }
    public string? Status { get; set; }

    // เอกสารแนบสัญญาจ้าง
    public string? DocumentFileName { get; set; }
    /// <summary>ไฟล์แบบ base64 (รองรับทั้ง data URL และ base64 ล้วน, ส่ง null หากไม่ต้องการเปลี่ยน, หรือ "REMOVE" เพื่อลบ)</summary>
    public string? DocumentFileData { get; set; }
}

/// <summary>
/// DTO สำหรับอัปโหลด/แนบเอกสารสัญญาจ้างงาน
/// </summary>
public class UploadContractDocumentRequest
{
    public string? FileName { get; set; }
    public string FileData { get; set; } = string.Empty;
}

/// <summary>
/// DTO สำหรับดาวน์โหลด/แสดงไฟล์เอกสารสัญญา
/// </summary>
public class ContractDocumentFile
{
    public string FileName { get; set; } = "contract";
    public string MimeType { get; set; } = "application/octet-stream";
    public byte[] Data { get; set; } = Array.Empty<byte>();
}
