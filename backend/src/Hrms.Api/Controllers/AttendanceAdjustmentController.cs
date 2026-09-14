using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Api.Controllers;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Application.Features.Attendance.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/attendance/adjustments")]
public class AttendanceAdjustmentController : ControllerBase
{
    private readonly IAttendanceAdjustmentService _adjustmentService;

    public AttendanceAdjustmentController(IAttendanceAdjustmentService adjustmentService)
    {
        _adjustmentService = adjustmentService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedAdjustmentResult>>> GetAdjustments(
        [FromQuery] AdjustmentFilterDto filter,
        CancellationToken cancellationToken)
    {
        var result = await _adjustmentService.GetAdjustmentsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedAdjustmentResult>.Ok(result, "ดึงรายการคำขอปรับปรุงเวลาสำเร็จ"));
    }

    [HttpGet("pending-count")]
    public async Task<ActionResult<ApiResponse<int>>> GetPendingCount(CancellationToken cancellationToken)
    {
        var count = await _adjustmentService.GetPendingCountAsync(cancellationToken);
        return Ok(ApiResponse<int>.Ok(count, "ดึงจำนวนคำขอที่รอพิจารณาสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<AttendanceAdjustmentDto>>> GetAdjustmentById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _adjustmentService.GetAdjustmentByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<AttendanceAdjustmentDto>.Ok(result, "ดึงข้อมูลคำขอปรับปรุงเวลาสำเร็จ"));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<AttendanceAdjustmentDto>>> CreateAdjustment(
        [FromBody] CreateAttendanceAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        long currentUserId = GetCurrentEmployeeId();
        var result = await _adjustmentService.CreateAdjustmentAsync(request, currentUserId, cancellationToken);
        return CreatedAtAction(nameof(GetAdjustmentById), new { id = result.Id }, ApiResponse<AttendanceAdjustmentDto>.Ok(result, "ยื่นคำขอปรับปรุงเวลาสำเร็จ"));
    }

    [HttpPost("{id:long}/review")]
    public async Task<ActionResult<ApiResponse<AttendanceAdjustmentDto>>> ReviewAdjustment(
        long id,
        [FromBody] ReviewAttendanceAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        long currentUserId = GetCurrentEmployeeId();
        var result = await _adjustmentService.ReviewAdjustmentAsync(id, request, currentUserId, cancellationToken);
        var msg = request.Status == "APPROVED" ? "อนุมัติคำขอปรับปรุงเวลาเรียบร้อยแล้ว" : "ปฏิเสธคำขอปรับปรุงเวลาเรียบร้อยแล้ว";
        return Ok(ApiResponse<AttendanceAdjustmentDto>.Ok(result, msg));
    }

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<ApiResponse<AttendanceAdjustmentDto>>> CancelAdjustment(
        long id,
        CancellationToken cancellationToken)
    {
        long currentUserId = GetCurrentEmployeeId();
        var result = await _adjustmentService.CancelAdjustmentAsync(id, currentUserId, cancellationToken);
        return Ok(ApiResponse<AttendanceAdjustmentDto>.Ok(result, "ยกเลิกคำขอปรับปรุงเวลาเรียบร้อยแล้ว"));
    }

    private long GetCurrentEmployeeId()
    {
        var claim = User.FindFirst("EmployeeId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && long.TryParse(claim.Value, out var id))
        {
            return id;
        }
        return 0; // Fallback
    }
}
