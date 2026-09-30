using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// บันทึกการปิดยอดวันลาสิ้นปี (ปีละครั้ง) — แมปกับตาราง hrms.leave_year_closing
/// </summary>
public class LeaveYearClosing : BaseEntity
{
    public int Year { get; set; }
    public DateTime ClosedAt { get; set; } = DateTime.UtcNow;
    public long? ClosedByEmployeeId { get; set; }
    public int BalanceCount { get; set; }
    public decimal TotalCarriedDays { get; set; }
    public decimal TotalForfeitedDays { get; set; }
    public string? Note { get; set; }

    public virtual Employee? ClosedByEmployee { get; set; }
}
