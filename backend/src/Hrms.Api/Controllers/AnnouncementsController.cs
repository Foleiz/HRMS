using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Announcements.DTOs;
using Hrms.Application.Features.Announcements.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการระบบข่าวสารและประกาศประชาสัมพันธ์องค์กร (Announcements & News Hub)
/// </summary>
[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcementService;
    private readonly ICurrentUserService _currentUserService;

    public AnnouncementsController(
        IAnnouncementService announcementService,
        ICurrentUserService currentUserService)
    {
        _announcementService = announcementService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// ดึงรายการประกาศสำหรับผู้ดูแลระบบ (Admin List with Pagination & Filters)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AnnouncementDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResult<AnnouncementDto>>>> GetAnnouncements(
        [FromQuery] AnnouncementFilterParams filter,
        CancellationToken cancellationToken)
    {
        var result = await _announcementService.GetAdminAnnouncementsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<AnnouncementDto>>.Ok(result, "ดึงรายการประกาศสำเร็จ"));
    }

    /// <summary>
    /// ดึงฟีดข่าวสารสำหรับพนักงานที่ล็อกอินอยู่ (กรองตามสังกัดฝ่าย/แผนก และสถานะการเผยแพร่)
    /// </summary>
    [HttpGet("my-feed")]
    [ProducesResponseType(typeof(ApiResponse<List<AnnouncementDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<AnnouncementDto>>>> GetMyFeed(
        CancellationToken cancellationToken)
    {
        var employeeId = _currentUserService.EmployeeId ?? 1L;
        var result = await _announcementService.GetEmployeeFeedAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<List<AnnouncementDto>>.Ok(result, "ดึงข่าวสารพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายละเอียดข่าวประกาศตามรหัส ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<AnnouncementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AnnouncementDto>>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var employeeId = _currentUserService.EmployeeId;
        var result = await _announcementService.GetByIdAsync(id, employeeId, cancellationToken);

        if (result == null)
        {
            return NotFound(ApiResponse<AnnouncementDto>.Fail($"ไม่พบข่าวประกาศรหัส ID {id}"));
        }

        return Ok(ApiResponse<AnnouncementDto>.Ok(result, "ดึงข้อมูลประกาศสำเร็จ"));
    }

    /// <summary>
    /// สร้างข่าวประกาศใหม่
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<AnnouncementDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AnnouncementDto>>> Create(
        [FromBody] CreateAnnouncementRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var creatorEmployeeId = _currentUserService.EmployeeId ?? 1L;
            var result = await _announcementService.CreateAsync(request, creatorEmployeeId, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<AnnouncementDto>.Ok(result, "สร้างข่าวประกาศสำเร็จ"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AnnouncementDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// ปรับปรุงข้อมูลข่าวประกาศ
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<AnnouncementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AnnouncementDto>>> Update(
        long id,
        [FromBody] UpdateAnnouncementRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _announcementService.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AnnouncementDto>.Ok(result, "ปรับปรุงข่าวประกาศสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<AnnouncementDto>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<AnnouncementDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// ลบข่าวประกาศ
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var success = await _announcementService.DeleteAsync(id, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบข่าวประกาศรหัส ID {id}"));
        }

        return Ok(ApiResponse<bool>.Ok(true, "ลบข่าวประกาศสำเร็จ"));
    }

    /// <summary>
    /// สลับสถานะการปักหมุดข่าว (Pin / Unpin)
    /// </summary>
    [HttpPut("{id:long}/pin")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> TogglePin(
        long id,
        CancellationToken cancellationToken)
    {
        var isPinned = await _announcementService.TogglePinAsync(id, cancellationToken);
        var msg = isPinned ? "ปักหมุดข่าวประกาศเรียบร้อย" : "ยกเลิกการปักหมุดเรียบร้อย";
        return Ok(ApiResponse<bool>.Ok(isPinned, msg));
    }

    /// <summary>
    /// กำหนดสถานะเผยแพร่ (Publish / Unpublish)
    /// </summary>
    [HttpPut("{id:long}/publish")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> SetPublishStatus(
        long id,
        [FromQuery] bool publish = true,
        CancellationToken cancellationToken = default)
    {
        var success = await _announcementService.SetPublishStatusAsync(id, publish, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบข่าวประกาศรหัส ID {id}"));
        }

        var msg = publish ? "เผยแพร่ข่าวประกาศเรียบร้อย" : "ยกเลิกการเผยแพร่ (เปลี่ยนเป็นแบบร่าง) เรียบร้อย";
        return Ok(ApiResponse<bool>.Ok(true, msg));
    }

    /// <summary>
    /// บันทึกว่าพนักงานเปิดอ่านข่าวประกาศแล้ว (Read Receipt)
    /// </summary>
    [HttpPost("{id:long}/read")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> MarkAsRead(
        long id,
        CancellationToken cancellationToken)
    {
        var employeeId = _currentUserService.EmployeeId ?? 1L;
        var success = await _announcementService.MarkAsReadAsync(id, employeeId, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบข่าวประกาศรหัส ID {id}"));
        }

        return Ok(ApiResponse<bool>.Ok(true, "บันทึกการเปิดอ่านสำเร็จ"));
    }

    /// <summary>
    /// ดึงสถิติและรายชื่อพนักงานที่เปิดอ่านข่าวประกาศ (Read Receipts Audit)
    /// </summary>
    [HttpGet("{id:long}/read-stats")]
    [ProducesResponseType(typeof(ApiResponse<AnnouncementReadStatsDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AnnouncementReadStatsDto>>> GetReadStats(
        long id,
        CancellationToken cancellationToken)
    {
        try
        {
            var stats = await _announcementService.GetReadStatsAsync(id, cancellationToken);
            return Ok(ApiResponse<AnnouncementReadStatsDto>.Ok(stats, "ดึงสถิติการเปิดอ่านสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<AnnouncementReadStatsDto>.Fail(ex.Message));
        }
    }
}
