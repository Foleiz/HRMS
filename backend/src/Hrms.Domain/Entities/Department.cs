using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// แผนกงาน (Department Master)
/// สังกัดอยู่ภายใต้ Division และรองรับแผนกย่อย (Parent-Child Hierarchy)
/// แมปกับตาราง hrms.department
/// </summary>
public class Department : BaseEntity
{
    public long DivisionId { get; set; }
    public long? ParentDepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Division Division { get; set; } = null!;
    public virtual Department? ParentDepartment { get; set; }
    public virtual Employee? HeadEmployee { get; set; }
    public virtual ICollection<Department> SubDepartments { get; set; } = new List<Department>();
    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();
}
