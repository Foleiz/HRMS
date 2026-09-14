namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// DTO สำหรับแสดงข้อมูลสัญญาจ้างงาน
/// </summary>
public class EmploymentContractDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionTitle { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string? EmployeeTypeName { get; set; }
    public string ContractType { get; set; } = string.Empty;
    public string ContractTypeDisplay { get; set; } = string.Empty;
    public string? WageType { get; set; }
    public DateOnly StartDate { get; set; }
    public string StartDateDisplay { get; set; } = string.Empty;
    public DateOnly? ProbationEndDate { get; set; }
    public string? ProbationEndDateDisplay { get; set; }
    public DateOnly? ProbationPassedDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public string? ContractEndDateDisplay { get; set; }
    public string? EffectiveEndDateDisplay { get; set; }
    public DateOnly? TerminationDate { get; set; }
    public string? TerminationReason { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusDisplay { get; set; } = string.Empty;
    public long? ApprovalInstanceId { get; set; }
}
