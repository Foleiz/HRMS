namespace Hrms.Application.Features.Payroll.DTOs;

public class SalaryStructureDto
{
    public long Id { get; set; }
    public long? PositionId { get; set; }
    public string? PositionName { get; set; }
    public long? EmployeeLevelId { get; set; }
    public string? LevelName { get; set; }
    public decimal MinSalary { get; set; }
    public decimal MaxSalary { get; set; }
    public decimal? DefaultSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public decimal? ApprovalLimit { get; set; }
}

public class CreateSalaryStructureRequest
{
    public long? PositionId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public decimal MinSalary { get; set; }
    public decimal MaxSalary { get; set; }
    public decimal? DefaultSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public decimal? ApprovalLimit { get; set; }
}

public class UpdateSalaryStructureRequest
{
    public long? PositionId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public decimal MinSalary { get; set; }
    public decimal MaxSalary { get; set; }
    public decimal? DefaultSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public decimal? ApprovalLimit { get; set; }
}
