using System.Security.Claims;
using Hrms.Api.Filters;
using Hrms.Application.Common.Interfaces;
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
    private readonly ICurrentUserService _currentUserService;

    public LeaveBalancesController(
        ILeaveBalanceService balanceService,
        ICurrentUserService currentUserService)
    {
        _balanceService = balanceService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// ดึงข้อมูลสรุปยอดวันลาคงเหลือ 8 หมวดหมู่ประจำตัวพนักงานสำหรับหน้า ESS
    /// </summary>
    [HttpGet("my-summary")]
    [SelfOrPermission("employeeId", "LEAVE_BALANCE_VIEW")]
    [ProducesResponseType(typeof(ApiResponse<MyLeaveSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<MyLeaveSummaryDto>>> GetMySummary(
        [FromQuery] int? year,
        [FromQuery] long? employeeId,
        CancellationToken cancellationToken)
    {
        long targetEmpId = employeeId ?? _currentUserService.EmployeeId ?? 0;
        if (targetEmpId <= 0)
        {
            return BadRequest(ApiResponse<MyLeaveSummaryDto>.Fail("ไม่พบข้อมูลพนักงานสำหรับบัญชีผู้ใช้นี้"));
        }

        int targetYear = year ?? DateTime.Now.Year;

        var result = await _balanceService.GetMySummaryAsync(targetEmpId, targetYear, cancellationToken);
        return Ok(ApiResponse<MyLeaveSummaryDto>.Ok(result, "ดึงข้อมูลสรุปยอดวันลาคงเหลือสำเร็จ"));
    }

    [HttpGet]
    [SelfOrPermission("employeeId", "LEAVE_BALANCE_VIEW")]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveBalanceDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeaveBalanceDto>>>> GetAll(
        [FromQuery] long? employeeId,
        [FromQuery] int? year,
        [FromQuery] long? leaveTypeId,
        CancellationToken cancellationToken)
    {
        // หากผู้ใช้ไม่มีสิทธิ์ LEAVE_BALANCE_VIEW และไม่ใช่ Admin ให้ดึงได้เฉพาะยอดวันลาของตนเองเท่านั้น
        long? targetEmpId = employeeId;
        bool hasViewAllPerm = _currentUserService.HasRole("ADMIN") ||
                              _currentUserService.HasRole("SYSTEM_SUPER") ||
                              _currentUserService.HasPermission("LEAVE_BALANCE_VIEW") ||
                              _currentUserService.HasPermission("LEAVE_BALANCE");

        if (!hasViewAllPerm)
        {
            if (!_currentUserService.EmployeeId.HasValue)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<LeaveBalanceDto>>.Fail("คุณไม่มีสิทธิ์ในการดำเนินการนี้ (ต้องการสิทธิ์: LEAVE_BALANCE_VIEW)"));
            }
            targetEmpId = _currentUserService.EmployeeId.Value;
        }

        var result = await _balanceService.GetAllAsync(targetEmpId, year, leaveTypeId, cancellationToken);
        return Ok(ApiResponse<List<LeaveBalanceDto>>.Ok(result, "ดึงรายการยอดสิทธิ์วันลาสำเร็จ"));
    }

    [HttpGet("{id:long}/transactions")]
    [RequirePermission("LEAVE_BALANCE_VIEW")]
    [ProducesResponseType(typeof(ApiResponse<List<LeaveBalanceTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LeaveBalanceTransactionDto>>>> GetTransactions(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _balanceService.GetTransactionsAsync(id, cancellationToken);
        return Ok(ApiResponse<List<LeaveBalanceTransactionDto>>.Ok(result, "ดึงประวัติความเคลื่อนไหวยอดวันลาสำเร็จ"));
    }

    [HttpPost("adjust")]
    [RequirePermission("LEAVE_BALANCE_EDIT")]
    [ProducesResponseType(typeof(ApiResponse<LeaveBalanceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<LeaveBalanceDto>>> Adjust(
        [FromBody] LeaveBalanceAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var empIdStr = User.FindFirstValue("employee_id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
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

}
