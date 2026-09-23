using System.Security.Claims;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Application.Features.Approvals.Services;
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
    private readonly IApprovalWorkflowService _approvalWorkflow;
    private readonly ICurrentUserService _currentUser;

    public LeaveRequestsController(
        ILeaveRequestService requestService,
        IApprovalWorkflowService approvalWorkflow,
        ICurrentUserService currentUser)
    {
        _requestService = requestService;
        _approvalWorkflow = approvalWorkflow;
        _currentUser = currentUser;
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
        // หน้ารายการรออนุมัติ/ประวัติฝั่งแอดมินเรียก endpoint นี้โดยไม่ระบุ employeeId มา —
        // ถ้าผู้เรียกไม่ใช่ ADMIN ให้กรองอัตโนมัติเหลือเฉพาะคำขอลาของทีมตนเอง หรือรายการที่อยู่ในสายการอนุมัติของผู้ใช้นี้
        long? scopeToManagerId = null;
        if (!employeeId.HasValue && !_currentUser.HasRole("ADMIN"))
        {
            scopeToManagerId = _currentUser.EmployeeId ?? -1;
        }

        var (items, totalCount) = await _requestService.GetAllAsync(
            employeeId,
            status,
            page,
            pageSize,
            scopeToManagerId,
            _currentUser.EmployeeId,
            cancellationToken);

        return Ok(ApiResponse<List<LeaveRequestDto>>.Ok(items, $"ดึงรายการคำร้องขอลาสำเร็จ (ทั้งหมด {totalCount} รายการ)"));
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<LeaveStatsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<LeaveStatsDto>>> GetStats(CancellationToken cancellationToken)
    {
        long? scopeToManagerId = null;
        if (!_currentUser.HasRole("ADMIN"))
        {
            scopeToManagerId = _currentUser.EmployeeId ?? -1;
        }

        var result = await _requestService.GetStatsAsync(scopeToManagerId, cancellationToken);
        return Ok(ApiResponse<LeaveStatsDto>.Ok(result, "ดึงสถิติคำร้องขอลาสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _requestService.GetByIdAsync(id, _currentUser.EmployeeId, cancellationToken);
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
            var detail = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(detail));
        }
    }

    [HttpPut("{id:long}/approve")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<LeaveRequestDto>>> Approve(
        long id,
        [FromBody] ApproveLeaveRequestPayload? payload,
        CancellationToken cancellationToken)
    {
        try
        {
            var approverId = _currentUser.EmployeeId;
            if (!approverId.HasValue || approverId.Value <= 0)
            {
                var empIdStr = User.FindFirstValue("employee_id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (long.TryParse(empIdStr, out var parsedId))
                {
                    approverId = parsedId;
                }
            }

            var result = await _requestService.ApproveAsync(id, approverId > 0 ? approverId : null, payload?.Comment, cancellationToken);
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, "อนุมัติคำร้องขอลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// ดึงประวัติและผังขั้นตอนการอนุมัติ (Approval Timeline) ตามสายการอนุมัติของคำขอนี้
    /// </summary>
    [HttpGet("{id:long}/approval-timeline")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalTimelineDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ApprovalTimelineDto>>> GetApprovalTimeline(
        long id,
        CancellationToken cancellationToken)
    {
        var timeline = await _approvalWorkflow.GetTimelineByDocumentAsync("LEAVE_REQUEST", id, cancellationToken);
        if (timeline == null)
        {
            return NotFound(ApiResponse<ApprovalTimelineDto>.Fail("ไม่พบประวัติหรือผังขั้นตอนการอนุมัติสำหรับคำขอนี้"));
        }

        return Ok(ApiResponse<ApprovalTimelineDto>.Ok(timeline, "ดึงข้อมูลผังขั้นตอนการอนุมัติสำเร็จ"));
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
            var empIdStr = User.FindFirstValue("employee_id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            long.TryParse(empIdStr, out var cancelledBy);

            var result = await _requestService.CancelAsync(id, model?.Reason, cancelledBy > 0 ? cancelledBy : null, cancellationToken: cancellationToken);
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

        var (items, totalCount) = await _requestService.GetAllAsync(employeeId, status, page, pageSize, cancellationToken: cancellationToken);
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
                AttachmentData = model.AttachmentData,
                IsDraft = model.SaveAsDraft
            };

            var result = await _requestService.CreateAsync(dto, cancellationToken);
            var message = model.SaveAsDraft ? "บันทึกแบบร่างสำเร็จ" : "ยื่นคำขอลาสำเร็จ";
            return StatusCode(StatusCodes.Status201Created, ApiResponse<LeaveRequestDto>.Ok(result, message));
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            // ดักจับ Exception อื่น ๆ ที่ไม่คาดคิด (เช่น ปัญหาจากฐานข้อมูล) เพื่อให้ผู้ใช้เห็นสาเหตุจริง
            // แทนที่จะได้ข้อความ 500 ทั่วไปที่ไม่มีรายละเอียดจาก ExceptionHandlingMiddleware
            // สำหรับ DbUpdateException ตัว ex.Message เองจะเป็นข้อความกำกวมเสมอ ("An error occurred while
            // saving the entity changes...") สาเหตุจริง (เช่น ชื่อคอลัมน์ที่ไม่มีในฐานข้อมูลจริง) จะอยู่ใน InnerException
            var detail = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(detail));
        }
    }

    /// <summary>
    /// [ESS] แก้ไขคำขอลาที่ยังเป็นแบบร่างของตนเอง (เฉพาะคำขอที่สถานะ DRAFT เท่านั้น)
    /// ใช้ทั้งตอนบันทึกแบบร่างซ้ำ (SaveAsDraft = true) และตอนกดยื่นจริงจากแบบร่างเดิม (SaveAsDraft = false)
    /// </summary>
    [HttpPut("my/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeaveRequestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMyDraftRequest(
        long id,
        [FromBody] CreateMyLeaveRequestModel model,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<LeaveRequestDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var existing = await _requestService.GetByIdAsync(id, employeeId, cancellationToken);
        if (existing == null)
            return NotFound(ApiResponse<LeaveRequestDto>.Fail($"ไม่พบคำขอลารหัส ID {id}"));

        if (existing.EmployeeId != employeeId)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<LeaveRequestDto>.Fail("คุณไม่มีสิทธิ์แก้ไขคำขอลานี้"));

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
                AttachmentData = model.AttachmentData,
                IsDraft = model.SaveAsDraft
            };

            var result = await _requestService.UpdateDraftAsync(id, dto, cancellationToken);
            var message = model.SaveAsDraft ? "บันทึกแบบร่างสำเร็จ" : "ยื่นคำขอลาสำเร็จ";
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, message));
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(ApiResponse<LeaveRequestDto>.Fail(detail));
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

        var existing = await _requestService.GetByIdAsync(id, employeeId, cancellationToken);
        if (existing == null)
            return NotFound(ApiResponse<LeaveRequestDto>.Fail($"ไม่พบคำขอลารหัส ID {id}"));

        if (existing.EmployeeId != employeeId)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<LeaveRequestDto>.Fail("คุณไม่มีสิทธิ์ยกเลิกคำขอลานี้"));

        try
        {
            // พนักงานถอนคำขอของตนเอง — ถ้ายังรออนุมัติอยู่ (PENDING) จะถอนกลับไปเป็นแบบร่างแทนการยกเลิกถาวร
            // เพื่อให้แก้ไขและยื่นใหม่ได้เอง ถ้าอนุมัติไปแล้ว (APPROVED) ยังคงยกเลิกถาวรตามเดิม (คืนโควตาให้)
            var result = await _requestService.CancelAsync(id, model?.Reason, employeeId, revertToDraftIfPending: true, cancellationToken: cancellationToken);
            var message = result.Status == "DRAFT"
                ? "ถอนคำขอกลับไปเป็นแบบร่างสำเร็จ สามารถแก้ไขและยื่นใหม่ได้"
                : "ยกเลิกคำขอลาสำเร็จ";
            return Ok(ApiResponse<LeaveRequestDto>.Ok(result, message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveRequestDto>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// [ESS] ลบคำขอลาที่ยังเป็นแบบร่างของตนเองแบบถาวร (เฉพาะคำขอที่เป็นเจ้าของและยังเป็น DRAFT เท่านั้น)
    /// </summary>
    [HttpDelete("my/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMyDraftRequest(long id, CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<object>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var existing = await _requestService.GetByIdAsync(id, employeeId, cancellationToken);
        if (existing == null)
            return NotFound(ApiResponse<object>.Fail($"ไม่พบคำขอลารหัส ID {id}"));

        if (existing.EmployeeId != employeeId)
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.Fail("คุณไม่มีสิทธิ์ลบคำขอลานี้"));

        try
        {
            await _requestService.DeleteDraftAsync(id, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { }, "ลบแบบร่างสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    // ─── Helper: ดึง EmployeeId จาก JWT Claims ─────────────────
    private long GetCurrentEmployeeId()
    {
        // Claim ที่ JwtTokenService ออกให้จริงคือ "employee_id" (ไม่ใช่ "EmployeeId")
        // และตั้งแต่ .NET 8 เป็นต้นไป ASP.NET Core ไม่ map "sub" -> ClaimTypes.NameIdentifier ให้อัตโนมัติแล้ว (MapInboundClaims default = false)
        // จึงต้องเช็ค "employee_id" เป็นหลักก่อน แล้วค่อย fallback ไปที่ค่าอื่นเผื่อ token รูปแบบเก่า
        var claim = User.FindFirst("employee_id") ?? User.FindFirst("EmployeeId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
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

    /// <summary>true = บันทึกเป็นแบบร่าง (ยังไม่ยื่นจริง), false = ยื่นจริง</summary>
    public bool SaveAsDraft { get; set; } = false;
}
