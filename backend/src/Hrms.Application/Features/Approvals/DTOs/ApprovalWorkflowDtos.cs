namespace Hrms.Application.Features.Approvals.DTOs;

public record WorkflowActionResult
{
    public bool Success { get; init; }
    public string Status { get; init; } = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    public int? CurrentStepNo { get; init; }
    public bool IsCompleted { get; init; }
    public string Message { get; init; } = string.Empty;
}

public record ApprovalTimelineStepDto
{
    public int StepNo { get; init; }
    public string ApproverTitle { get; init; } = string.Empty;
    public string ApproverType { get; init; } = string.Empty;
    public string? DesignatedApproverName { get; init; }
    public string Status { get; init; } = "PENDING_FUTURE"; // COMPLETED, WAITING, PENDING_FUTURE, REJECTED
    public long? ActionByEmployeeId { get; init; }
    public string? ActionByEmployeeName { get; init; }
    /// <summary>ตำแหน่งปัจจุบันของผู้ดำเนินการ (ใช้แสดงในช่องลงนามของเอกสาร)</summary>
    public string? ActionByPositionName { get; init; }
    public string? ActionDecision { get; init; } // APPROVE, REJECT, CANCEL
    public DateTime? ActionAt { get; init; }
    public string? Comment { get; init; }
}

public record ApprovalTimelineDto
{
    public long InstanceId { get; init; }
    public long FlowId { get; init; }
    public string FlowName { get; init; } = string.Empty;
    public string FlowCode { get; init; } = string.Empty;
    public string DocumentType { get; init; } = string.Empty;
    public long SourceDocumentId { get; init; }
    public int? CurrentStepNo { get; init; }
    public int TotalSteps { get; init; }
    public string Status { get; init; } = "PENDING";
    public DateTime CreatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public List<ApprovalTimelineStepDto> Steps { get; init; } = new();
}

public record ProcessApprovalActionRequest
{
    public string Action { get; init; } = "APPROVE"; // APPROVE, REJECT, CANCEL
    public string? Comment { get; init; }
}

public class ApprovalStepSnapshot
{
    public long? StepId { get; set; }
    public int StepNo { get; set; }
    public string ApproverType { get; set; } = string.Empty;
    public long? ApproverRoleId { get; set; }
    public string? ApproverRoleName { get; set; }
    public long? ApproverEmployeeId { get; set; }
    public string? ApproverEmployeeName { get; set; }
    public string? ApproverScope { get; set; }
    public string? FallbackAction { get; set; }
    public string? ApproverTitle { get; set; }
    public bool IsRequired { get; set; } = true;
}

public class ApprovalFlowSnapshot
{
    public long FlowId { get; set; }
    public string FlowName { get; set; } = string.Empty;
    public string FlowCode { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public List<ApprovalStepSnapshot> Steps { get; set; } = new();
}
