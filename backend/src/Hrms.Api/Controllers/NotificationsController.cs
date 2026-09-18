using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Notifications.DTOs;
using Hrms.Application.Features.Notifications.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับการแจ้งเตือนภายในระบบและกระดิ่งแจ้งเตือน (In-App Notifications Hub)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUserService;

    public NotificationsController(
        INotificationService notificationService,
        ICurrentUserService currentUserService)
    {
        _notificationService = notificationService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// ดึงสรุปการแจ้งเตือนสำหรับไอคอนกระดิ่งบน Navbar (ยอดที่ยังไม่อ่าน + 10 รายการล่าสุด)
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<NotificationSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<NotificationSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<NotificationSummaryDto>.Fail("ไม่พบข้อมูลผู้ใช้งาน"));
        }

        var summary = await _notificationService.GetSummaryAsync(userId.Value, cancellationToken);
        return Ok(ApiResponse<NotificationSummaryDto>.Ok(summary, "ดึงข้อมูลสรุปการแจ้งเตือนสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้ปัจจุบัน พร้อมตัวเลือกแบ่งหน้าและตัวกรอง
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<NotificationDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<NotificationDto>>>> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool unreadOnly = false,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<List<NotificationDto>>.Fail("ไม่พบข้อมูลผู้ใช้งาน"));
        }

        var items = await _notificationService.GetNotificationsAsync(
            userId.Value, page, pageSize, unreadOnly, cancellationToken);

        return Ok(ApiResponse<List<NotificationDto>>.Ok(items, "ดึงรายการแจ้งเตือนสำเร็จ"));
    }

    /// <summary>
    /// ดึงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<int>>> GetUnreadCount(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<int>.Fail("ไม่พบข้อมูลผู้ใช้งาน"));
        }

        var count = await _notificationService.GetUnreadCountAsync(userId.Value, cancellationToken);
        return Ok(ApiResponse<int>.Ok(count));
    }

    /// <summary>
    /// ทำเครื่องหมายว่าอ่านแล้วสำหรับรายการใดรายการหนึ่ง
    /// </summary>
    [HttpPut("{id:long}/read")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> MarkAsRead(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<bool>.Fail("ไม่พบข้อมูลผู้ใช้งาน"));
        }

        var success = await _notificationService.MarkAsReadAsync(id, userId.Value, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail("ไม่พบรายการแจ้งเตือน"));
        }

        return Ok(ApiResponse<bool>.Ok(true, "ทำเครื่องหมายอ่านแล้วสำเร็จ"));
    }

    /// <summary>
    /// ทำเครื่องหมายว่าอ่านแล้วทั้งหมดสำหรับผู้ใช้งานปัจจุบัน
    /// </summary>
    [HttpPut("read-all")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<int>>> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<int>.Fail("ไม่พบข้อมูลผู้ใช้งาน"));
        }

        var count = await _notificationService.MarkAllAsReadAsync(userId.Value, cancellationToken);
        return Ok(ApiResponse<int>.Ok(count, $"ทำเครื่องหมายอ่านแล้วทั้งหมด {count} รายการ"));
    }

    /// <summary>
    /// สร้างการแจ้งเตือนทดสอบ (Development / Utility)
    /// </summary>
    [HttpPost("test")]
    [ProducesResponseType(typeof(ApiResponse<NotificationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<NotificationDto>>> CreateTestNotification(
        [FromBody] CreateNotificationRequest request,
        CancellationToken cancellationToken)
    {
        var userId = request.UserId > 0 ? request.UserId : (_currentUserService.UserId ?? 1L);
        request.UserId = userId;

        var result = await _notificationService.CreateNotificationAsync(request, cancellationToken);
        return Ok(ApiResponse<NotificationDto>.Ok(result, "สร้างการแจ้งเตือนสำเร็จ"));
    }
}
