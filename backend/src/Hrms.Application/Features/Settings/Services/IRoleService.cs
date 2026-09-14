using Hrms.Application.Features.Settings.Dtos;

namespace Hrms.Application.Features.Settings.Services;

/// <summary>
/// Service จัดการบทบาทและเมทริกซ์สิทธิ์การใช้งาน (Roles & Permissions Matrix)
/// </summary>
public interface IRoleService
{
    Task<List<RoleSummaryDto>> GetAllRolesAsync(CancellationToken cancellationToken = default);
    Task<RoleDetailDto> GetRoleMatrixAsync(long roleId, CancellationToken cancellationToken = default);
    Task<RoleSummaryDto> CreateRoleAsync(CreateRoleRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<RoleSummaryDto> UpdateRoleAsync(long roleId, UpdateRoleRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<RoleDetailDto> UpdateRoleMatrixAsync(long roleId, UpdateRoleMatrixRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteRoleAsync(long roleId, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default);
}
