namespace Hrms.Application.Features.Schedule.Dtos;

/// <summary>
/// ข้อมูลรูปแบบตารางการทำงานหลัก
/// </summary>
public class WorkScheduleDto
{
    public long Id { get; set; }
    public string ScheduleCode { get; set; } = string.Empty;
    public string ScheduleName { get; set; } = string.Empty;
    public string? WorkStart { get; set; } // HH:mm
    public string? WorkEnd { get; set; }   // HH:mm
    public int BreakMinutes { get; set; }
    public int LateGraceMinutes { get; set; }
    public int EarlyLeaveGraceMinutes { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public double? WorkHours { get; set; }
    public double? NetWorkHours { get; set; }
}

/// <summary>
/// คำขอสร้างรูปแบบตารางการทำงานใหม่
/// </summary>
public class CreateWorkScheduleRequest
{
    public string ScheduleCode { get; set; } = string.Empty;
    public string ScheduleName { get; set; } = string.Empty;
    public string? WorkStart { get; set; } // HH:mm
    public string? WorkEnd { get; set; }   // HH:mm
    public int BreakMinutes { get; set; } = 0;
    public int LateGraceMinutes { get; set; } = 0;
    public int EarlyLeaveGraceMinutes { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE";
}

/// <summary>
/// คำขอแก้ไขรูปแบบตารางการทำงาน
/// </summary>
public class UpdateWorkScheduleRequest
{
    public string ScheduleName { get; set; } = string.Empty;
    public string? WorkStart { get; set; } // HH:mm
    public string? WorkEnd { get; set; }   // HH:mm
    public int BreakMinutes { get; set; } = 0;
    public int LateGraceMinutes { get; set; } = 0;
    public int EarlyLeaveGraceMinutes { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE";
}
