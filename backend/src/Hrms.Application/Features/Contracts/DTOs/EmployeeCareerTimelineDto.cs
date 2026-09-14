namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// DTO สำหรับแสดงไทม์ไลน์ตำแหน่งงานและประวัติการโอนย้าย/เลื่อนขั้นรายบุคคล
/// </summary>
public class EmployeeCareerTimelineDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? ManagerName { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsCurrent { get; set; }
    public string DateRangeDisplay { get; set; } = string.Empty;
    public string HierarchyDisplay { get; set; } = string.Empty;
}
