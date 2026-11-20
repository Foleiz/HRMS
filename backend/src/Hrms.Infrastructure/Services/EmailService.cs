using Hrms.Application.Common.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// บริการส่งอีเมลสำหรับระบบ HRMS ผ่าน SMTP (รองรับ Gmail App Password และ SMTP มาตรฐาน)
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string recipientName, string resetUrl, CancellationToken cancellationToken = default)
    {
        var smtpHost = _configuration["Smtp:Host"] ?? "smtp.gmail.com";
        var smtpPort = int.TryParse(_configuration["Smtp:Port"], out var port) ? port : 587;
        var senderEmail = _configuration["Smtp:SenderEmail"] ?? "filmza2543.01@gmail.com";
        var senderName = _configuration["Smtp:SenderName"] ?? "ระบบ HRMS";
        var appPassword = _configuration["Smtp:AppPassword"]?.Replace(" ", "") ?? "";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(recipientName, toEmail));
        message.Subject = "คำขอตั้งรหัสผ่านใหม่ - ระบบบริหารงานบุคคล (HRMS)";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
<!DOCTYPE html>
<html lang=""th"">
<head>
  <meta charset=""UTF-8"">
  <style>
    body {{ font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
    .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
    .header p {{ margin: 6px 0 0; font-size: 14px; opacity: 0.9; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 15px; }}
    .greeting {{ font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }}
    .btn-wrapper {{ text-align: center; margin: 30px 0; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }}
    .note {{ background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #64748b; margin-top: 24px; }}
    .footer {{ background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""header"">
      <h1>ระบบบริหารงานบุคคล (HRMS)</h1>
      <p>คำขอตั้งรหัสผ่านใหม่ (Self-Service Password Reset)</p>
    </div>
    <div class=""content"">
      <div class=""greeting"">เรียนคุณ {recipientName},</div>
      <p>ระบบได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีผู้ใช้งานของคุณ หากคุณเป็นผู้ส่งคำขอนี้ โปรดคลิกที่ปุ่มด้านล่างเพื่อดำเนินการตั้งรหัสผ่านใหม่:</p>
      <div class=""btn-wrapper"">
        <a href=""{resetUrl}"" class=""btn"" target=""_blank"">ตั้งรหัสผ่านใหม่</a>
      </div>
      <p style=""font-size: 13px; color: #64748b;"">หรือหากปุ่มด้านบนไม่สามารถคลิกได้ สามารถคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์ของคุณ:<br><a href=""{resetUrl}"" style=""color: #2563eb; word-break: break-all;"">{resetUrl}</a></p>
      <div class=""note"">
        <strong>⚠️ ข้อควรระวังด้านความปลอดภัย:</strong>
        <ul style=""margin: 6px 0 0; padding-left: 18px;"">
          <li>ลิงก์นี้มีอายุการใช้งาน <strong>15 นาที</strong> และใช้ได้เพียงครั้งเดียวเท่านั้น</li>
          <li>หากคุณไม่ได้เป็นผู้ขอตั้งรหัสผ่านใหม่ โปรดละเว้นอีเมลฉบับนี้ รหัสผ่านปัจจุบันของคุณจะยังคงปลอดภัย</li>
        </ul>
      </div>
    </div>
    <div class=""footer"">
      อีเมลนี้เป็นข้อความอัตโนมัติจากระบบ HRMS กรุณาอย่าตอบกลับอีเมลนี้
    </div>
  </div>
</body>
</html>",
            TextBody = $"เรียนคุณ {recipientName},\n\nระบบได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี HRMS ของคุณ\n\nโปรดไปที่ลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 15 นาที):\n{resetUrl}\n\nหากคุณไม่ได้เป็นผู้ส่งคำขอ โปรดละเว้นอีเมลฉบับนี้"
        };

        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, cancellationToken);
            await client.AuthenticateAsync(senderEmail, appPassword, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
            _logger.LogInformation("Password reset email successfully sent to {ToEmail}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {ToEmail}", toEmail);
            throw new InvalidOperationException($"ไม่สามารถส่งอีเมลไปยัง {toEmail} ได้: {ex.Message}", ex);
        }
    }
}
