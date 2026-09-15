using Hrms.Application.Features.Payroll.DTOs;

namespace Hrms.Application.Features.Payroll.Services;

public interface ISalaryService
{
    // Salary Structures
    Task<List<SalaryStructureDto>> GetAllStructuresAsync(long? positionId, long? levelId, CancellationToken cancellationToken = default);
    Task<SalaryStructureDto> GetStructureByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<SalaryStructureDto> CreateStructureAsync(CreateSalaryStructureRequest request, CancellationToken cancellationToken = default);
    Task<SalaryStructureDto> UpdateStructureAsync(long id, UpdateSalaryStructureRequest request, CancellationToken cancellationToken = default);
    Task DeleteStructureAsync(long id, CancellationToken cancellationToken = default);

    // Tax Brackets
    Task<List<TaxBracketDto>> GetTaxBracketsAsync(CancellationToken cancellationToken = default);
    Task<TaxBracketDto> UpdateTaxBracketAsync(long id, UpdateTaxBracketRequest request, CancellationToken cancellationToken = default);

    // Social Security Rates
    Task<List<SocialSecurityRateDto>> GetSocialSecurityRatesAsync(CancellationToken cancellationToken = default);
    Task<SocialSecurityRateDto> UpdateSocialSecurityRateAsync(long id, UpdateSocialSecurityRateRequest request, CancellationToken cancellationToken = default);

    // Employee Salaries
    Task<List<EmployeeSalaryOverviewDto>> GetEmployeeSalariesOverviewAsync(string? search, long? departmentId, CancellationToken cancellationToken = default);
    Task<List<EmployeeSalaryDto>> GetEmployeeSalaryHistoryAsync(long employeeId, CancellationToken cancellationToken = default);
    Task<EmployeeSalaryDto> AdjustEmployeeSalaryAsync(long employeeId, AdjustEmployeeSalaryRequest request, CancellationToken cancellationToken = default);

    // Overview & Items (Dashboard and Earnings/Deductions)
    Task<PayrollOverviewDto> GetPayrollOverviewAsync(CancellationToken cancellationToken = default);
    Task<List<PayrollItemDto>> GetPayrollItemsAsync(string? itemType, CancellationToken cancellationToken = default);
}
