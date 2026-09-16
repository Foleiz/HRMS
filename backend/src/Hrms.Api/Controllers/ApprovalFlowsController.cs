using Hrms.Application.Common.Models;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Application.Features.Approvals.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับตั้งค่าสายการอนุมัติเอกสารกลาง (Approval Workflow Designer)
/// ใช้งานโดยฝ่ายบุคคล — สิทธิ์เข้าถึงหน้าจอควบคุมจากฝั่ง Frontend (แท็บ "สายการอนุมัติ" ในหน้าตั้งค่า)
/// </summary>
[ApiController]
[Route("api/approval-flows")]
[Authorize]
public class ApprovalFlowsController : ControllerBase
{
    private readonly IApprovalFlowService _flowService;

    public ApprovalFlowsController(IApprovalFlowService flowService)
    {
        _flowService = flowService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ApprovalFlowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<ApprovalFlowDto>>>> GetAll(
        [FromQuery] string? documentType,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _flowService.GetAllAsync(documentType, status, cancellationToken);
        return Ok(ApiResponse<List<ApprovalFlowDto>>.Ok(result, "ดึงรายการสายการอนุมัติสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalFlowDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ApprovalFlowDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _flowService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<ApprovalFlowDto>.Fail($"ไม่พบสายการอนุมัติรหัส ID {id}"));
        }
        return Ok(ApiResponse<ApprovalFlowDto>.Ok(result, "ดึงข้อมูลสายการอนุมัติสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ApprovalFlowDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<ApprovalFlowDto>>> Create(
        [FromBody] CreateApprovalFlowRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _flowService.CreateAsync(request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<ApprovalFlowDto>.Ok(result, "สร้างสายการอนุมัติสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ApprovalFlowDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalFlowDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ApprovalFlowDto>>> Update(
        long id,
        [FromBody] UpdateApprovalFlowRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _flowService.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<ApprovalFlowDto>.Ok(result, "อัปเดตสายการอนุมัติสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ApprovalFlowDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ApprovalFlowDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(long id, CancellationToken cancellationToken)
    {
        var result = await _flowService.DeleteAsync(id, cancellationToken);
        if (!result)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบสายการอนุมัติรหัส ID {id}"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบสายการอนุมัติสำเร็จ"));
    }
}
