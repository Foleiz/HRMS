namespace Hrms.Application.Features.Approvals.DTOs;

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
