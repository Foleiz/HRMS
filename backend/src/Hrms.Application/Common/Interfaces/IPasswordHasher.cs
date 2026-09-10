namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// อินเทอร์เฟซสำหรับการแฮชและตรวจสอบรหัสผ่าน (BCrypt)
/// </summary>
public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}
