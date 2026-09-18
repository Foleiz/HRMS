using Hrms.Application.Common.Models;
using Hrms.Application.Features.Announcements.DTOs;

namespace Hrms.Application.Features.Announcements.Services;

public interface IAnnouncementService
{
    Task<PagedResult<AnnouncementDto>> GetAdminAnnouncementsAsync(AnnouncementFilterParams filter, CancellationToken cancellationToken = default);
    Task<List<AnnouncementDto>> GetEmployeeFeedAsync(long employeeId, CancellationToken cancellationToken = default);
    Task<AnnouncementDto?> GetByIdAsync(long id, long? currentEmployeeId = null, CancellationToken cancellationToken = default);
    Task<AnnouncementDto> CreateAsync(CreateAnnouncementRequest request, long creatorEmployeeId, CancellationToken cancellationToken = default);
    Task<AnnouncementDto> UpdateAsync(long id, UpdateAnnouncementRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> TogglePinAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> SetPublishStatusAsync(long id, bool publish, CancellationToken cancellationToken = default);
    Task<bool> MarkAsReadAsync(long id, long employeeId, CancellationToken cancellationToken = default);
    Task<AnnouncementReadStatsDto> GetReadStatsAsync(long id, CancellationToken cancellationToken = default);
}
