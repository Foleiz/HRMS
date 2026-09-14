using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติความเคลื่อนไหวยอดวันลา (Leave Balance Transaction)
/// แมปกับตาราง hrms.leave_balance_transaction
/// </summary>
public class LeaveBalanceTransaction : BaseEntity
{
    public long LeaveBalanceId { get; set; }
    public string TransactionType { get; set; } = string.Empty; // OPENING, ENTITLEMENT, USED, ADJUSTMENT, REVERSAL, EXPIRED, CARRY_FORWARD
    public decimal Amount { get; set; }
    public string? ReferenceType { get; set; }
    public long? ReferenceId { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long? CreatedByEmployeeId { get; set; }

    // Navigation Properties
    public virtual LeaveBalance? LeaveBalance { get; set; }
    public virtual Employee? CreatedByEmployee { get; set; }
}
