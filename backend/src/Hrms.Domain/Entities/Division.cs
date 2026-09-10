using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สายงาน / ฝ่ายบริหารหลัก (Division Master)
/// แมปกับตาราง hrms.division
/// </summary>
public class Division : BaseEntity
{
    public long CompanyId { get; set; }
    public string DivisionCode { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Company Company { get; set; } = null!;
    public virtual Employee? HeadEmployee { get; set; }
    public virtual ICollection<Department> Departments { get; set; } = new List<Department>();
}
