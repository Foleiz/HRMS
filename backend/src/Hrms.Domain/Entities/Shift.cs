using System;

namespace Hrms.Domain.Entities;

public class Shift
{
    public long Id { get; set; }
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsCrossDay { get; set; } = false;
    public int BreakMinutes { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE"; // 'ACTIVE', 'INACTIVE'
    /// <summary>สีที่ใช้แสดงในปฏิทินจัดกะ (#RRGGBB) — null = ใช้สีเริ่มต้น</summary>
    public string? Color { get; set; }
    public int LateGraceMinutes { get; set; } = 0;
    public int EarlyLeaveGraceMinutes { get; set; } = 0;
}
