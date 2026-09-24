using Hrms.Application.Features.Resignation.DTOs;

namespace Hrms.Application.Features.Resignation.Services;

public interface IResignationService
{
    Task<List<ResignationRequestDto>> GetMyRequestsAsync(CancellationToken cancellationToken = default);
    Task<List<ResignationRequestDto>> GetAllRequestsAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<ResignationRequestDto?> GetRequestByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<ResignationRequestDto> CreateRequestAsync(CreateResignationRequestDto dto, CancellationToken cancellationToken = default);
    Task<bool> CancelRequestAsync(long id, string? reason = null, CancellationToken cancellationToken = default);
    Task<ResignationRequestDto> ApproveRequestAsync(long id, long approverId, string? comment = null, CancellationToken cancellationToken = default);
    Task<ResignationRequestDto> RejectRequestAsync(long id, long approverId, string reason, CancellationToken cancellationToken = default);
}
