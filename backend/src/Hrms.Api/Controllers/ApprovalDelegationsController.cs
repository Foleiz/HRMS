using Hrms.Application.Common.Models;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Application.Features.Approvals.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับการมอบอำนาจอนุมัติแทน (Approval Delegation)
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
        [FromQuery] long? delegatorEmployeeId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _delegationService.GetAllAsync(delegatorEmployeeId, status, cancellationToken);
        return Ok(ApiResponse<List<ApprovalDelegationDto>>.Ok(result, "ดึงรายการมอบอำนาจอนุมัติแทนสำเร็จ"));
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
            return StatusCode(StatusCodes.Status201Created, ApiResponse<ApprovalDelegationDto>.Ok(result, "สร้างรายการมอบอำนาจอนุมัติแทนสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ApprovalDelegationDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}/status")]
    [ProducesResponseType(typeof(ApiResponse<ApprovalDelegationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ApprovalDelegationDto>>> SetStatus(
        long id,
        [FromBody] SetDelegationStatusModel model,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _delegationService.SetStatusAsync(id, model.Status, cancellationToken);
            return Ok(ApiResponse<ApprovalDelegationDto>.Ok(result, "อัปเดตสถานะการมอบอำนาจสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ApprovalDelegationDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ApprovalDelegationDto>.Fail(ex.Message));
        }
    }
}

public class SetDelegationStatusModel
{
    public string Status { get; set; } = string.Empty;
}
