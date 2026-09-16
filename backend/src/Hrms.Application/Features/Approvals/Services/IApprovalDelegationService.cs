using Hrms.Application.Features.Approvals.DTOs;

namespace Hrms.Application.Features.Approvals.Services;

public interface IApprovalDelegationService
{
    Task<List<ApprovalDelegationDto>> GetAllAsync(long? delegatorEmployeeId = null, string? status = null, CancellationToken cancellationToken = default);
    Task<ApprovalDelegationDto> CreateAsync(CreateApprovalDelegationRequest request, CancellationToken cancellationToken = default);
    Task<ApprovalDelegationDto> SetStatusAsync(long id, string status, CancellationToken cancellationToken = default);
}
