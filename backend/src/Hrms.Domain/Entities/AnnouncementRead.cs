namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติการเปิดอ่านข่าวสารของพนักงาน (Read Receipts)
/// แมปกับตาราง hrms.announcement_read
/// </summary>
public class AnnouncementRead
{
    public long AnnouncementId { get; set; }
    public long EmployeeId { get; set; }
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Announcement Announcement { get; set; } = null!;
    public virtual Employee Employee { get; set; } = null!;
}
