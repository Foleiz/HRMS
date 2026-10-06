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
    /// <summary>ลา (อนุมัติแล้ว)</summary>
    public int LeaveCount { get; set; }
    /// <summary>วันหยุด / ไม่ใช่วันทำงานของพนักงาน</summary>
    public int OffCount { get; set; }
    /// <summary>มาทำงาน ÷ (ทั้งหมด − ลา − วันหยุด)</summary>
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
    public int TotalLeave { get; set; }
    public int TotalOff { get; set; }
    /// <summary>จำนวนคนที่ต้องมาทำงานวันนั้น (ทั้งหมด − ลา − วันหยุด)</summary>
    public int TotalExpected { get; set; }
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

/// <summary>จำนวนตามกลุ่ม (ประเภทพนักงาน / ระดับ / เพศ)</summary>
public class NameCountDto
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
}

/// <summary>พนักงาน 1 คนในรายงานพนักงานแยกตามแผนก</summary>
public class DepartmentEmployeeRowDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string PositionName { get; set; } = "-";
    public string EmployeeTypeName { get; set; } = "-";
    public string LevelName { get; set; } = "-";
    public string Gender { get; set; } = "-";
    public DateOnly? StartDate { get; set; }
}

/// <summary>สรุปพนักงานของ 1 แผนก</summary>
public class DepartmentEmployeesDto
{
    public long DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
    /// <summary>อัตรากำลังตามแผน (ผลรวม headcount_plan ของตำแหน่งในแผนก) — null = ยังไม่กำหนด</summary>
    public int? HeadcountPlan { get; set; }
    public int MaleCount { get; set; }
    public int FemaleCount { get; set; }
    public int OtherGenderCount { get; set; }
    /// <summary>เข้าใหม่ในปีปัจจุบัน</summary>
    public int NewHiresThisYear { get; set; }
    public List<NameCountDto> ByEmployeeType { get; set; } = new();
    public List<DepartmentEmployeeRowDto> Employees { get; set; } = new();
}

/// <summary>รายงานพนักงานแยกตามแผนก (ตามขอบเขต "รายงานพนักงานแยกตามแผนก")</summary>
public class EmployeesByDepartmentReportDto
{
    public DateOnly AsOfDate { get; set; }
    public int TotalEmployees { get; set; }
    public int TotalDepartments { get; set; }
    public int? TotalHeadcountPlan { get; set; }
    public int MaleCount { get; set; }
    public int FemaleCount { get; set; }
    public int OtherGenderCount { get; set; }
    public int NewHiresThisYear { get; set; }
    public List<NameCountDto> ByEmployeeType { get; set; } = new();
    public List<NameCountDto> ByLevel { get; set; } = new();
    public List<DepartmentEmployeesDto> Departments { get; set; } = new();
}
