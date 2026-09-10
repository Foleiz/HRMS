using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// บัญชีผู้ใช้งานระบบ (User Account) ผูกเชื่อมกับพนักงาน 1:1
/// แมปกับตาราง hrms.user_account
/// </summary>
public class UserAccount : BaseEntity
{
    public long EmployeeId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE, LOCKED
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
