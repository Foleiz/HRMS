using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// คำร้องขอลาหยุดงาน (Leave Request)
/// แมปกับตาราง hrms.leave_request
/// </summary>
public class LeaveRequest : BaseEntity
{
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public long LeaveTypeId { get; set; }
    public DateTime StartDatetime { get; set; }
    public DateTime EndDatetime { get; set; }
    public decimal LeaveHours { get; set; } = 0;
    public decimal LeaveDays { get; set; } = 0;
    public string? Reason { get; set; }
    public string Status { get; set; } = "PENDING"; // DRAFT, PENDING, APPROVED, REJECTED, CANCELLED
    public DateTime? SubmittedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual LeaveType? LeaveType { get; set; }
    public virtual ICollection<LeaveRequestDocument> Documents { get; set; } = new List<LeaveRequestDocument>();
}
