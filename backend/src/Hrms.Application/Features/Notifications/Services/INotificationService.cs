using Hrms.Application.Features.Notifications.DTOs;

namespace Hrms.Application.Features.Notifications.Services;

/// <summary>
/// อินเทอร์เฟซบริการจัดการการแจ้งเตือนภายในระบบ (In-App Notification Service)
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// ดึงสรุปการแจ้งเตือนสำหรับ Bell Hub บน Navbar (Unread Count + Recent 10 รายการ)
    /// </summary>
    Task<NotificationSummaryDto> GetSummaryAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้ พร้อมตัวเลือกแบ่งหน้าและกรองเฉพาะที่ยังไม่อ่าน
    /// </summary>
    Task<List<NotificationDto>> GetNotificationsAsync(
        long userId,
        int page = 1,
        int pageSize = 20,
        bool unreadOnly = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    /// </summary>
    Task<int> GetUnreadCountAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ทำเครื่องหมายว่าอ่านแล้วสำหรับรายการใดรายการหนึ่ง
    /// </summary>
    Task<bool> MarkAsReadAsync(long notificationId, long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// ทำเครื่องหมายว่าอ่านแล้วทั้งหมดสำหรับผู้ใช้งาน
    /// </summary>
    Task<int> MarkAllAsReadAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// สร้างการแจ้งเตือนใหม่สำหรับผู้ใช้ 1 ท่าน
    /// </summary>
    Task<NotificationDto> CreateNotificationAsync(CreateNotificationRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// ส่งการแจ้งเตือนไปยังกลุ่มผู้ใช้งานหลายคนพร้อมกัน (Broadcast)
    /// </summary>
    Task<int> BroadcastNotificationAsync(
        List<long> userIds,
        string type,
        string title,
        string? message,
        string? refType,
        long? refId,
        CancellationToken cancellationToken = default);
}
