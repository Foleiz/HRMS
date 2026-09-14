namespace Hrms.Application.Features.Reports.DTOs;

/// <summary>
/// DTO สำหรับอัตรากำลังคนจำแนกตามแผนก
/// </summary>
public class DailyDepartmentHeadcountDto
{
    public long DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public int TotalHeadcount { get; set; }
    public int PresentCount { get; set; }
    public int LateCount { get; set; }
    public int EarlyLeaveCount { get; set; }
    public int AbsentCount { get; set; }
    public double AttendanceRate { get; set; }
}

/// <summary>
/// DTO ภาพรวมอัตรากำลังคนประจำวัน
/// </summary>
public class DailyHeadcountSummaryDto
{
    public DateOnly Date { get; set; }
    public int TotalEmployees { get; set; }
    public int TotalPresent { get; set; }
    public int TotalLate { get; set; }
    public int TotalEarlyLeave { get; set; }
    public int TotalAbsent { get; set; }
    public double OverallAttendanceRate { get; set; }
    public List<DailyDepartmentHeadcountDto> Departments { get; set; } = new();
}

/// <summary>
/// DTO สรุปเวลาและการมาสายของพนักงานรายบุคคลประจำเดือน
/// </summary>
public class MonthlyAttendanceLatenessDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public int TotalWorkDays { get; set; }
    public int PresentDays { get; set; }
    public int LateDays { get; set; }
    public int TotalLateMinutes { get; set; }
    public int EarlyLeaveDays { get; set; }
    public int TotalEarlyLeaveMinutes { get; set; }
    public int AbsentDays { get; set; }
    public double AttendanceRate { get; set; }
}

/// <summary>
/// DTO ภาพรวมรายงานการมาสายและบันทึกเวลาประจำเดือน
/// </summary>
public class MonthlyLatenessReportDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalAuditedEmployees { get; set; }
    public int TotalLateOccurrences { get; set; }
    public int TotalLateMinutes { get; set; }
    public double OverallAttendanceRate { get; set; }
    public List<MonthlyAttendanceLatenessDto> Items { get; set; } = new();
}
