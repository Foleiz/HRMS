using System;
using System.Collections.Generic;

namespace Hrms.Application.Features.Attendance.Dtos;

/// <summary>
/// DTO สำหรับแสดงข้อมูลบันทึกเวลาเข้า-ออกงานประจำวันของพนักงาน
/// </summary>
public class AttendanceDailyDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string WorkDate { get; set; } = string.Empty;
    public long? ShiftId { get; set; }
    public string? ShiftName { get; set; }
    public string? ShiftCode { get; set; }
    public string? ShiftTimeWindow { get; set; }
    public DateTime? ScheduledStart { get; set; }
    public DateTime? ScheduledEnd { get; set; }
    public DateTime? ActualIn { get; set; }
    public DateTime? ActualOut { get; set; }
    public int WorkedMinutes { get; set; }
    public int LateMinutes { get; set; }
    public int EarlyLeaveMinutes { get; set; }
    public bool IsAbsent { get; set; }
    public string Status { get; set; } = "PRESENT";
    public string StatusText { get; set; } = "ตรงเวลา";
}

/// <summary>
/// DTO สรุปสถิติการเข้างานประจำวัน
/// </summary>
public class DailyAttendanceSummaryDto
{
    public string Date { get; set; } = string.Empty;
    public int TotalEmployees { get; set; }
    public int PresentCount { get; set; }
    public int LateCount { get; set; }
    public int EarlyLeaveCount { get; set; }
    public int AbsentCount { get; set; }
    public int HolidayOrOffCount { get; set; }
    public double AttendanceRate { get; set; }
}

/// <summary>
/// Request สำรับการลงเวลาเข้างาน (Clock In)
/// </summary>
public class ClockInRequest
{
    public long EmployeeId { get; set; }
    public DateTime? ClockInTime { get; set; }
    public string? WorkDate { get; set; }
}

/// <summary>
/// Request สำหรับการลงเวลาออกงาน (Clock Out)
/// </summary>
public class ClockOutRequest
{
    public long EmployeeId { get; set; }
    public DateTime? ClockOutTime { get; set; }
    public string? WorkDate { get; set; }
}

/// <summary>
/// Request สำหรับฝ่ายบุคคลแก้ไขเวลาเข้า-ออกงานด้วยตนเอง
/// </summary>
public class UpdateAttendanceRequest
{
    public long? ShiftId { get; set; }
    public DateTime? ActualIn { get; set; }
    public DateTime? ActualOut { get; set; }
    public string? Status { get; set; }
    public bool? IsAbsent { get; set; }
}

/// <summary>
/// Filter สำหรับการค้นหาและกรองข้อมูลบันทึกเวลาประจำวัน
/// </summary>
public class DailyAttendanceFilterQuery
{
    public string? Date { get; set; }
    public long? DepartmentId { get; set; }
    public string? Status { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// DTO สำหรับข้อมูล Paged Result
/// </summary>
public class PagedAttendanceResult
{
    public List<AttendanceDailyDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
