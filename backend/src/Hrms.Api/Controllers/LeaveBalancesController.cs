using System.Security.Claims;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Application.Features.Leave.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการยอดสิทธิ์วันลาคงเหลือของพนักงาน (Leave Balances & Transactions)
/// </summary>
[ApiController]
[Route("api/leave-balances")]
[Authorize]
public class LeaveBalancesController : ControllerBase
{
    private readonly ILeaveBalanceService _balanceService;

    public LeaveBalancesController(ILeaveBalanceService balanceService)
    {
        _balanceService = balanceService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveBalanceDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeaveBalanceDto>>>> GetAll(
        [FromQuery] long? employeeId,
        [FromQuery] int? year,
        [FromQuery] long? leaveTypeId,
        CancellationToken cancellationToken)
    {
        var result = await _balanceService.GetAllAsync(employeeId, year, leaveTypeId, cancellationToken);
        return Ok(ApiResponse<List<LeaveBalanceDto>>.Ok(result, "ดึงรายการยอดสิทธิ์วันลาสำเร็จ"));
    }

    [HttpGet("{id:long}/transactions")]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveBalanceTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeaveBalanceTransactionDto>>>> GetTransactions(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _balanceService.GetTransactionsAsync(id, cancellationToken);
        return Ok(ApiResponse<List<LeaveBalanceTransactionDto>>.Ok(result, "ดึงประวัติความเคลื่อนไหวยอดวันลาสำเร็จ"));
    }

    [HttpPost("adjust")]
    [ProducesResponseType(typeof(ApiResponse<LeaveBalanceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveBalanceDto>>> Adjust(
        [FromBody] LeaveBalanceAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var empIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            long.TryParse(empIdStr, out var empId);

            var result = await _balanceService.AdjustBalanceAsync(request, empId > 0 ? empId : null, cancellationToken);
            return Ok(ApiResponse<LeaveBalanceDto>.Ok(result, "ปรับยอดวันลาสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<LeaveBalanceDto>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<LeaveBalanceDto>.Fail(ex.Message));
        }
    }

    [HttpPost("initialize-year")]
    [ProducesResponseType(typeof(ApiResponse<InitializeYearBalanceResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<InitializeYearBalanceResultDto>>> InitializeYear(
        [FromBody] InitializeYearBalanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var empIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            long.TryParse(empIdStr, out var empId);

            var result = await _balanceService.InitializeYearBalanceAsync(request.TargetYear, empId > 0 ? empId : null, cancellationToken);
            return Ok(ApiResponse<InitializeYearBalanceResultDto>.Ok(result, result.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<InitializeYearBalanceResultDto>.Fail(ex.Message));
        }
    }
}
