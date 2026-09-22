namespace Hrms.Application.Features.Approvals.DTOs;

public record ApprovalDelegationDto
{
    public long Id { get; init; }
    public long DelegatorEmployeeId { get; init; }
    public string DelegatorEmployeeCode { get; init; } = string.Empty;
    public string DelegatorEmployeeName { get; init; } = string.Empty;
    public string? DelegatorPosition { get; init; }
    public long DelegateEmployeeId { get; init; }
    public string DelegateEmployeeCode { get; init; } = string.Empty;
    public string DelegateEmployeeName { get; init; } = string.Empty;
    public string? DelegatePosition { get; init; }
    public string? DocumentType { get; init; }
    public string DocumentTypeLabel { get; init; } = "ทุกประเภทเอกสาร";
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public bool IsActiveNow { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record CreateApprovalDelegationRequest
{
    public long DelegatorEmployeeId { get; init; }
    public long DelegateEmployeeId { get; init; }
    public string? DocumentType { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
}

public record UpdateApprovalDelegationRequest
{
    public long DelegateEmployeeId { get; init; }
    public string? DocumentType { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string Status { get; init; } = "ACTIVE";
}

public record WorkflowSimulationRequest
{
    public long EmployeeId { get; init; }
    public string DocumentType { get; init; } = "LEAVE_REQUEST";
    public DateOnly? EffectiveDate { get; init; }
}

public record SimulatedApproverDto
{
    public long EmployeeId { get; init; }
    public string EmployeeCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? PositionName { get; init; }
    public string? DepartmentName { get; init; }
}

public record SimulatedStepDto
{
    public int StepNo { get; init; }
    public string ApproverType { get; init; } = string.Empty;
    public string ApproverTypeLabel { get; init; } = string.Empty;
    public bool IsRequired { get; init; } = true;
    public SimulatedApproverDto? Approver { get; init; }
    public bool HasDelegation { get; init; }
    public SimulatedApproverDto? DelegatedTo { get; init; }
    public string? DelegationPeriod { get; init; }
}

public record WorkflowSimulationResultDto
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public long? FlowId { get; init; }
    public string? FlowCode { get; init; }
    public string? FlowName { get; init; }
    public string DocumentType { get; init; } = string.Empty;
    public SimulatedApproverDto? Requester { get; init; }
    public List<SimulatedStepDto> Steps { get; init; } = new();
}
