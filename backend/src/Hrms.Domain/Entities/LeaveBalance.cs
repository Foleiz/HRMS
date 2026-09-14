using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ยอดสิทธิ์วันลาคงเหลือของพนักงาน (Leave Balance)
/// แมปกับตาราง hrms.leave_balance
/// </summary>
public class LeaveBalance : BaseEntity
{
    public long EmployeeId { get; set; }
    public long LeaveTypeId { get; set; }
    public int Year { get; set; }
    public decimal BroughtForwardDays { get; set; } = 0;
    public decimal AnnualQuotaDays { get; set; } = 0;
    public decimal ActiveCarriedForwardDays { get; set; } = 0;
    public decimal UsedDays { get; set; } = 0;
    public decimal AdjustedDays { get; set; } = 0;
    public decimal NetRemainingLeaveDays { get; set; } = 0;
    public DateOnly? CarryForwardExpiry { get; set; }

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual LeaveType? LeaveType { get; set; }
    public virtual ICollection<LeaveBalanceTransaction> Transactions { get; set; } = new List<LeaveBalanceTransaction>();
}
