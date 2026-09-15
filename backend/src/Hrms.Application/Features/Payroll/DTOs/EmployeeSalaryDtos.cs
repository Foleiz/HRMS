namespace Hrms.Application.Features.Payroll.DTOs;

public class EmployeeSalaryDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public decimal BaseSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? Reason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdjustEmployeeSalaryRequest
{
    public decimal BaseSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public string? Reason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
}

public class EmployeeSalaryOverviewDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string? LevelName { get; set; }
    public decimal? CurrentSalary { get; set; }
    public DateOnly? CurrentEffectiveFrom { get; set; }
    public decimal? SalaryStructureMin { get; set; }
    public decimal? SalaryStructureMax { get; set; }
    public int SalaryRecordCount { get; set; }
}
