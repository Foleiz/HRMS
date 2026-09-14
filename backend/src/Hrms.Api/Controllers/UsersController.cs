using System.Security.Claims;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Application.Features.Settings.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการบัญชีผู้ใช้งานระบบ (User Accounts Management)
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<UserAccountDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResult<UserAccountDto>>>> GetUsers(
        [FromQuery] UserQueryFilter filter,
        CancellationToken cancellationToken)
    {
        var result = await _userService.GetUsersAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<UserAccountDto>>.Ok(result, "ดึงรายการบัญชีผู้ใช้งานสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<UserAccountDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserAccountDto>>> GetUserById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _userService.GetUserByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<UserAccountDto>.Ok(result, "ดึงข้อมูลบัญชีผู้ใช้งานสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<UserAccountDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<UserAccountDto>>> CreateUser(
        [FromBody] CreateUserRequestDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var result = await _userService.CreateUserAsync(request, currentUserId, ipAddress, cancellationToken);
        return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, ApiResponse<UserAccountDto>.Ok(result, "สร้างบัญชีผู้ใช้งานสำเร็จ"));
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<UserAccountDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserAccountDto>>> UpdateUser(
        long id,
        [FromBody] UpdateUserRequestDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var result = await _userService.UpdateUserAsync(id, request, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<UserAccountDto>.Ok(result, "อัปเดตข้อมูลบัญชีผู้ใช้งานสำเร็จ"));
    }

    [HttpPost("{id:long}/reset-password")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<bool>>> ResetPassword(
        long id,
        [FromBody] ResetPasswordRequestDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var success = await _userService.ResetPasswordAsync(id, request, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(success, "รีเซ็ตรหัสผ่านสำเร็จ"));
    }

    [HttpPatch("{id:long}/status")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleStatus(
        long id,
        [FromBody] ToggleStatusRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var success = await _userService.ToggleStatusAsync(id, request.Status, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(success, "เปลี่ยนสถานะผู้ใช้งานสำเร็จ"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(
        long id,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var success = await _userService.DeleteUserAsync(id, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(success, "ลบบัญชีผู้ใช้งานสำเร็จ"));
    }

    private long? GetCurrentUserId()
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (long.TryParse(val, out var id)) return id;
        return null;
    }

    private string? GetClientIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

public class ToggleStatusRequest
{
    public string Status { get; set; } = "ACTIVE";
}
