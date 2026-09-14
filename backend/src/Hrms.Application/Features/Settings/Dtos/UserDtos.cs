namespace Hrms.Application.Features.Settings.Dtos;

/// <summary>
/// ข้อมูลสรุปบัญชีผู้ใช้งานระบบ
/// </summary>
public class UserAccountDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? CorporateEmail { get; set; }
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE, LOCKED
    public DateTime? LastLoginAt { get; set; }
    public List<UserRoleItemDto> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserRoleItemDto
{
    public long RoleId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsPrimary { get; set; }
}

/// <summary>
/// คำขอสร้างบัญชีผู้ใช้งานใหม่
/// </summary>
public class CreateUserRequestDto
{
    public long EmployeeId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? CorporateEmail { get; set; }
    public List<long> RoleIds { get; set; } = new();
}

/// <summary>
/// คำขอแก้ไขข้อมูลบัญชีผู้ใช้งาน
/// </summary>
public class UpdateUserRequestDto
{
    public string? CorporateEmail { get; set; }
    public string? Status { get; set; }
    public List<long> RoleIds { get; set; } = new();
}

/// <summary>
/// คำขอรีเซ็ตรหัสผ่าน
/// </summary>
public class ResetPasswordRequestDto
{
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>
/// ตัวกรองสำหรับสืบค้นผู้ใช้งาน
/// </summary>
public class UserQueryFilter
{
    public string? Search { get; set; }
    public long? RoleId { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
