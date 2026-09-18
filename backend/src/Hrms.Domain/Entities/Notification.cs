using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลการแจ้งเตือนภายในระบบ (In-App Notification)
/// แมปกับตาราง hrms.notification
/// </summary>
public class Notification : BaseEntity
{
    public long UserId { get; set; }
    public string NotificationType { get; set; } = string.Empty; // LEAVE_REQUEST, APPROVAL, ANNOUNCEMENT, PAYROLL, ATTENDANCE, GENERAL
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? ReferenceType { get; set; } // LEAVE_REQUEST, ANNOUNCEMENT, PAYROLL_PERIOD, ATTENDANCE
    public long? ReferenceId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    // Navigation Property
    public virtual UserAccount User { get; set; } = null!;
}
