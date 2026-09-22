using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// คำร้องขอลาออกจากงาน (Resignation Request)
/// แมปกับตาราง hrms.resignation_request
/// </summary>
public class ResignationRequest : BaseEntity
{
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public DateOnly RequestedLastWorkingDate { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public long? ResultingContractId { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual Employee? ApprovedByEmployee { get; set; }
    public virtual EmploymentContract? ResultingContract { get; set; }
    public virtual ApprovalInstance? ApprovalInstance { get; set; }
}
