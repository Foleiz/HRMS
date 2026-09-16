using System;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สรุปสถิติเวลาทำงานรายเดือนของพนักงาน (Monthly Attendance Summary)
/// รวบยอดจากตาราง hrms.attendance_daily และใบลา hrms.leave_request
/// เพื่อใช้ตรวจสอบและส่งต่อให้ระบบคำนวณเงินเดือน (Payroll)
/// แมปกับตาราง hrms.attendance_monthly_summary
/// </summary>
public class AttendanceMonthlySummary : BaseEntity
{
    public long EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalWorkDays { get; set; }
    public int TotalActualWorkDays { get; set; }
    public int TotalWorkedMinutes { get; set; }
    public int TotalLateDays { get; set; }
    public int TotalLateMinutes { get; set; }
    public int TotalEarlyLeaveDays { get; set; }
    public int TotalEarlyLeaveMinutes { get; set; }
    public int TotalAbsentDays { get; set; }
    public decimal TotalLeaveDays { get; set; }
    public decimal TotalOvertimeHours { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
}
