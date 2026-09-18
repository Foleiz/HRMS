namespace Hrms.Application.Features.Notifications.DTOs;

/// <summary>
/// DTO ข้อมูลการแจ้งเตือน
/// </summary>
public class NotificationDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? ReferenceType { get; set; }
    public long? ReferenceId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public string TargetUrl { get; set; } = string.Empty;
    public string TimeAgo { get; set; } = string.Empty;
}

/// <summary>
/// DTO สรุปการแจ้งเตือนสำหรับ Bell Hub บน Navbar
/// </summary>
public class NotificationSummaryDto
{
    public int UnreadCount { get; set; }
    public List<NotificationDto> RecentNotifications { get; set; } = new();
}

/// <summary>
/// Request สำหรับสร้างการแจ้งเตือนใหม่ในระบบ
/// </summary>
public class CreateNotificationRequest
{
    public long UserId { get; set; }
    public string NotificationType { get; set; } = "GENERAL";
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? ReferenceType { get; set; }
    public long? ReferenceId { get; set; }
}
