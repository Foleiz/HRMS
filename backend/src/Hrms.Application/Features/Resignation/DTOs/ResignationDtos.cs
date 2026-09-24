namespace Hrms.Application.Features.Resignation.DTOs;

public class CreateResignationRequestDto
{
    public DateOnly RequestedLastWorkingDate { get; set; }
    public string ReasonCategory { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? HandoverNotes { get; set; }
    public string? ContactAfterResignation { get; set; }
}

public class ResignationRequestDto
{
    public long Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public DateOnly RequestedLastWorkingDate { get; set; }
    public string? Reason { get; set; }
    public string? ReasonCategory { get; set; }
    public string? ReasonDetail { get; set; }
    public string? HandoverNotes { get; set; }
    public string? ContactAfterResignation { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime SubmittedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }
    public int NoticePeriodDays { get; set; }
    public bool CanCancel { get; set; }
    public int? CurrentStepNo { get; set; }
    public int TotalSteps { get; set; }
    public string? CurrentApproverDisplay { get; set; }
    public bool IsMyTurnToApprove { get; set; }
    public bool CanApprove { get; set; }
    public bool CanReject { get; set; }
    public bool HasAlreadyApproved { get; set; }
    public Hrms.Application.Features.Approvals.DTOs.ApprovalTimelineDto? Timeline { get; set; }
}

public class CancelResignationRequestDto
{
    public string? CancelReason { get; set; }
}

public class ApproveResignationRequestPayload
{
    public string? Comment { get; set; }
}

public class RejectResignationRequestPayload
{
    public string Reason { get; set; } = string.Empty;
}
