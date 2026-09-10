using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Auth.Dtos;
using Hrms.Application.Features.Auth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับการยืนยันตัวตน เข้าสู่ระบบ และตรวจสอบสิทธิ์ (Authentication & Authorization)
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;

    public AuthController(IAuthService authService, ICurrentUserService currentUserService)
    {
        _authService = authService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน รับ JWT Token
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<LoginResponseDto>.Ok(result, "เข้าสู่ระบบสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลโปรไฟล์ บทบาท และสิทธิ์ของผู้ใช้งานปัจจุบันที่ล็อกอินอยู่
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserInfoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        long? userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse<object>.Fail("ไม่พบข้อมูลผู้ใช้งาน หรือ Token หมดอายุแล้ว"));
        }

        var profile = await _authService.GetCurrentUserProfileAsync(userId.Value, cancellationToken);
        return Ok(ApiResponse<UserInfoDto>.Ok(profile));
    }

    /// <summary>
    /// Utility สำหรับตั้งค่ารหัสผ่านเริ่มต้นสำหรับบัญชีทดสอบทั้งหมดในระบบ (Development Only)
    /// รหัสผ่านเริ่มต้นคือ "Admin@123456"
    /// </summary>
    [HttpPost("seed-passwords")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<SeedPasswordsResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SeedPasswords([FromQuery] string password = "Admin@123456", CancellationToken cancellationToken = default)
    {
        var result = await _authService.SeedDefaultPasswordsAsync(password, cancellationToken);
        return Ok(ApiResponse<SeedPasswordsResultDto>.Ok(result, "ตั้งค่ารหัสผ่านเริ่มต้นสำหรับบัญชีทดสอบเรียบร้อยแล้ว"));
    }
}
