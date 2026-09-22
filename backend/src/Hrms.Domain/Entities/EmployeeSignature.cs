using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ลายเซ็นดิจิทัลของพนักงาน/ผู้มีอำนาจลงนาม (Employee Signature)
/// แมปกับตาราง hrms.employee_signature
/// </summary>
public class EmployeeSignature : BaseEntity
{
    public long EmployeeId { get; set; }
    public byte[] SignatureData { get; set; } = Array.Empty<byte>();
    public string? FileName { get; set; }
    public int? FileSize { get; set; }
    public string? MimeType { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
}
