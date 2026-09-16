using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Api.Controllers;
using Hrms.Application.Common.Interfaces;
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
    private readonly IHrmsDbContext _context;

    public AttendanceAdjustmentController(
        IAttendanceAdjustmentService adjustmentService,
        IHrmsDbContext context)
    {
        _adjustmentService = adjustmentService;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedAdjustmentResult>>> GetAdjustments(
        [FromQuery] AdjustmentFilterDto filter,
        CancellationToken cancellationToken)
    {
        var result = await _adjustmentService.GetAdjustmentsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedAdjustmentResult>.Ok(result, "ดึงรายการคำขอปรับปรุงเวลาสำเร็จ"));
    }

    /// <summary>
    /// [ESS] ดึงรายการคำขอปรับปรุงเวลาของตนเอง
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<ApiResponse<PagedAdjustmentResult>>> GetMyAdjustments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        long currentUserId = GetCurrentEmployeeId();
        if (currentUserId <= 0)
            return Unauthorized(ApiResponse<PagedAdjustmentResult>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var filter = new AdjustmentFilterDto
        {
            EmployeeId = currentUserId,
            Page = page,
            PageSize = pageSize
        };
        var result = await _adjustmentService.GetAdjustmentsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedAdjustmentResult>.Ok(result, "ดึงรายการคำขอปรับปรุงเวลาของตนเองสำเร็จ"));
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
        if (currentUserId <= 0)
        {
            return Unauthorized(ApiResponse<AttendanceAdjustmentDto>.Fail("ไม่สามารถระบุตัวตนพนักงานของผู้ใช้งานได้ กรุณาเข้าสู่ระบบใหม่"));
        }
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
        if (currentUserId <= 0)
        {
            return Unauthorized(ApiResponse<AttendanceAdjustmentDto>.Fail("ไม่สามารถระบุตัวตนพนักงานของผู้ใช้งานได้"));
        }
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
        if (currentUserId <= 0)
        {
            return Unauthorized(ApiResponse<AttendanceAdjustmentDto>.Fail("ไม่สามารถระบุตัวตนพนักงานของผู้ใช้งานได้"));
        }
        var result = await _adjustmentService.CancelAdjustmentAsync(id, currentUserId, cancellationToken);
        return Ok(ApiResponse<AttendanceAdjustmentDto>.Ok(result, "ยกเลิกคำขอปรับปรุงเวลาเรียบร้อยแล้ว"));
    }

    private long GetCurrentEmployeeId()
    {
        // 1. Claim ที่ JwtTokenService ออกให้จริงคือ "employee_id"
        var claim = User.FindFirst("employee_id") 
                 ?? User.FindFirst("EmployeeId");

        if (claim != null && long.TryParse(claim.Value, out var id) && id > 0)
        {
            return id;
        }

        // 2. Fallback: กรณี token ไม่มี employee_id โดยตรง ให้ค้นหาจาก UserId (sub / NameIdentifier) ในตาราง UserAccount
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        if (userClaim != null && long.TryParse(userClaim.Value, out var userId) && userId > 0)
        {
            var empId = _context.UserAccounts.Where(u => u.Id == userId).Select(u => u.EmployeeId).FirstOrDefault();
            if (empId > 0) return empId;
        }

        return 0;
    }
}
