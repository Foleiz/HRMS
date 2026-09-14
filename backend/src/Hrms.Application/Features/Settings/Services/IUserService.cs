using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;

namespace Hrms.Application.Features.Settings.Services;

/// <summary>
/// Service จัดการข้อมูลบัญชีผู้ใช้งานระบบ (User Accounts)
/// </summary>
public interface IUserService
{
    Task<PagedResult<UserAccountDto>> GetUsersAsync(UserQueryFilter filter, CancellationToken cancellationToken = default);
    Task<UserAccountDto> GetUserByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<UserAccountDto> CreateUserAsync(CreateUserRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<UserAccountDto> UpdateUserAsync(long id, UpdateUserRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(long id, ResetPasswordRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> ToggleStatusAsync(long id, string newStatus, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteUserAsync(long id, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
}
