using Hrms.Application.Features.Organization.Dtos;

namespace Hrms.Application.Features.Organization.Services;

public interface ICompanyBankAccountService
{
    Task<List<CompanyBankAccountDto>> GetAllAsync(long? companyId = null, CancellationToken cancellationToken = default);
    Task<CompanyBankAccountDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CompanyBankAccountDto> CreateAsync(CreateCompanyBankAccountDto dto, CancellationToken cancellationToken = default);
    Task<CompanyBankAccountDto> UpdateAsync(long id, UpdateCompanyBankAccountDto dto, CancellationToken cancellationToken = default);
    Task<CompanyBankAccountDto> SetPrimaryAsync(long id, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
