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
    /// <summary>ORG / DIVISION / DEPARTMENT (ใช้กับ ROLE)</summary>
    public string ApproverScope { get; init; } = "ORG";
    /// <summary>HR / SKIP / ESCALATE / WAIT</summary>
    public string FallbackAction { get; init; } = "HR";
    /// <summary>ผู้อนุมัติแทน: null / EMPLOYEE / ROLE</summary>
    public string? DelegateType { get; init; }
    public long? DelegateEmployeeId { get; init; }
    public string? DelegateEmployeeName { get; init; }
    public long? DelegateRoleId { get; init; }
    public string? DelegateRoleName { get; init; }
    public string DelegateScope { get; init; } = "ORG";
    /// <summary>WHEN_ABSENT / ALWAYS</summary>
    public string DelegateMode { get; init; } = "WHEN_ABSENT";
}

/// <summary>ใช้รับข้อมูลขั้นตอนอนุมัติตอนสร้าง/แก้ไข flow (ไม่มี Id เพราะแทนที่ทั้งชุดทุกครั้งที่บันทึก)</summary>
public record ApprovalStepInput
{
    public int StepNo { get; init; }
    public string ApproverType { get; init; } = string.Empty;
    public long? ApproverEmployeeId { get; init; }
    public long? ApproverRoleId { get; init; }
    public bool IsRequired { get; init; } = true;
    /// <summary>ORG / DIVISION / DEPARTMENT (ใช้กับ ROLE) — ไม่ส่ง = ORG</summary>
    public string? ApproverScope { get; init; }
    /// <summary>HR / SKIP / ESCALATE / WAIT — ไม่ส่ง = HR</summary>
    public string? FallbackAction { get; init; }
    /// <summary>ผู้อนุมัติแทน: null (ไม่มี) / EMPLOYEE / ROLE</summary>
    public string? DelegateType { get; init; }
    public long? DelegateEmployeeId { get; init; }
    public long? DelegateRoleId { get; init; }
    public string? DelegateScope { get; init; }
    /// <summary>WHEN_ABSENT (ค่าเริ่มต้น) / ALWAYS</summary>
    public string? DelegateMode { get; init; }
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
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? FlowCode { get; init; }
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
