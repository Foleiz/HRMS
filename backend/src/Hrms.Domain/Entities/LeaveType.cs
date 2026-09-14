using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประเภทการลา (Leave Type)
/// แมปกับตาราง hrms.leave_type
/// </summary>
public class LeaveType : BaseEntity
{
    public string LeaveCode { get; set; } = string.Empty;
    public string LeaveName { get; set; } = string.Empty;
    public string QuotaUnit { get; set; } = "DAY"; // DAY, HOUR, MONTH
    public bool IsPaidLeave { get; set; } = true;
    public string? DocumentDescription { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

    // Navigation Properties
    public virtual ICollection<LeavePolicy> LeavePolicies { get; set; } = new List<LeavePolicy>();
    public virtual ICollection<LeaveBalance> LeaveBalances { get; set; } = new List<LeaveBalance>();
    public virtual ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
}
