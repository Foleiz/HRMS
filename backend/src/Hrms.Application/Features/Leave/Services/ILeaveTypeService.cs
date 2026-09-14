using Hrms.Application.Features.Leave.DTOs;

namespace Hrms.Application.Features.Leave.Services;

public interface ILeaveTypeService
{
    Task<List<LeaveTypeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LeaveTypeDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<LeaveTypeDto> CreateAsync(CreateLeaveTypeRequest request, CancellationToken cancellationToken = default);
    Task<LeaveTypeDto> UpdateAsync(long id, UpdateLeaveTypeRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
