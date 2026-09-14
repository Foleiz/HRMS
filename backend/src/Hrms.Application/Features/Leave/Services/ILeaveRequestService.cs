using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Leave.Services;

public interface ILeaveRequestService
{
    Task<(List<LeaveRequestDto> Items, int TotalCount)> GetAllAsync(
        long? employeeId = null,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<LeaveStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);
    Task<LeaveRequestDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto request, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> ApproveAsync(long id, long? approverId = null, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> RejectAsync(long id, string? reason = null, CancellationToken cancellationToken = default);
    Task<LeaveRequestDto> CancelAsync(long id, string? reason = null, long? cancelledBy = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงไฟล์เอกสารแนบ (เช่น ใบรับรองแพทย์) ของคำร้องขอลาตามรหัสเอกสาร
    /// </summary>
    Task<LeaveRequestDocument?> GetDocumentAsync(long requestId, long documentId, CancellationToken cancellationToken = default);
}
