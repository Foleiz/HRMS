using System;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class AttendanceAdjustment : BaseEntity
{
    public long AttendanceId { get; set; }
    public long RequestedByEmployeeId { get; set; }
    public DateTime? OriginalClockIn { get; set; }
    public DateTime? OriginalClockOut { get; set; }
    public DateTime? AdjustedClockIn { get; set; }
    public DateTime? AdjustedClockOut { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public long? ReviewedByEmployeeId { get; set; }
    public long? ApprovalInstanceId { get; set; }

    // Navigation properties
    public virtual AttendanceDaily AttendanceDaily { get; set; } = null!;
    public virtual Employee RequestedByEmployee { get; set; } = null!;
    public virtual Employee? ReviewedByEmployee { get; set; }
}
