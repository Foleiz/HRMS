using Hrms.Application.Common.Interfaces;

namespace Hrms.Infrastructure.Security;

/// <summary>
/// ระบบแฮชรหัสผ่านด้วยอัลกอริทึม BCrypt (Work Factor = 11)
/// ปลอดภัยต่อการทำ Brute Force และ Rainbow Table
/// </summary>
public class BcryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 11;

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}
