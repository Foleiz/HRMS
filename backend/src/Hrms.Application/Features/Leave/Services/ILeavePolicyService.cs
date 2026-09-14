using Hrms.Application.Features.Leave.DTOs;

namespace Hrms.Application.Features.Leave.Services;

public interface ILeavePolicyService
{
    Task<List<LeavePolicyDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LeavePolicyDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<LeavePolicyDto> CreateAsync(CreateLeavePolicyRequest request, CancellationToken cancellationToken = default);
    Task<LeavePolicyDto> UpdateAsync(long id, UpdateLeavePolicyRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
