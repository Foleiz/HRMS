using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// บทบาทผู้ใช้งานในระบบ (Role) เช่น ADMIN, HR_MGR, DEPT_MGR, STAFF
/// แมปกับตาราง hrms.role
/// </summary>
public class Role : BaseEntity
{
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

    // Navigation Properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public virtual ICollection<RoleDataScope> RoleDataScopes { get; set; } = new List<RoleDataScope>();
}
