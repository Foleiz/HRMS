using Hrms.Application.Common.Models;
using Hrms.Application.Features.Transfers.DTOs;
using Hrms.Application.Features.Transfers.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการคำขอย้ายแผนกและการเลื่อนตำแหน่ง (Department Transfer & Promotion)
/// </summary>
[ApiController]
[Route("api/employee-transfers")]
[Authorize]
public class EmployeeTransfersController : ControllerBase
{
    private readonly IEmployeeTransferService _transferService;

    public EmployeeTransfersController(IEmployeeTransferService transferService)
    {
        _transferService = transferService;
    }

    /// <summary>
    /// ดึงรายการคำขอย้ายแผนก/เลื่อนตำแหน่งทั้งหมด
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeTransferDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeTransferDto>>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? transferType,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _transferService.GetAllAsync(search, transferType, status, cancellationToken);
        return Ok(ApiResponse<List<EmployeeTransferDto>>.Ok(result, "ดึงรายการคำขอย้าย/เลื่อนตำแหน่งสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลสถิติ KPI สรุปการย้าย/เลื่อนตำแหน่ง
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<TransferStatsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<TransferStatsDto>>> GetStats(CancellationToken cancellationToken)
    {
        var stats = await _transferService.GetStatsAsync(cancellationToken);
        return Ok(ApiResponse<TransferStatsDto>.Ok(stats, "ดึงข้อมูลสถิติการย้าย/เลื่อนตำแหน่งสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายละเอียดคำขอตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTransferDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<EmployeeTransferDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _transferService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeTransferDto>.Ok(result, "ดึงรายละเอียดคำขอสำเร็จ"));
    }

    /// <summary>
    /// สร้างคำขอย้ายแผนก/เลื่อนตำแหน่งใหม่
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTransferDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<EmployeeTransferDto>>> Create(
        [FromBody] CreateEmployeeTransferRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _transferService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            ApiResponse<EmployeeTransferDto>.Ok(result, "สร้างคำขอย้าย/เลื่อนตำแหน่งสำเร็จ"));
    }

    /// <summary>
    /// อนุมัติคำขอย้ายแผนก/เลื่อนตำแหน่ง (พร้อมอัปเดต Assignment ของพนักงาน)
    /// </summary>
    [HttpPut("{id:long}/approve")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTransferDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<EmployeeTransferDto>>> Approve(long id, CancellationToken cancellationToken)
    {
        var result = await _transferService.ApproveAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeTransferDto>.Ok(result, "อนุมัติคำขอสำเร็จ และอัปเดตประวัติตำแหน่งงานเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ปฏิเสธคำขอย้ายแผนก/เลื่อนตำแหน่ง
    /// </summary>
    [HttpPut("{id:long}/reject")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTransferDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<EmployeeTransferDto>>> Reject(
        long id,
        [FromBody] RejectTransferRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _transferService.RejectAsync(id, request?.Reason, cancellationToken);
        return Ok(ApiResponse<EmployeeTransferDto>.Ok(result, "ปฏิเสธคำขอเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ดาวน์โหลดเอกสารคำสั่งย้าย (สำหรับ RecordType = ARCHIVE หรือคำขอที่มีเอกสารแนบ)
    /// </summary>
    [HttpGet("{id:long}/document")]
    public async Task<IActionResult> GetDocument(long id, CancellationToken cancellationToken)
    {
        var doc = await _transferService.GetDocumentAsync(id, cancellationToken);
        if (doc == null)
            return NotFound(ApiResponse<object>.Fail("ไม่พบเอกสารแนบ"));

        return File(doc.Value.Data, doc.Value.ContentType, doc.Value.FileName);
    }

    /// <summary>
    /// ดูประวัติ/ผังสายการอนุมัติ (Approval Timeline)
    /// </summary>
    [HttpGet("{id:long}/approval-timeline")]
    [ProducesResponseType(typeof(ApiResponse<Hrms.Application.Features.Approvals.DTOs.ApprovalTimelineDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<Hrms.Application.Features.Approvals.DTOs.ApprovalTimelineDto>>> GetApprovalTimeline(
        long id,
        CancellationToken cancellationToken)
    {
        var timeline = await _transferService.GetApprovalTimelineAsync(id, cancellationToken);
        if (timeline == null)
            return NotFound(ApiResponse<object>.Fail("ไม่พบข้อมูลสายการอนุมัติสำหรับคำขอนี้"));

        return Ok(ApiResponse<Hrms.Application.Features.Approvals.DTOs.ApprovalTimelineDto>.Ok(timeline, "ดึงข้อมูลผังการอนุมัติสำเร็จ"));
    }

    /// <summary>
    /// ดำเนินการอนุมัติหรือปฏิเสธผ่านระบบ Approval Workflow
    /// </summary>
    [HttpPut("{id:long}/process-action")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTransferDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<EmployeeTransferDto>>> ProcessAction(
        long id,
        [FromBody] ProcessTransferActionRequest request,
        CancellationToken cancellationToken)
    {
        var approverId = GetCurrentEmployeeId();
        if (approverId <= 0)
            return Unauthorized(ApiResponse<object>.Fail("ไม่พบข้อมูลพนักงานของผู้ใช้งานปัจจุบัน"));

        var result = await _transferService.ProcessActionAsync(
            id,
            approverId,
            request.ActionDecision,
            request.Comment,
            cancellationToken);

        return Ok(ApiResponse<EmployeeTransferDto>.Ok(result, "ดำเนินการเรียบร้อยแล้ว"));
    }

    private long GetCurrentEmployeeId()
    {
        var claim = User.FindFirst("employee_id") ?? User.FindFirst("EmployeeId") ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim != null && long.TryParse(claim.Value, out var id))
            return id;
        return 0;
    }
}

public class RejectTransferRequest
{
    public string? Reason { get; set; }
}

public class ProcessTransferActionRequest
{
    public string ActionDecision { get; set; } = string.Empty; // "APPROVE" or "REJECT"
    public string? Comment { get; set; }
}
