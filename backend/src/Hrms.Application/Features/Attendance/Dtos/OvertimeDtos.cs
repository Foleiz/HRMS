using System;

namespace Hrms.Application.Features.Attendance.Dtos;

public class CreateOvertimeRequest
{
    public long EmployeeId { get; set; }
    public string WorkDate { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal OvertimeHours { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ReviewOvertimeRequest
{
    public string Action { get; set; } = "APPROVED"; // APPROVED, REJECTED
    public string? RejectReason { get; set; }
}

public class OvertimeRequestDto
{
    public long Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string WorkDate { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal OvertimeHours { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OvertimeFilterQuery
{
    public long? EmployeeId { get; set; }
    public long? DepartmentId { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }
    public string? Status { get; set; }
    public string? Search { get; set; }
}
