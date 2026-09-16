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
    Task<PayrollItemDto> CreatePayrollItemAsync(CreatePayrollItemRequest request, CancellationToken cancellationToken = default);
    Task<PayrollItemDto> UpdatePayrollItemAsync(long id, UpdatePayrollItemRequest request, CancellationToken cancellationToken = default);
    Task DeletePayrollItemAsync(long id, CancellationToken cancellationToken = default);

    // Payroll Processing (Tab 4)
    Task<List<PayrollPeriodDto>> GetPayrollPeriodsAsync(CancellationToken cancellationToken = default);
    Task<PayrollPeriodDto?> GetPayrollPeriodByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodRequest request, CancellationToken cancellationToken = default);
    Task<List<PayrollRecordDto>> GetPayrollsByPeriodIdAsync(long periodId, CancellationToken cancellationToken = default);
    Task<List<PayrollDetailItemDto>> GetPayrollDetailsAsync(long payrollId, CancellationToken cancellationToken = default);
    Task<PayrollPeriodDto> UpdatePayrollPeriodStatusAsync(long periodId, string status, CancellationToken cancellationToken = default);
    Task<List<PayrollRecordDto>> CalculatePayrollForPeriodAsync(long periodId, CancellationToken cancellationToken = default);

    // Bank Transfer, Tax/SSO Reports, Bonus & Payslip
    Task<BankTransferSummaryDto> GetBankTransferSummaryAsync(long periodId, string? bankCode = null, CancellationToken cancellationToken = default);
    Task<byte[]> GenerateBankTransferFileAsync(long periodId, string bankCode, CancellationToken cancellationToken = default);
    Task<TaxSsoSummaryDto> GetTaxSsoSummaryAsync(long periodId, CancellationToken cancellationToken = default);
    Task<List<EmployeeBonusDto>> GetEmployeeBonusesAsync(int? year = null, CancellationToken cancellationToken = default);
    Task<List<EmployeeBonusDto>> CalculateEmployeeBonusesAsync(CalculateBonusRequest request, CancellationToken cancellationToken = default);
}
