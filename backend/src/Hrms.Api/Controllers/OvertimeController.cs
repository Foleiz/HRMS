using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Application.Features.Attendance.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการและยื่นคำขออนุมัติทำงานล่วงเวลา (Overtime Request)
/// </summary>
[ApiController]
[Route("api/attendance/overtime")]
public class OvertimeController : ControllerBase
{
    private readonly IOvertimeService _service;

    public OvertimeController(IOvertimeService service)
    {
        _service = service;
    }

    /// <summary>
    /// ดึงรายการคำขออนุมัติทำงานล่วงเวลา
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetOvertimeRequests(
        [FromQuery] OvertimeFilterQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetOvertimeRequestsAsync(query, cancellationToken);
        return Ok(ApiResponse<List<OvertimeRequestDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงรายละเอียดคำขออนุมัติทำงานล่วงเวลาตาม ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOvertimeRequestById(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetOvertimeRequestByIdAsync(id, cancellationToken);
        if (result == null)
            return NotFound(ApiResponse<OvertimeRequestDto>.Fail("ไม่พบข้อมูลคำร้อง"));
        return Ok(ApiResponse<OvertimeRequestDto>.Ok(result));
    }

    /// <summary>
    /// ยื่นคำขออนุมัติทำงานล่วงเวลา (Overtime Request)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateOvertimeRequest(
        [FromBody] CreateOvertimeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentEmpId = GetCurrentEmployeeId();
            if (request.EmployeeId <= 0 && currentEmpId > 0)
            {
                request.EmployeeId = currentEmpId;
            }

            var result = await _service.CreateOvertimeRequestAsync(request, cancellationToken);
            return Ok(ApiResponse<OvertimeRequestDto>.Ok(result, "ยื่นคำขออนุมัติทำงานล่วงเวลาสำเร็จ"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<OvertimeRequestDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// พิจารณาอนุมัติหรือปฏิเสธคำขอทำงานล่วงเวลา (Approve / Reject)
    /// </summary>
    [HttpPost("{id}/review")]
    public async Task<IActionResult> ReviewOvertimeRequest(
        long id,
        [FromBody] ReviewOvertimeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var reviewerId = GetCurrentEmployeeId();
            var result = await _service.ReviewOvertimeRequestAsync(id, request, reviewerId, cancellationToken);
            var actionMsg = request.Action.ToUpperInvariant() == "APPROVED" ? "อนุมัติคำขอสำเร็จ" : "ปฏิเสธคำขอเรียบร้อยแล้ว";
            return Ok(ApiResponse<OvertimeRequestDto>.Ok(result, actionMsg));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<OvertimeRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<OvertimeRequestDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// ยกเลิกคำขอทำงานล่วงเวลา (Cancel)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelOvertimeRequest(long id, CancellationToken cancellationToken)
    {
        try
        {
            var currentEmpId = GetCurrentEmployeeId();
            var success = await _service.CancelOvertimeRequestAsync(id, currentEmpId, cancellationToken);
            if (!success)
                return NotFound(ApiResponse<bool>.Fail("ไม่พบคำร้อง"));
            return Ok(ApiResponse<bool>.Ok(true, "ยกเลิกคำขอทำงานล่วงเวลาสำเร็จ"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    private long GetCurrentEmployeeId()
    {
        var claim = User.FindFirst("employee_id") ?? User.FindFirst("EmployeeId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && long.TryParse(claim.Value, out var id))
            return id;
        return 0;
    }
}
