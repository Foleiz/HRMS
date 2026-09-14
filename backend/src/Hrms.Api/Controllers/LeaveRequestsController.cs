using System.Security.Claims;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Application.Features.Leave.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการคำร้องขอลาหยุดงาน (Leave Requests)
/// </summary>
[ApiController]
[Route("api/leave-requests")]
[Authorize]
public class LeaveRequestsController : ControllerBase
{
    private readonly ILeaveRequestService _requestService;

    public LeaveRequestsController(ILeaveRequestService requestService)
    {
        _requestService = requestService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveRequestDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeaveRequestDto>>>> GetAll(
        [FromQuery] long? employeeId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await _requestService.GetAllAsync(employeeId, status, page, pageSize, cancellationToken);
        return Ok(ApiResponse<List<LeaveRequestDto>>.Ok(items, $"ดึงรายการคำร้องขอลาสำเร็จ (ทั้งหมด {totalCount} รายการ)"));
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<LeaveStatsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<LeaveStatsDto>>> GetStats(CancellationToken cancellationToken)
    {
        var result = await _requestService.GetStatsAsync(cancellationToken);
        return Ok(ApiResponse<LeaveStatsDto>.Ok(result, "ดึงสถิติคำร้องขอลาสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _requestService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail($"ไม่พบคำร้องขอรหัส ID {id}"));
        }
        return Ok(ApiResponse<LeaveRequestDto>.Ok(result, "ดึงข้อมูลคำร้องขอลาสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> Create(
        [FromBody] CreateLeaveRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _requestService.CreateAsync(request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<LeaveRequestDto>.Ok(result, "ยื่นคำร้องขอลาสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}/approve")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> Approve(
        long id,
        CancellationToken cancellationToken)
    {
        try
        {
            var empIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            long.TryParse(empIdStr, out var approverId);

            var result = await _requestService.ApproveAsync(id, approverId > 0 ? approverId : null, cancellationToken);
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, "อนุมัติคำร้องขอลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}/reject")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> Reject(
        long id,
        [FromBody] RejectLeaveRequestModel? model,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _requestService.RejectAsync(id, model?.Reason, cancellationToken);
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, "ปฏิเสธคำร้องขอลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}/cancel")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> Cancel(
        long id,
        [FromBody] CancelLeaveRequestModel? model,
        CancellationToken cancellationToken)
    {
        try
        {
            var empIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            long.TryParse(empIdStr, out var cancelledBy);

            var result = await _requestService.CancelAsync(id, model?.Reason, cancelledBy > 0 ? cancelledBy : null, cancellationToken);
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, "ยกเลิกคำร้องขอลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }
}

public class RejectLeaveRequestModel
{
    public string? Reason { get; set; }
}

public class CancelLeaveRequestModel
{
    public string? Reason { get; set; }
}
