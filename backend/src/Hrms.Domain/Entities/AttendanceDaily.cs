using System;

namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.attendance_daily'
/// บันทึกข้อมูลเวลาเข้า-ออกงานจริง และผลการคำนวณสถิติประจำวัน (มาสาย, ออกก่อน, ขาดงาน, ชั่วโมงทำงาน)
/// </summary>
public class AttendanceDaily
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public DateOnly WorkDate { get; set; }
    public long? ShiftId { get; set; }
    public long? WorkScheduleId { get; set; }
    public DateTime? ScheduledStart { get; set; }
    public DateTime? ScheduledEnd { get; set; }
    public DateTime? ActualIn { get; set; }
    public DateTime? ActualOut { get; set; }
    public int WorkedMinutes { get; set; }
    public int LateMinutes { get; set; }
    public int EarlyLeaveMinutes { get; set; }
    public bool IsAbsent { get; set; }
    public string Status { get; set; } = "PRESENT";

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual Shift? Shift { get; set; }
    public virtual WorkSchedule? WorkSchedule { get; set; }
}
