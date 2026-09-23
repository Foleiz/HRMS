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

    public ResignationController(IResignationService resignationService)
    {
        _resignationService = resignationService;
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
}
