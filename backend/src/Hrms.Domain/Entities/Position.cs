using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ตำแหน่งงาน (Position Master)
/// สังกัดแผนก (Department) และระบุระดับขั้น (EmployeeLevel)
/// แมปกับตาราง hrms.position
/// </summary>
public class Position : BaseEntity
{
    public long DepartmentId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public string PositionCode { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Department Department { get; set; } = null!;
    public virtual EmployeeLevel? EmployeeLevel { get; set; }
}
