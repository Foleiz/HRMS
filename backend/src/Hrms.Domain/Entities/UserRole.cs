namespace Hrms.Domain.Entities;

/// <summary>
/// ตารางความสัมพันธ์ระหว่างผู้ใช้และบทบาท (User - Role Many-to-Many)
/// แมปกับตาราง hrms.user_role
/// </summary>
public class UserRole
{
    public long UserId { get; set; }
    public long RoleId { get; set; }

    // Navigation Properties
    public virtual UserAccount User { get; set; } = null!;
    public virtual Role Role { get; set; } = null!;
}
