using Hrms.Application.Features.MasterData.DTOs;

namespace Hrms.Application.Features.MasterData.Services;

/// <summary>
/// พนักงานยื่นเบิกสวัสดิการเอง (ESS) → ผ่านสายการอนุมัติประเภท BENEFIT_CLAIM
/// (ถ้ายังไม่ได้ตั้งสายการอนุมัติ ฝ่ายบุคคลเป็นผู้พิจารณา)
/// </summary>
public interface IBenefitClaimRequestService
{
    Task<BenefitClaimRequestDto> SubmitAsync(SubmitBenefitClaimRequest request, CancellationToken cancellationToken = default);
    Task<List<BenefitClaimRequestDto>> GetForApprovalAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<BenefitClaimRequestDto> ApproveAsync(long id, string? comment, CancellationToken cancellationToken = default);
    Task<BenefitClaimRequestDto> RejectAsync(long id, string reason, CancellationToken cancellationToken = default);
    Task<bool> CancelAsync(long id, CancellationToken cancellationToken = default);
    Task<BenefitClaimAttachment> GetAttachmentAsync(long id, CancellationToken cancellationToken = default);
}
