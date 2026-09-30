using Hrms.Application.Features.GeneralRequests.DTOs;

namespace Hrms.Application.Features.GeneralRequests.Services;

public interface IGeneralRequestService
{
    Task<List<GeneralRequestDto>> GetMyRequestsAsync(CancellationToken cancellationToken = default);
    /// <summary>รายการสำหรับผู้อนุมัติ (แอดมินเห็นทั้งหมด / คนอื่นเห็นเฉพาะที่อยู่ในสายอนุมัติ)</summary>
    Task<List<GeneralRequestDto>> GetAllRequestsAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<GeneralRequestDto> CreateRequestAsync(CreateGeneralRequestDto dto, CancellationToken cancellationToken = default);
    Task<GeneralRequestDto> ApproveRequestAsync(long id, string? comment, CancellationToken cancellationToken = default);
    Task<GeneralRequestDto> RejectRequestAsync(long id, string reason, CancellationToken cancellationToken = default);
    Task<bool> CancelRequestAsync(long id, CancellationToken cancellationToken = default);
    Task<GeneralRequestAttachment> GetAttachmentAsync(long id, CancellationToken cancellationToken = default);
}
