using Hrms.Application.Features.Transfers.DTOs;

namespace Hrms.Application.Features.Transfers.Services;

public interface IEmployeeTransferService
{
    Task<List<EmployeeTransferDto>> GetAllAsync(
        string? search = null,
        string? transferType = null,
        string? status = null,
        CancellationToken cancellationToken = default);

    Task<TransferStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);

    Task<EmployeeTransferDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<EmployeeTransferDto> CreateAsync(CreateEmployeeTransferRequest request, CancellationToken cancellationToken = default);

    Task<EmployeeTransferDto> ApproveAsync(long id, CancellationToken cancellationToken = default);

    Task<EmployeeTransferDto> RejectAsync(long id, string? reason, CancellationToken cancellationToken = default);

    Task<(byte[] Data, string ContentType, string FileName)?> GetDocumentAsync(long id, CancellationToken cancellationToken = default);

    Task<Hrms.Application.Features.Approvals.DTOs.ApprovalTimelineDto?> GetApprovalTimelineAsync(long id, CancellationToken cancellationToken = default);

    Task<EmployeeTransferDto> ProcessActionAsync(long id, long approverEmployeeId, string actionDecision, string? comment = null, CancellationToken cancellationToken = default);
}
