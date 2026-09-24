using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// การกระทำในขั้นตอนการอนุมัติ (Approval Action)
/// บันทึกประวัติการตัดสินใจของผู้มีสิทธิ์อนุมัติในแต่ละขั้นตอน (Audit Trail)
/// แมปกับตาราง hrms.approval_action
/// </summary>
public class ApprovalAction : BaseEntity
{
    public long ApprovalInstanceId { get; set; }
    public long? ApprovalStepId { get; set; }
    public long? ApproverEmployeeId { get; set; }
    public string ActionDecision { get; set; } = "APPROVE"; // APPROVE, REJECT, RETURN, CANCEL
    public string? Comment { get; set; }
    public DateTime ActionAt { get; set; } = DateTime.UtcNow;
    public long? DelegationId { get; set; }
    public long? ActedForEmployeeId { get; set; }
    public byte[]? SignatureData { get; set; }

    // Navigation Properties
    public virtual ApprovalInstance? ApprovalInstance { get; set; }
    public virtual ApprovalStep? ApprovalStep { get; set; }
    public virtual Employee? ApproverEmployee { get; set; }
    public virtual Employee? ActedForEmployee { get; set; }
}
