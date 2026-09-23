using System.Security.Claims;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Settings.Services;

namespace Hrms.Api.Middlewares;

/// <summary>
/// HTTP Layer Middleware สำหรับตรวจจับกิจกรรมสำคัญระดับคำขอ HTTP
/// เช่น การเข้าสู่ระบบ (LOGIN), ออกจากระบบ (LOGOUT), การส่งออกไฟล์รายงาน (EXPORT)
/// และบันทึก Metadata ที่ไม่ผ่านการบันทึกลง Entity โดยตรง
/// </summary>
public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLoggingMiddleware> _logger;

    public AuditLoggingMiddleware(RequestDelegate next, ILogger<AuditLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IAuditLogService auditLogService,
        ICurrentUserService currentUserService)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        var method = context.Request.Method.ToUpperInvariant();

        // 1. ประมวลผล Request ต่อไปใน Pipeline
        await _next(context);

        var statusCode = context.Response.StatusCode;

        // 2. ดักจับและบันทึก Audit Log สำหรับคำขอที่สำเร็จ (Status 2xx)
        if (statusCode >= 200 && statusCode < 300)
        {
            try
            {
                // ตรวจจับการเข้าสู่ระบบสำเร็จ (LOGIN)
                if (path.Contains("/api/auth/login") && method == "POST")
                {
                    var userId = currentUserService.UserId;
                    // หากในคำขอแรก Token เพิ่งถูกสร้าง ให้ลองดึงจาก Claims ใน Response หรือ User ถ้ามี
                    if (userId == null && context.User.Identity?.IsAuthenticated == true)
                    {
                        var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                        if (long.TryParse(sub, out var parsedId)) userId = parsedId;
                    }

                    await auditLogService.LogAsync(
                        action: "LOGIN",
                        entityType: "AUTH",
                        entityId: userId,
                        fieldName: "Session",
                        oldValue: null,
                        newValue: "{\"status\": \"SUCCESS\"}",
                        userId: userId,
                        ipAddress: currentUserService.IpAddress,
                        userAgent: currentUserService.UserAgent);

                    _logger.LogInformation("AuditLog: บันทึกการเข้าสู่ระบบสำเร็จสำหรับผู้ใช้งาน ID {UserId}", userId);
                }
                // ตรวจจับการออกจากระบบ (LOGOUT)
                else if (path.Contains("/api/auth/logout") && method == "POST")
                {
                    await auditLogService.LogAsync(
                        action: "LOGOUT",
                        entityType: "AUTH",
                        entityId: currentUserService.UserId,
                        fieldName: "Session",
                        oldValue: "{\"status\": \"ACTIVE\"}",
                        newValue: "{\"status\": \"TERMINATED\"}",
                        userId: currentUserService.UserId,
                        ipAddress: currentUserService.IpAddress,
                        userAgent: currentUserService.UserAgent);

                    _logger.LogInformation("AuditLog: บันทึกการออกจากระบบสำหรับผู้ใช้งาน ID {UserId}", currentUserService.UserId);
                }
                // ตรวจจับการส่งออกข้อมูล (EXPORT)
                else if (path.Contains("/export") && method == "GET")
                {
                    // แยกชื่อโมดูลจากเส้นทาง เช่น /api/audit-logs/export -> audit-logs
                    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                    var moduleName = segments.Length >= 2 ? segments[1].ToUpperInvariant() : "SYSTEM";

                    await auditLogService.LogAsync(
                        action: "EXPORT",
                        entityType: moduleName,
                        entityId: null,
                        fieldName: "DataExport",
                        oldValue: null,
                        newValue: $"{{\"path\": \"{path}\", \"query\": \"{context.Request.QueryString}\"}}",
                        userId: currentUserService.UserId,
                        ipAddress: currentUserService.IpAddress,
                        userAgent: currentUserService.UserAgent);

                    _logger.LogInformation("AuditLog: บันทึกการส่งออกข้อมูลโมดูล {Module} โดยผู้ใช้งาน ID {UserId}", moduleName, currentUserService.UserId);
                }
            }
            catch (Exception ex)
            {
                // ไม่ให้ Audit Log Middleware ทำให้ HTTP Request หลักขัดข้อง
                _logger.LogError(ex, "เกิดข้อผิดพลาดในการบันทึก AuditLog ผ่าน Middleware: {Message}", ex.Message);
            }
        }
    }
}
