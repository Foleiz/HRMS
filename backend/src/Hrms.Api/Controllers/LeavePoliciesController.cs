using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Application.Features.Leave.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการนโยบายและสิทธิ์การลา (Leave Policies)
/// </summary>
[ApiController]
[Route("api/leave-policies")]
[Authorize]
public class LeavePoliciesController : ControllerBase
{
    private readonly ILeavePolicyService _policyService;

    public LeavePoliciesController(ILeavePolicyService policyService)
    {
        _policyService = policyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<LeavePolicyDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeavePolicyDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await _policyService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<List<LeavePolicyDto>>.Ok(result, "ดึงรายการนโยบายและสิทธิ์การลาสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeavePolicyDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeavePolicyDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _policyService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<LeavePolicyDto>.Fail($"ไม่พบนโยบายการลารหัส ID {id}"));
        }
        return Ok(ApiResponse<LeavePolicyDto>.Ok(result, "ดึงข้อมูลนโยบายการลาสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<LeavePolicyDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<LeavePolicyDto>>> Create(
        [FromBody] CreateLeavePolicyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _policyService.CreateAsync(request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<LeavePolicyDto>.Ok(result, "สร้างนโยบายการลาสำเร็จ"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LeavePolicyDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeavePolicyDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeavePolicyDto>>> Update(
        long id,
        [FromBody] UpdateLeavePolicyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _policyService.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<LeavePolicyDto>.Ok(result, "อัพเดตนโยบายการลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeavePolicyDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LeavePolicyDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(long id, CancellationToken cancellationToken)
    {
        var result = await _policyService.DeleteAsync(id, cancellationToken);
        if (!result)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบนโยบายการลารหัส ID {id}"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบนโยบายการลาสำเร็จ"));
    }
}
