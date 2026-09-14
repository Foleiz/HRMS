namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลรูปภาพโปรไฟล์พนักงาน (จัดเก็บแบบไบนารีในฐานข้อมูล PostgreSQL โดยตรง)
/// แมปกับตาราง hrms.employee_avatar
/// </summary>
public class EmployeeAvatar
{
    public long EmployeeId { get; set; }
    public byte[] ImageData { get; set; } = Array.Empty<byte>();
    public string MimeType { get; set; } = "image/jpeg";
    public int FileSize { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
