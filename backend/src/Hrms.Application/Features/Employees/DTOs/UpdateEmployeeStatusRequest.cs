namespace Hrms.Application.Features.Employees.DTOs;

/// <summary>
/// คำขอเปลี่ยนสถานะการจ้างงานพนักงาน (Quick Status Update)
/// status ที่รองรับ: ACTIVE, PROBATION, RESIGNED, INACTIVE
/// </summary>
public class UpdateEmployeeStatusRequest
{
    /// <summary>สถานะใหม่: ACTIVE | PROBATION | RESIGNED | INACTIVE</summary>
    public string Status { get; set; } = string.Empty;
}
