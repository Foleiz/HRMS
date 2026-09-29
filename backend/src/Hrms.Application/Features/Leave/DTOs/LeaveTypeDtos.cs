namespace Hrms.Application.Features.Leave.DTOs;

public record LeaveTypeDto
{
    public long Id { get; init; }
    public string LeaveCode { get; init; } = string.Empty;
    public string LeaveName { get; init; } = string.Empty;
    public string QuotaUnit { get; init; } = "DAY"; // DAY, HOUR, MONTH
    public bool IsPaidLeave { get; init; } = true;
    public string? DocumentDescription { get; init; }
    public string Status { get; init; } = "ACTIVE";
}

public record CreateLeaveTypeRequest
{
    public string LeaveCode { get; init; } = string.Empty;
    public string LeaveName { get; init; } = string.Empty;
    public string QuotaUnit { get; init; } = "DAY";
    public bool IsPaidLeave { get; init; } = true;
    public string? DocumentDescription { get; init; }
    public string Status { get; init; } = "ACTIVE";
}

public record UpdateLeaveTypeRequest
{
    public string LeaveName { get; init; } = string.Empty;
    public string QuotaUnit { get; init; } = "DAY";
    public bool IsPaidLeave { get; init; } = true;
    public string? DocumentDescription { get; init; }
    public string Status { get; init; } = "ACTIVE";
}
