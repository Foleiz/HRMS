using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ทีม / ส่วนงาน (Team Master)
/// สังกัดอยู่ภายใต้แผนก (Department) และมีหัวหน้าทีม (Lead Employee)
/// แมปกับตาราง hrms.team
/// </summary>
public class Team : BaseEntity
{
    public long DepartmentId { get; set; }
    public string TeamCode { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public long? LeadEmployeeId { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Department Department { get; set; } = null!;
    public virtual Employee? LeadEmployee { get; set; }
    public virtual ICollection<EmployeeAssignment> Assignments { get; set; } = new List<EmployeeAssignment>();
}
