using System.Security.Claims;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Auth.Dtos;
using Hrms.Application.Features.Auth.Services;
using Microsoft.Extensions.Caching.Memory;

namespace Hrms.Infrastructure.Security;

/// <summary>
/// โหลดสถานะ บทบาท สิทธิ์ และขอบเขตข้อมูลล่าสุดของผู้ใช้ทุกคำขอ (แทนค่าที่ฝังใน token ตอนเข้าระบบ)
/// → ระงับบัญชี / เปลี่ยนบทบาท / แก้ตารางสิทธิ์ มีผลทันที ไม่ต้องรอ token หมดอายุ
/// ใช้ cache สั้นๆ ต่อผู้ใช้ และล้างทั้งหมดเมื่อมีการแก้ผู้ใช้หรือสิทธิ์ (UserAccessVersion)
/// </summary>
public class UserAccessLoader
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);

    private readonly IAuthService _authService;
    private readonly IMemoryCache _cache;

    public UserAccessLoader(IAuthService authService, IMemoryCache cache)
    {
        _authService = authService;
        _cache = cache;
    }

    /// <returns>principal ใหม่จากข้อมูลล่าสุด หรือ null ถ้าบัญชีไม่มีแล้ว/ไม่ได้ใช้งาน</returns>
    public async Task<ClaimsPrincipal?> LoadAsync(long userId, string authenticationType, CancellationToken cancellationToken)
    {
        var info = await GetProfileAsync(userId, cancellationToken);

        if (info == null || !string.Equals(info.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            return null;

        var identity = new ClaimsIdentity(JwtTokenService.BuildClaims(info), authenticationType, "unique_name", ClaimTypes.Role);
        return new ClaimsPrincipal(identity);
    }

    /// <summary>ข้อมูลผู้ใช้ล่าสุดจาก cache เดียวกับที่ใช้ตรวจสิทธิ์ (ใช้ซ้ำใน GET /auth/me เพื่อไม่ต้อง query ซ้ำทุกหน้า)</summary>
    public async Task<UserInfoDto?> GetProfileAsync(long userId, CancellationToken cancellationToken)
    {
        var key = $"user-access:{UserAccessVersion.Current}:{userId}";
        if (!_cache.TryGetValue(key, out UserInfoDto? info))
        {
            try
            {
                info = await _authService.GetCurrentUserProfileAsync(userId, cancellationToken);
            }
            catch (NotFoundException)
            {
                info = null;
            }
            _cache.Set(key, info, CacheDuration);
        }
        return info;
    }
}
