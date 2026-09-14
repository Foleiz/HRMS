namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// DTO สำหรับแก้ไขสัญญาจ้างงาน
/// </summary>
public class UpdateEmploymentContractRequest
{
    public string? ContractType { get; set; }
    public string? WageType { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? ProbationEndDate { get; set; }
    public DateOnly? ProbationPassedDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public DateOnly? TerminationDate { get; set; }
    public string? TerminationReason { get; set; }
    public string? Status { get; set; }
}
