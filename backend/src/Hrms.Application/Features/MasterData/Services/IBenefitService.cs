using Hrms.Application.Features.MasterData.DTOs;

namespace Hrms.Application.Features.MasterData.Services;

public interface IBenefitService
{
    Task<List<BenefitItemDto>> GetAllAsync(string? category = null, string? status = null, CancellationToken cancellationToken = default);
    Task<BenefitItemDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<BenefitItemDto> CreateAsync(CreateBenefitItemRequest request, CancellationToken cancellationToken = default);
    Task<BenefitItemDto> UpdateAsync(long id, UpdateBenefitItemRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);
}
