using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข่าวสารและประกาศประชาสัมพันธ์องค์กร
/// แมปกับตาราง hrms.announcement
/// </summary>
public class Announcement : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpireAt { get; set; }
    public long? CreatedByEmployeeId { get; set; }
    public string Status { get; set; } = "DRAFT"; // DRAFT, PUBLISHED, ARCHIVED
    public bool IsPinned { get; set; } = false;
    public string? BannerImageUrl { get; set; }
    public string Category { get; set; } = "GENERAL"; // GENERAL, POLICY, ACTIVITY, WELFARE, URGENT
    public string Priority { get; set; } = "NORMAL"; // LOW, NORMAL, HIGH, URGENT
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public virtual Employee? CreatedByEmployee { get; set; }
    public virtual ICollection<AnnouncementTarget> Targets { get; set; } = new List<AnnouncementTarget>();
    public virtual ICollection<AnnouncementRead> Reads { get; set; } = new List<AnnouncementRead>();
}
