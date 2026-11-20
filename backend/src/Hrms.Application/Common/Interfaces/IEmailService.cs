namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// อินเทอร์เฟซบริการส่งอีเมลสำหรับระบบ HRMS (เช่น รีเซ็ตรหัสผ่าน, การแจ้งเตือน)
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// ส่งอีเมลลิงก์สำหรับรีเซ็ตรหัสผ่านแบบบริการตนเอง
    /// </summary>
    /// <param name="toEmail">อีเมลปลายทาง</param>
    /// <param name="recipientName">ชื่อผู้รับ</param>
    /// <param name="resetUrl">ลิงก์ URL สำหรับตั้งรหัสผ่านใหม่</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendPasswordResetEmailAsync(string toEmail, string recipientName, string resetUrl, CancellationToken cancellationToken = default);
}
