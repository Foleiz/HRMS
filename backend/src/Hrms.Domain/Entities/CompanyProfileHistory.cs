using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติข้อมูลบริษัทที่ใช้บนเอกสาร (ชื่อ ที่อยู่ ติดต่อ โลโก้ ตราประทับ)
/// บันทึกทุกครั้งที่แก้ข้อมูลบริษัท เพื่อให้เอกสารที่อนุมัติแล้วแสดงข้อมูล ณ วันที่อนุมัติเสมอ
/// แมปกับตาราง hrms.company_profile_history
/// </summary>
public class CompanyProfileHistory : BaseEntity
{
    public long CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public byte[]? LogoData { get; set; }
    public byte[]? SealData { get; set; }
    /// <summary>ใช้ข้อมูลชุดนี้ตั้งแต่เวลานี้ จนกว่าจะมีชุดใหม่</summary>
    public DateTime ValidFrom { get; set; } = DateTime.UtcNow;
}
