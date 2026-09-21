using Hrms.Application.Features.Payroll.DTOs;

namespace Hrms.Application.Features.Payroll.Services;

public interface IMySalaryService
{
    Task<MySalaryOverviewDto> GetMySalaryOverviewAsync(int? year, CancellationToken cancellationToken = default);
    Task<MySalaryDetailDto> GetMySalaryDetailAsync(long payrollId, CancellationToken cancellationToken = default);
}
