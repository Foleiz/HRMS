using System.ComponentModel.DataAnnotations.Schema;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สมุดทะเบียนจัดเก็บไฟล์ภาพลายเซ็นอิเล็กทรอนิกส์ของพนักงาน (Mapping: hrms.employee_signature)
/// </summary>
public class EmployeeSignature
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public byte[] SignatureData { get; set; } = Array.Empty<byte>();
    public string FileName { get; set; } = string.Empty;
    public int FileSize { get; set; }
    public string MimeType { get; set; } = "image/png";
    public bool IsActive { get; set; } = true;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
