using System;

namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.work_schedule'
/// จัดเก็บรูปแบบตารางการทำงานหลักขององค์กร (เช่น กะสำนักงานมาตรฐาน 5 วัน, กะทีมซัพพอร์ต 24/7)
/// </summary>
public class WorkSchedule
{
    public long Id { get; set; }
    public string ScheduleCode { get; set; } = string.Empty;
    public string ScheduleName { get; set; } = string.Empty;
    public TimeOnly? WorkStart { get; set; }
    public TimeOnly? WorkEnd { get; set; }
    public int BreakMinutes { get; set; } = 0;
    public int LateGraceMinutes { get; set; } = 0;
    public int EarlyLeaveGraceMinutes { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE"; // 'ACTIVE', 'INACTIVE'
}
