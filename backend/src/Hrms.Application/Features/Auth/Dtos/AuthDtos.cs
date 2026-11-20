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
    public List<string> RoleNames { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public List<RoleScopeDto> DataScopes { get; set; } = new();
    /// <summary>แผนกปัจจุบันของพนักงาน (จาก employee_assignment) ใช้สำหรับ DEPARTMENT scope</summary>
    public long? DepartmentId { get; set; }
    /// <summary>ฝ่ายปัจจุบันของพนักงาน (จาก employee_assignment) ใช้สำหรับ DIVISION scope</summary>
    public long? DivisionId { get; set; }
    /// <summary>ทีมปัจจุบันของพนักงาน (จาก employee_assignment) ใช้สำหรับ TEAM scope</summary>
    public long? TeamId { get; set; }
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
/// คำขอเปลี่ยนรหัสผ่านตนเอง (Change Password Request)
/// </summary>
public class ChangePasswordRequestDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>
/// คำขอส่งลิงก์/รหัส OTP รีเซ็ตรหัสผ่าน (Forgot Password Request)
/// </summary>
public class ForgotPasswordRequestDto
{
    public string EmailOrUsername { get; set; } = string.Empty;
    public string? ClientOrigin { get; set; }
}

/// <summary>
/// ผลลัพธ์การขอรีเซ็ตรหัสผ่าน
/// </summary>
public class ForgotPasswordResponseDto
{
    public bool Success { get; set; }
    public string MaskedEmail { get; set; } = string.Empty;
    public string EmailOrUsername { get; set; } = string.Empty;
}

/// <summary>
/// คำขอตั้งรหัสผ่านใหม่ด้วย Token หรือ OTP Code (Reset Password Request)
/// </summary>
public class ResetPasswordRequestDto
{
    public string Token { get; set; } = string.Empty;
    public string? EmailOrUsername { get; set; }
    public string? OtpCode { get; set; }
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>
/// ผลการตรวจสอบความถูกต้องของ Reset Token
/// </summary>
public class ValidateResetTokenResponseDto
{
    public bool IsValid { get; set; }
    public string? MaskedEmail { get; set; }
    public string? Username { get; set; }
    public string? ErrorMessage { get; set; }
}
