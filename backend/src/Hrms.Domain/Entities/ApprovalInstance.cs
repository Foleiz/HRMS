using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// รายการคำขออนุมัติในระบบ (Approval Instance)
/// เก็บสถานะการเดินงานจริงของเอกสารแต่ละใบตามขั้นตอนใน ApprovalFlow
/// แมปกับตาราง hrms.approval_instance
/// </summary>
public class ApprovalInstance : BaseEntity
{
    public long ApprovalFlowId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public long SourceDocumentId { get; set; }
    public int? CurrentStepNo { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation Properties
    public virtual ApprovalFlow? ApprovalFlow { get; set; }
    public virtual ICollection<ApprovalAction> Actions { get; set; } = new List<ApprovalAction>();
}
