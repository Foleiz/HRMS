namespace Hrms.Application.Features.Shift.Dtos;

public class ShiftDto
{
    public long Id { get; set; }
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty; // HH:mm
    public string EndTime { get; set; } = string.Empty;   // HH:mm
    public bool IsCrossDay { get; set; }
    public int BreakMinutes { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public int LateGraceMinutes { get; set; }
    public int EarlyLeaveGraceMinutes { get; set; }
    public double WorkHours { get; set; }
    public double NetWorkHours { get; set; }
}

public class CreateShiftRequest
{
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty; // HH:mm
    public string EndTime { get; set; } = string.Empty;   // HH:mm
    public bool? IsCrossDay { get; set; }
    public int BreakMinutes { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE";
    public int LateGraceMinutes { get; set; } = 0;
    public int EarlyLeaveGraceMinutes { get; set; } = 0;
}

public class UpdateShiftRequest
{
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public bool? IsCrossDay { get; set; }
    public int BreakMinutes { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE";
    public int LateGraceMinutes { get; set; } = 0;
    public int EarlyLeaveGraceMinutes { get; set; } = 0;
}
