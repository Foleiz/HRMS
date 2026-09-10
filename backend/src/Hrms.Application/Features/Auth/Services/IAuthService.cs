using Hrms.Application.Features.Auth.Dtos;

namespace Hrms.Application.Features.Auth.Services;

/// <summary>
/// อินเทอร์เฟซระบบจัดการการเข้าสู่ระบบ ยืนยันตัวตน และดึงข้อมูลสิทธิ์
/// </summary>
public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<UserInfoDto> GetCurrentUserProfileAsync(long userId, CancellationToken cancellationToken = default);
    Task<SeedPasswordsResultDto> SeedDefaultPasswordsAsync(string defaultPassword, CancellationToken cancellationToken = default);
}
