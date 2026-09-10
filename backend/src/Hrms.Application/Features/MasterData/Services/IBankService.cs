using Hrms.Application.Features.MasterData.DTOs;

namespace Hrms.Application.Features.MasterData.Services;

public interface IBankService
{
    Task<List<BankDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<BankDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<BankDto> CreateAsync(CreateBankDto dto, CancellationToken cancellationToken = default);
    Task<BankDto> UpdateAsync(long id, UpdateBankDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
