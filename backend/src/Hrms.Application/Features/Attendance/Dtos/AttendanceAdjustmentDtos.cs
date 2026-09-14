using System;
using System.Collections.Generic;

namespace Hrms.Application.Features.Attendance.Dtos;

public class AttendanceAdjustmentDto
{
    public long Id { get; set; }
    public long AttendanceId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string WorkDate { get; set; } = string.Empty;
    public string? ShiftName { get; set; }
    public string? ShiftCode { get; set; }
    public DateTime? OriginalClockIn { get; set; }
    public DateTime? OriginalClockOut { get; set; }
    public DateTime? AdjustedClockIn { get; set; }
    public DateTime? AdjustedClockOut { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public long? ReviewedByEmployeeId { get; set; }
    public string? ReviewedByEmployeeName { get; set; }
}

public class CreateAttendanceAdjustmentRequest
{
    public long AttendanceId { get; set; }
    public DateTime? AdjustedClockIn { get; set; }
    public DateTime? AdjustedClockOut { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ReviewAttendanceAdjustmentRequest
{
    public string Status { get; set; } = "APPROVED"; // "APPROVED" or "REJECTED"
    public string? ReviewNote { get; set; }
}

public class AdjustmentFilterDto
{
    public string? Status { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public long? DepartmentId { get; set; }
    public long? EmployeeId { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PagedAdjustmentResult
{
    public List<AttendanceAdjustmentDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
