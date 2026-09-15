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

    /// <summary>
    /// ดาวน์โหลดไฟล์เอกสารแนบของคำร้องขอลา (เช่น ใบรับรองแพทย์)
    /// </summary>
    [HttpGet("{id:long}/documents/{docId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadDocument(long id, long docId, CancellationToken cancellationToken)
    {
        var document = await _requestService.GetDocumentAsync(id, docId, cancellationToken);
        if (document == null || document.FileData == null)
        {
            return NotFound(ApiResponse<object>.Fail("ไม่พบไฟล์เอกสารแนบที่ระบุ"));
        }

        var contentType = GetContentType(document.FileName);
        return File(document.FileData, contentType, document.FileName ?? "attachment");
    }

    private static string GetContentType(string? fileName)
    {
        var ext = System.IO.Path.GetExtension(fileName)?.ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }

    // ─────────────────────────────────────────────────────────────
    // ESS (Employee Self-Service) Endpoints
    // ข้อมูลถูก scope โดย EmployeeId จาก JWT Token อัตโนมัติ — พนักงานยื่น/ดู/ยกเลิก
    // คำขอลาของตัวเองเท่านั้น ไม่สามารถระบุ employeeId ของคนอื่นได้
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// [ESS] ดึงรายการคำขอลาของตนเอง
    /// </summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveRequestDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyRequests(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<List<LeaveRequestDto>>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var (items, totalCount) = await _requestService.GetAllAsync(employeeId, status, page, pageSize, cancellationToken);
        return Ok(ApiResponse<List<LeaveRequestDto>>.Ok(items, $"ดึงรายการคำขอลาของตนเองสำเร็จ (ทั้งหมด {totalCount} รายการ)"));
    }

    /// <summary>
    /// [ESS] ยื่นคำขอลาใหม่ด้วยตนเอง (แนบไฟล์หลักฐาน/ใบรับรองแพทย์ได้)
    /// </summary>
    [HttpPost("my")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateMyRequest(
        [FromBody] CreateMyLeaveRequestModel model,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<LeaveRequestDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        try
        {
            var dto = new CreateLeaveRequestDto
            {
                EmployeeId = employeeId,
                LeaveTypeId = model.LeaveTypeId,
                StartDatetime = model.StartDatetime,
                EndDatetime = model.EndDatetime,
                LeaveHours = model.LeaveHours,
                LeaveDays = model.LeaveDays,
                Reason = model.Reason,
                ContactDuringLeave = model.ContactDuringLeave,
                AttachmentFileName = model.AttachmentFileName,
                AttachmentData = model.AttachmentData
            };

            var result = await _requestService.CreateAsync(dto, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<LeaveRequestDto>.Ok(result, "ยื่นคำขอลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// [ESS] ยกเลิกคำขอลาของตนเอง (เฉพาะคำขอที่เป็นเจ้าของเท่านั้น)
    /// </summary>
    [HttpPut("my/{id:long}/cancel")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelMyRequest(
        long id,
        [FromBody] CancelLeaveRequestModel? model,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<LeaveRequestDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var existing = await _requestService.GetByIdAsync(id, cancellationToken);
        if (existing == null)
            return NotFound(ApiResponse<LeaveRequestDto>.Fail($"ไม่พบคำขอลารหัส ID {id}"));

        if (existing.EmployeeId != employeeId)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<LeaveRequestDto>.Fail("คุณไม่มีสิทธิ์ยกเลิกคำขอลานี้"));

        try
        {
            var result = await _requestService.CancelAsync(id, model?.Reason, employeeId, cancellationToken);
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, "ยกเลิกคำขอลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    // ─── Helper: ดึง EmployeeId จาก JWT Claims ─────────────────
    private long GetCurrentEmployeeId()
    {
        var claim = User.FindFirst("EmployeeId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && long.TryParse(claim.Value, out var id))
            return id;
        return 0;
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

/// <summary>
/// Model รับข้อมูลยื่นคำขอลาด้วยตนเอง (ESS) — ไม่มี EmployeeId เพราะอ่านจาก JWT Token เท่านั้น
/// ป้องกันไม่ให้พนักงานยื่นคำขอแทนคนอื่นได้
/// </summary>
public class CreateMyLeaveRequestModel
{
    public long LeaveTypeId { get; set; }
    public DateTime StartDatetime { get; set; }
    public DateTime EndDatetime { get; set; }
    public decimal LeaveHours { get; set; }
    public decimal LeaveDays { get; set; }
    public string? Reason { get; set; }
    public string? ContactDuringLeave { get; set; }
    public string? AttachmentFileName { get; set; }
    public byte[]? AttachmentData { get; set; }
}
