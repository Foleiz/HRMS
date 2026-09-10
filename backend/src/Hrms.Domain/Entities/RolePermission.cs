namespace Hrms.Domain.Entities;

/// <summary>
/// ตารางความสัมพันธ์ระหว่างบทบาทและสิทธิ์ (Role - Permission Many-to-Many)
/// แมปกับตาราง hrms.role_permission
/// </summary>
public class RolePermission
{
    public long RoleId { get; set; }
    public long PermissionId { get; set; }

    // Navigation Properties
    public virtual Role Role { get; set; } = null!;
    public virtual Permission Permission { get; set; } = null!;
}
