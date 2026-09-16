namespace Hrms.Application.Features.Approvals.DTOs;

public record ApprovalDelegationDto
{
    public long Id { get; init; }
    public long DelegatorEmployeeId { get; init; }
    public string? DelegatorEmployeeName { get; init; }
    public long DelegateEmployeeId { get; init; }
    public string? DelegateEmployeeName { get; init; }
    public string? DocumentType { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string Status { get; init; } = "ACTIVE";
}

public record CreateApprovalDelegationRequest
{
    public long DelegatorEmployeeId { get; init; }
    public long DelegateEmployeeId { get; init; }
    public string? DocumentType { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
}
