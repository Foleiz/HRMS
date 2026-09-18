using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Notifications.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Notifications.Services;

/// <summary>
/// อิมพลีเมนต์บริการจัดการการแจ้งเตือนภายในระบบ (Notification Service)
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IHrmsDbContext _context;

    public NotificationService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<NotificationSummaryDto> GetSummaryAsync(long userId, CancellationToken cancellationToken = default)
    {
        var unreadCount = await _context.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);

        var recentItems = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        return new NotificationSummaryDto
        {
            UnreadCount = unreadCount,
            RecentNotifications = recentItems.Select(MapToDto).ToList()
        };
    }

    public async Task<List<NotificationDto>> GetNotificationsAsync(
        long userId,
        int page = 1,
        int pageSize = 20,
        bool unreadOnly = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<int> GetUnreadCountAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
    }

    public async Task<bool> MarkAsReadAsync(long notificationId, long userId, CancellationToken cancellationToken = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, cancellationToken);

        if (notification == null) return false;

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<int> MarkAllAsReadAsync(long userId, CancellationToken cancellationToken = default)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (!unreadNotifications.Any()) return 0;

        var now = DateTime.UtcNow;
        foreach (var item in unreadNotifications)
        {
            item.IsRead = true;
            item.ReadAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return unreadNotifications.Count;
    }

    public async Task<NotificationDto> CreateNotificationAsync(CreateNotificationRequest request, CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            UserId = request.UserId,
            NotificationType = string.IsNullOrWhiteSpace(request.NotificationType) ? "GENERAL" : request.NotificationType,
            Title = request.Title,
            Message = request.Message,
            ReferenceType = request.ReferenceType,
            ReferenceId = request.ReferenceId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(notification);
    }

    public async Task<int> BroadcastNotificationAsync(
        List<long> userIds,
        string type,
        string title,
        string? message,
        string? refType,
        long? refId,
        CancellationToken cancellationToken = default)
    {
        if (userIds == null || !userIds.Any()) return 0;

        var distinctUserIds = userIds.Distinct().ToList();
        var now = DateTime.UtcNow;

        var notifications = distinctUserIds.Select(uid => new Notification
        {
            UserId = uid,
            NotificationType = type,
            Title = title,
            Message = message,
            ReferenceType = refType,
            ReferenceId = refId,
            IsRead = false,
            CreatedAt = now
        }).ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync(cancellationToken);

        return notifications.Count;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static NotificationDto MapToDto(Notification entity)
    {
        return new NotificationDto
        {
            Id = entity.Id,
            UserId = entity.UserId,
            NotificationType = entity.NotificationType,
            Title = entity.Title,
            Message = entity.Message,
            ReferenceType = entity.ReferenceType,
            ReferenceId = entity.ReferenceId,
            IsRead = entity.IsRead,
            CreatedAt = entity.CreatedAt,
            ReadAt = entity.ReadAt,
            TargetUrl = ResolveTargetUrl(entity.NotificationType, entity.ReferenceType, entity.ReferenceId),
            TimeAgo = FormatTimeAgo(entity.CreatedAt)
        };
    }

    private static string ResolveTargetUrl(string notificationType, string? referenceType, long? referenceId)
    {
        var refType = referenceType?.ToUpperInvariant() ?? notificationType.ToUpperInvariant();

        return refType switch
        {
            "LEAVE_REQUEST" => "/approvals/leave-requests",
            "LEAVE" => "/documents/leave",
            "APPROVAL" => "/approvals/leave-requests",
            "ANNOUNCEMENT" => "/announcements",
            "PAYROLL" => "/payroll",
            "ATTENDANCE" => "/attendance/daily",
            "TIME_ADJUSTMENT" => "/ess/attendance",
            _ => "/"
        };
    }

    private static string FormatTimeAgo(DateTime createdAt)
    {
        var diff = DateTime.UtcNow - createdAt;
        if (diff.TotalSeconds < 60) return "เมื่อสักครู่";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} นาทีที่แล้ว";
        if (diff.TotalHours < 24) return $"{(int)diff.TotalHours} ชั่วโมงที่แล้ว";
        if (diff.TotalDays < 2) return "เมื่อวานนี้";
        if (diff.TotalDays < 7) return $"{(int)diff.TotalDays} วันที่แล้ว";

        return createdAt.ToString("dd/MM/yyyy HH:mm");
    }
}
