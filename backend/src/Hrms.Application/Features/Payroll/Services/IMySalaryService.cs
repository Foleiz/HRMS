using Hrms.Application.Features.Payroll.DTOs;

namespace Hrms.Application.Features.Payroll.Services;

public interface IMySalaryService
{
    Task<MySalaryOverviewDto> GetMySalaryOverviewAsync(int? year, CancellationToken cancellationToken = default);
    Task<MySalaryDetailDto> GetMySalaryDetailAsync(long payrollId, CancellationToken cancellationToken = default);
    Task<SalaryPinStatusDto> GetSalaryPinStatusAsync(CancellationToken cancellationToken = default);
    Task SetupSalaryPinAsync(SetupSalaryPinRequest request, CancellationToken cancellationToken = default);
    Task<bool> VerifySalaryPinAsync(VerifySalaryPinRequest request, CancellationToken cancellationToken = default);
    Task ResetSalaryPinAsync(ResetSalaryPinRequest request, CancellationToken cancellationToken = default);
}
