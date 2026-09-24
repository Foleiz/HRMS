using System.Security.Claims;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Resignation.DTOs;
using Hrms.Application.Features.Resignation.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับระบบยื่นคำขอลาออกและติดตามสายการอนุมัติ (ESS Resignation Workflow)
/// </summary>
[ApiController]
[Route("api/resignation")]
[Authorize]
public class ResignationController : ControllerBase
{
    private readonly IResignationService _resignationService;
    private readonly ICurrentUserService _currentUserService;

    public ResignationController(
        IResignationService resignationService,
        ICurrentUserService currentUserService)
    {
        _resignationService = resignationService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// ดึงรายการคำขอลาออกของพนักงานที่ล็อกอินอยู่
    /// </summary>
    [HttpGet("my-requests")]
    public async Task<ActionResult<ApiResponse<List<ResignationRequestDto>>>> GetMyRequests(CancellationToken cancellationToken)
    {
        var result = await _resignationService.GetMyRequestsAsync(cancellationToken);
        return Ok(ApiResponse<List<ResignationRequestDto>>.Ok(result, "ดึงรายการคำขอลาออกของฉันสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการคำขอลาออกทั้งหมด (สำหรับฝ่ายบุคคล / ผู้จัดการ)
    /// </summary>
    [HttpGet("requests")]
    public async Task<ActionResult<ApiResponse<List<ResignationRequestDto>>>> GetAllRequests(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _resignationService.GetAllRequestsAsync(status, cancellationToken);
        return Ok(ApiResponse<List<ResignationRequestDto>>.Ok(result, "ดึงรายการคำขอลาออกสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายละเอียดคำขอลาออกตามรหัส ID
    /// </summary>
    [HttpGet("requests/{id:long}")]
    public async Task<ActionResult<ApiResponse<ResignationRequestDto>>> GetRequestById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _resignationService.GetRequestByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<ResignationRequestDto>.Fail("ไม่พบคำขอลาออกที่ระบุ"));
        }
        return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "ดึงรายละเอียดคำขอลาออกสำเร็จ"));
    }

    /// <summary>
    /// ยื่นคำขอลาออกใหม่
    /// </summary>
    [HttpPost("requests")]
    public async Task<ActionResult<ApiResponse<ResignationRequestDto>>> CreateRequest(
        [FromBody] CreateResignationRequestDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _resignationService.CreateRequestAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetRequestById), new { id = result.Id }, ApiResponse<ResignationRequestDto>.Ok(result, "ยื่นคำขอลาออกสำเร็จ"));
    }

    /// <summary>
    /// ขอยกเลิกคำขอลาออก
    /// </summary>
    [HttpPost("requests/{id:long}/cancel")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelRequest(
        long id,
        [FromBody] CancelResignationRequestDto? body,
        [FromQuery] string? reason,
        CancellationToken cancellationToken)
    {
        var cancelReason = body?.CancelReason ?? reason;
        var result = await _resignationService.CancelRequestAsync(id, cancelReason, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(result, "ยกเลิกคำขอลาออกสำเร็จ"));
    }

    /// <summary>
    /// อนุมัติคำขอลาออก (สำหรับผู้อนุมัติตามสายงาน / ฝ่ายบุคคล)
    /// </summary>
    [HttpPut("requests/{id:long}/approve")]
    public async Task<ActionResult<ApiResponse<ResignationRequestDto>>> Approve(
        long id,
        [FromBody] ApproveResignationRequestPayload? payload,
        CancellationToken cancellationToken)
    {
        try
        {
            var approverId = _currentUserService.EmployeeId;
            if (!approverId.HasValue || approverId.Value <= 0)
            {
                var empIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("employee_id")?.Value;
                if (long.TryParse(empIdStr, out var parsedId))
                {
                    approverId = parsedId;
                }
            }

            var result = await _resignationService.ApproveRequestAsync(id, approverId ?? 1, payload?.Comment, cancellationToken);
            return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "อนุมัติคำขอลาออกสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ResignationRequestDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<ResignationRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<ResignationRequestDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// ปฏิเสธคำขอลาออก (สำหรับผู้อนุมัติตามสายงาน / ฝ่ายบุคคล)
    /// </summary>
    [HttpPut("requests/{id:long}/reject")]
    public async Task<ActionResult<ApiResponse<ResignationRequestDto>>> Reject(
        long id,
        [FromBody] RejectResignationRequestPayload payload,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(payload.Reason))
        {
            return BadRequest(ApiResponse<ResignationRequestDto>.Fail("กรุณาระบุเหตุผลในการปฏิเสธ"));
        }

        try
        {
            var approverId = _currentUserService.EmployeeId;
            if (!approverId.HasValue || approverId.Value <= 0)
            {
                var empIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("employee_id")?.Value;
                if (long.TryParse(empIdStr, out var parsedId))
                {
                    approverId = parsedId;
                }
            }

            var result = await _resignationService.RejectRequestAsync(id, approverId ?? 1, payload.Reason, cancellationToken);
            return Ok(ApiResponse<ResignationRequestDto>.Ok(result, "ปฏิเสธคำขอลาออกสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ResignationRequestDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<ResignationRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<ResignationRequestDto>.Fail(ex.Message));
        }
    }
}
