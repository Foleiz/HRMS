using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Approvals.Services;

public interface IApprovalDelegationService
{
    Task<List<ApprovalDelegationDto>> GetAllAsync(
        string? status = null,
        long? delegatorId = null,
        long? delegateId = null,
        string? documentType = null,
        CancellationToken cancellationToken = default);

    Task<ApprovalDelegationDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<ApprovalDelegationDto> CreateAsync(CreateApprovalDelegationRequest request, CancellationToken cancellationToken = default);

    Task<ApprovalDelegationDto> UpdateAsync(long id, UpdateApprovalDelegationRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);

    Task<ApprovalDelegation?> GetActiveDelegationAsync(
        long delegatorEmployeeId,
        string documentType,
        DateOnly? date = null,
        CancellationToken cancellationToken = default);
}
