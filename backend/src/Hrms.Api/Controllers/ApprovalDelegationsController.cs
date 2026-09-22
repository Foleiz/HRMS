using Hrms.Application.Common.Models;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Application.Features.Approvals.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับการมอบอำนาจอนุมัติแทน (Approval Delegation)
/// ใช้งานโดยผู้บริหาร หัวหน้างาน และฝ่ายบุคคล เพื่อมอบอำนาจให้พนักงานคนอื่นอนุมัติเอกสารแทนในช่วงที่ไม่อยู่
/// </summary>
[ApiController]
[Route("api/approval-delegations")]
[Authorize]
public class ApprovalDelegationsController : ControllerBase
{
    private readonly IApprovalDelegationService _delegationService;

    public ApprovalDelegationsController(IApprovalDelegationService delegationService)
    {
        _delegationService = delegationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ApprovalDelegationDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<ApprovalDelegationDto>>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] long? delegatorId,
        [FromQuery] long? delegateId,
        [FromQuery] string? documentType,
        CancellationToken cancellationToken)
    {
        var result = await _delegationService.GetAllAsync(status, delegatorId, delegateId, documentType, cancellationToken);
        return Ok(ApiResponse<List<ApprovalDelegationDto>>.Ok(result, "ดึงรายการการมอบอำนาจอนุมัติแทนสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalDelegationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ApprovalDelegationDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _delegationService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<ApprovalDelegationDto>.Fail($"ไม่พบรายการมอบอำนาจอนุมัติแทนรหัส ID {id}"));
        }
        return Ok(ApiResponse<ApprovalDelegationDto>.Ok(result, "ดึงข้อมูลการมอบอำนาจอนุมัติแทนสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ApprovalDelegationDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<ApprovalDelegationDto>>> Create(
        [FromBody] CreateApprovalDelegationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _delegationService.CreateAsync(request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<ApprovalDelegationDto>.Ok(result, "บันทึกการมอบอำนาจอนุมัติแทนสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ApprovalDelegationDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalDelegationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ApprovalDelegationDto>>> Update(
        long id,
        [FromBody] UpdateApprovalDelegationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _delegationService.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<ApprovalDelegationDto>.Ok(result, "อัปเดตการมอบอำนาจอนุมัติแทนสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ApprovalDelegationDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(long id, CancellationToken cancellationToken)
    {
        var result = await _delegationService.DeleteAsync(id, cancellationToken);
        if (!result)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบรายการมอบอำนาจอนุมัติแทนรหัส ID {id}"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบรายการมอบอำนาจอนุมัติแทนสำเร็จ"));
    }
}
