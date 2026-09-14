using System.Security.Claims;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Application.Features.Settings.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการบทบาทและสิทธิ์การเข้าถึง (Roles & Permissions Matrix Management)
/// </summary>
[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<RoleSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<RoleSummaryDto>>>> GetAllRoles(CancellationToken cancellationToken)
    {
        var result = await _roleService.GetAllRolesAsync(cancellationToken);
        return Ok(ApiResponse<List<RoleSummaryDto>>.Ok(result, "ดึงรายการบทบาทสำเร็จ"));
    }

    [HttpGet("{id:long}/matrix")]
    [ProducesResponseType(typeof(ApiResponse<RoleDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> GetRoleMatrix(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _roleService.GetRoleMatrixAsync(id, cancellationToken);
        return Ok(ApiResponse<RoleDetailDto>.Ok(result, "ดึงเมทริกซ์สิทธิ์ของบทบาทสำเร็จ"));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<RoleSummaryDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<RoleSummaryDto>>> CreateRole(
        [FromBody] CreateRoleRequestDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var result = await _roleService.CreateRoleAsync(request, currentUserId, ipAddress, cancellationToken);
        return CreatedAtAction(nameof(GetAllRoles), new { id = result.Id }, ApiResponse<RoleSummaryDto>.Ok(result, "สร้างบทบาทใหม่สำเร็จ"));
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<RoleSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<RoleSummaryDto>>> UpdateRole(
        long id,
        [FromBody] UpdateRoleRequestDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var result = await _roleService.UpdateRoleAsync(id, request, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<RoleSummaryDto>.Ok(result, "อัปเดตบทบาทสำเร็จ"));
    }

    [HttpPut("{id:long}/matrix")]
    [ProducesResponseType(typeof(ApiResponse<RoleDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> UpdateRoleMatrix(
        long id,
        [FromBody] UpdateRoleMatrixRequestDto request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var result = await _roleService.UpdateRoleMatrixAsync(id, request, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<RoleDetailDto>.Ok(result, "บันทึกสิทธิ์การใช้งานสำเร็จ"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRole(
        long id,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var ipAddress = GetClientIp();

        var success = await _roleService.DeleteRoleAsync(id, currentUserId, ipAddress, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(success, "ลบบทบาทสำเร็จ"));
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
