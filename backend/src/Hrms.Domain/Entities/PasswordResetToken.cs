using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// โทเค็นสำหรับการรีเซ็ตรหัสผ่านแบบบริการตนเอง (Self-Service Password Reset)
/// แมปกับตาราง hrms.password_reset_token
/// </summary>
public class PasswordResetToken : BaseEntity
{
    public long UserAccountId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string? OtpCode { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Property
    public virtual UserAccount UserAccount { get; set; } = null!;
}
