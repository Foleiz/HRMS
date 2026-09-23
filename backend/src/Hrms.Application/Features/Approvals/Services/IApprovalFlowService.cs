using Hrms.Application.Features.Approvals.DTOs;

namespace Hrms.Application.Features.Approvals.Services;

public interface IApprovalFlowService
{
    Task<List<ApprovalFlowDto>> GetAllAsync(string? documentType = null, string? status = null, CancellationToken cancellationToken = default);
    Task<ApprovalFlowDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ApprovalFlowDto> CreateAsync(CreateApprovalFlowRequest request, CancellationToken cancellationToken = default);
    Task<ApprovalFlowDto> UpdateAsync(long id, UpdateApprovalFlowRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<WorkflowSimulationResultDto> SimulateWorkflowAsync(WorkflowSimulationRequest request, CancellationToken cancellationToken = default);
}
