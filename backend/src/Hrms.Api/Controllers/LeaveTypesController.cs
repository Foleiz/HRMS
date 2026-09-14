using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Application.Features.Leave.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการประเภทการลา (Leave Types)
/// </summary>
[ApiController]
[Route("api/leave-types")]
[Authorize]
public class LeaveTypesController : ControllerBase
{
    private readonly ILeaveTypeService _leaveTypeService;

    public LeaveTypesController(ILeaveTypeService leaveTypeService)
    {
        _leaveTypeService = leaveTypeService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveTypeDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeaveTypeDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await _leaveTypeService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<List<LeaveTypeDto>>.Ok(result, "ดึงรายการประเภทการลาสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeaveTypeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveTypeDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _leaveTypeService.GetByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<LeaveTypeDto>.Fail($"ไม่พบประเภทการลารหัส ID {id}"));
        }
        return Ok(ApiResponse<LeaveTypeDto>.Ok(result, "ดึงข้อมูลประเภทการลาสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<LeaveTypeDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<LeaveTypeDto>>> Create(
        [FromBody] CreateLeaveTypeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _leaveTypeService.CreateAsync(request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<LeaveTypeDto>.Ok(result, "สร้างประเภทการลาสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LeaveTypeDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<LeaveTypeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveTypeDto>>> Update(
        long id,
        [FromBody] UpdateLeaveTypeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _leaveTypeService.UpdateAsync(id, request, cancellationToken);
            return Ok(ApiResponse<LeaveTypeDto>.Ok(result, "อัพเดตประเภทการลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveTypeDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(long id, CancellationToken cancellationToken)
    {
        var result = await _leaveTypeService.DeleteAsync(id, cancellationToken);
        if (!result)
        {
            return NotFound(ApiResponse<bool>.Fail($"ไม่พบประเภทการลารหัส ID {id}"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบประเภทการลาสำเร็จ"));
    }
}
