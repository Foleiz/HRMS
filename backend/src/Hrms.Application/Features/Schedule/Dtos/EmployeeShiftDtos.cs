using System;
using System.Collections.Generic;

namespace Hrms.Application.Features.Schedule.Dtos;

/// <summary>
/// ข้อมูลการมอบหมายกะการทำงานให้พนักงาน
/// </summary>
public class EmployeeShiftDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public long ShiftId { get; set; }
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public bool IsCrossDay { get; set; }
    public string EffectiveFrom { get; set; } = string.Empty; // YYYY-MM-DD
    public string? EffectiveTo { get; set; }                 // YYYY-MM-DD or null
    public List<int> WorkDays { get; set; } = new();         // 1=Mon, ..., 6=Sat, 0=Sun
    public bool IsActive { get; set; }
}

/// <summary>
/// คำขอมอบหมายกะการทำงานให้พนักงานรายบุคคล
/// </summary>
public class AssignEmployeeShiftRequest
{
    public long EmployeeId { get; set; }
    public long ShiftId { get; set; }
    public string EffectiveFrom { get; set; } = string.Empty; // YYYY-MM-DD
    public string? EffectiveTo { get; set; }                 // YYYY-MM-DD
    public List<int>? WorkDays { get; set; }
}

/// <summary>
/// คำขอมอบหมายกะการทำงานแบบกลุ่ม (ตามรายชื่อพนักงานหรือตามแผนก)
/// </summary>
public class BatchAssignEmployeeShiftRequest
{
    public List<long> EmployeeIds { get; set; } = new();
    public long? DepartmentId { get; set; }
    public long ShiftId { get; set; }
    public string EffectiveFrom { get; set; } = string.Empty;
    public string? EffectiveTo { get; set; }
    public List<int>? WorkDays { get; set; }
}

/// <summary>
/// คำขอแก้ไขข้อมูลการมอบหมายกะ
/// </summary>
public class UpdateEmployeeShiftRequest
{
    public long ShiftId { get; set; }
    public string EffectiveFrom { get; set; } = string.Empty;
    public string? EffectiveTo { get; set; }
    public List<int>? WorkDays { get; set; }
}

/// <summary>
/// ข้อมูลกะประจำวันในตารางกะรายเดือน (Monthly Roster)
/// </summary>
public class RosterDayShiftDto
{
    public long ShiftId { get; set; }
    public string ShiftCode { get; set; } = string.Empty;
    public string ShiftName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public bool IsCrossDay { get; set; }
}

/// <summary>
/// ข้อมูลพนักงานและกะรายวันในเดือน
/// </summary>
public class MonthlyRosterItemDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public Dictionary<int, RosterDayShiftDto?> Days { get; set; } = new();
}

/// <summary>
/// ข้อมูลสรุปตารางกะประจำเดือนของพนักงานทุกคน
/// </summary>
public class MonthlyRosterResponse
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int DaysInMonth { get; set; }
    public List<MonthlyRosterItemDto> Employees { get; set; } = new();
}

/// <summary>
/// ข้อมูลประเภทการจ้างงานสำหรับตัวเลือกการกรอง
/// </summary>
public class EmployeeTypeLookupDto
{
    public long Id { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string WageType { get; set; } = string.Empty;
}

/// <summary>
/// ข้อมูลพนักงานสำหรับตัวเลือกการมอบหมายกะ
/// </summary>
public class AssignableEmployeeDto
{
    public long Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public long? DepartmentId { get; set; }
    public string DepartmentName { get; set; } = "-";
    public string PositionName { get; set; } = "-";
    public long? EmployeeTypeId { get; set; }
    public string EmployeeTypeCode { get; set; } = string.Empty;
    public string EmployeeTypeName { get; set; } = "พนักงานประจำ";
}
