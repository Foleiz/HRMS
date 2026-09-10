using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สิทธิ์การเข้าถึงและการกระทำในระบบ (Permission)
/// แมปกับตาราง hrms.permission
/// </summary>
public class Permission : BaseEntity
{
    public string PermissionCode { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Navigation Properties
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public virtual ICollection<RoleDataScope> RoleDataScopes { get; set; } = new List<RoleDataScope>();
}
