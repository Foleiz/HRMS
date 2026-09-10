using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลที่อยู่ของพนักงาน (ทะเบียนบ้าน, ปัจจุบัน, อื่นๆ)
/// แมปกับตาราง hrms.employee_address
/// </summary>
public class EmployeeAddress : BaseEntity
{
    public long EmployeeId { get; set; }
    public string AddressType { get; set; } = "CURRENT"; // REGISTERED, CURRENT, OTHER
    public string? AddressLine { get; set; }
    public string? SubDistrict { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public bool IsCurrent { get; set; } = true;

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
