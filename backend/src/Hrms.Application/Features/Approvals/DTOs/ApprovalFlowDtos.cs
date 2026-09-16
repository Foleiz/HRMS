namespace Hrms.Application.Features.Approvals.DTOs;

public record ApprovalStepDto
{
    public long Id { get; init; }
    public int StepNo { get; init; }
    public string ApproverType { get; init; } = string.Empty;
    public long? ApproverEmployeeId { get; init; }
    public string? ApproverEmployeeName { get; init; }
    public long? ApproverRoleId { get; init; }
    public string? ApproverRoleName { get; init; }
    public bool IsRequired { get; init; } = true;
}

/// <summary>ใช้รับข้อมูลขั้นตอนอนุมัติตอนสร้าง/แก้ไข flow (ไม่มี Id เพราะแทนที่ทั้งชุดทุกครั้งที่บันทึก)</summary>
public record ApprovalStepInput
{
    public int StepNo { get; init; }
    public string ApproverType { get; init; } = string.Empty;
    public long? ApproverEmployeeId { get; init; }
    public long? ApproverRoleId { get; init; }
    public bool IsRequired { get; init; } = true;
}

public record ApprovalFlowDto
{
    public long Id { get; init; }
    public string FlowCode { get; init; } = string.Empty;
    public string FlowName { get; init; } = string.Empty;
    public string DocumentType { get; init; } = string.Empty;
    public long? DepartmentId { get; init; }
    public string? DepartmentName { get; init; }
    public long? LevelId { get; init; }
    public string? LevelName { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public DateTime CreatedAt { get; init; }
    public List<ApprovalStepDto> Steps { get; init; } = new();
}

public record CreateApprovalFlowRequest
{
    public string FlowCode { get; init; } = string.Empty;
    public string FlowName { get; init; } = string.Empty;
    public string DocumentType { get; init; } = string.Empty;
    public long? DepartmentId { get; init; }
    public long? LevelId { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public List<ApprovalStepInput> Steps { get; init; } = new();
}

public record UpdateApprovalFlowRequest
{
    public string FlowName { get; init; } = string.Empty;
    public string DocumentType { get; init; } = string.Empty;
    public long? DepartmentId { get; init; }
    public long? LevelId { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public List<ApprovalStepInput> Steps { get; init; } = new();
}
