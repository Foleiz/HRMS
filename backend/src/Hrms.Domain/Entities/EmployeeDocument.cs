using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// แฟ้มเอกสารประจำตัวพนักงาน (Mapping: hrms.employee_document)
/// ฝ่ายบุคคลอัปโหลดเอง หรือระบบคัดลอกมาจากคำขอเอกสารทั่วไปที่อนุมัติแล้ว
/// </summary>
public class EmployeeDocument : BaseEntity
{
    public long EmployeeId { get; set; }
    public long DocumentTypeId { get; set; }

    public string? FileName { get; set; }
    public string? FileMimeType { get; set; }
    public long? FileSize { get; set; }
    public byte[]? FileData { get; set; }

    public DateOnly? IssuedDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public string? Remarks { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public long? UploadedByEmployeeId { get; set; }

    /// <summary>คำขอเอกสารทั่วไปต้นทาง (ถ้าคัดลอกมาจากคำขอที่อนุมัติแล้ว)</summary>
    public long? SourceGeneralRequestId { get; set; }

    public virtual Employee Employee { get; set; } = null!;
    public virtual DocumentType DocumentType { get; set; } = null!;
    public virtual Employee? UploadedByEmployee { get; set; }
}
