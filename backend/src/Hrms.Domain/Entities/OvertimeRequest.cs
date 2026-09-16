using System;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// คำร้องขออนุมัติทำงานล่วงเวลา (Overtime Request)
/// แมปกับตาราง hrms.overtime_request
/// </summary>
public class OvertimeRequest : BaseEntity
{
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public DateOnly WorkDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal OvertimeHours { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    public long? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual Employee? Approver { get; set; }
}
