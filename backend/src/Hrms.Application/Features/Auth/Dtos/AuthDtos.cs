namespace Hrms.Application.Features.Auth.Dtos;

/// <summary>
/// คำขอเข้าสู่ระบบ (Login Request)
/// </summary>
public class LoginRequestDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// ผลลัพธ์หลังเข้าสู่ระบบสำเร็จ (Login Response)
/// </summary>
public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserInfoDto User { get; set; } = null!;
}

/// <summary>
/// ข้อมูลโปรไฟล์ผู้ใช้งานและสิทธิ์ที่ได้รับ
/// </summary>
public class UserInfoDto
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public List<RoleScopeDto> DataScopes { get; set; } = new();
}

/// <summary>
/// ขอบเขตการมองเห็นข้อมูลสำหรับแต่ละสิทธิ์
/// </summary>
public class RoleScopeDto
{
    public string RoleCode { get; set; } = string.Empty;
    public string PermissionCode { get; set; } = string.Empty;
    public string DataVisibilityScope { get; set; } = string.Empty;
}

/// <summary>
/// ผลลัพธ์การรีเซ็ตรหัสผ่านเริ่มต้นสำหรับการทดสอบ
/// </summary>
public class SeedPasswordsResultDto
{
    public int UpdatedCount { get; set; }
    public string DefaultPassword { get; set; } = string.Empty;
    public List<string> UsersUpdated { get; set; } = new();
}
