using System.Security.Claims;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Settings.Services;

namespace Hrms.Api.Middlewares;

/// <summary>
/// Global Audit Log Middleware
/// บันทึก Audit Trail อัตโนมัติ 100% สำหรับทุก API Request ที่มีการเปลี่ยนแปลงข้อมูล (POST, PUT, DELETE, PATCH)
/// โดยไม่ต้องเขียนโค้ดซ้ำซ้อนใน Controller แต่ละเส้น (Enterprise Hybrid Architecture)
/// </summary>
public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLogMiddleware> _logger;

    public AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider)
    {
        var method = context.Request.Method.ToUpperInvariant();
        var path = context.Request.Path.Value ?? string.Empty;

        // ดำเนินการ Request ต่อไปตามปกติ
        await _next(context);

        // ดักจับเฉพาะ Mutating Requests ที่ประมวลผลสำเร็จ (2xx, 3xx)
        if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 400 &&
            (method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH"))
        {
            // ข้าม Path ที่ไม่ต้องการบันทึก เช่น Swagger หรือตัว Audit Logs เอง
            if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/auditlogs", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/audit-logs", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            try
            {
                using var scope = serviceProvider.CreateScope();
                var auditLogService = scope.ServiceProvider.GetService<IAuditLogService>();
                var currentUserService = scope.ServiceProvider.GetService<ICurrentUserService>();

                if (auditLogService == null) return;

                // ตรวจหา UserId
                long? userId = currentUserService?.UserId;
                if (!userId.HasValue)
                {
                    var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                   ?? context.User?.FindFirst("sub")?.Value;
                    if (long.TryParse(userIdClaim, out var parsedUserId))
                    {
                        userId = parsedUserId;
                    }
                }

                // วิเคราะห์ Action จาก HTTP Method
                string action = method switch
                {
                    "POST" when path.Contains("login", StringComparison.OrdinalIgnoreCase) => "LOGIN",
                    "POST" when path.Contains("logout", StringComparison.OrdinalIgnoreCase) => "LOGOUT",
                    "POST" when path.Contains("approve", StringComparison.OrdinalIgnoreCase) => "APPROVE",
                    "POST" when path.Contains("reject", StringComparison.OrdinalIgnoreCase) => "REJECT",
                    "POST" when path.Contains("export", StringComparison.OrdinalIgnoreCase) => "EXPORT",
                    "POST" => "INSERT",
                    "PUT" => "UPDATE",
                    "PATCH" => "UPDATE",
                    "DELETE" => "DELETE",
                    _ => method
                };

                // วิเคราะห์ EntityType และ EntityId จาก URL Route Segments
                var segments = path.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
                string entityType = "SYSTEM";
                long? entityId = null;

                if (segments.Length >= 2 && segments[0].Equals("api", StringComparison.OrdinalIgnoreCase))
                {
                    entityType = segments[1].ToUpperInvariant();
                    // ตรวจสอบว่า Segment ถัดไปเป็น ID ตัวเลขหรือไม่
                    if (segments.Length >= 3 && long.TryParse(segments[2], out var parsedId))
                    {
                        entityId = parsedId;
                    }
                }

                string ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                                   ?? context.Connection.RemoteIpAddress?.ToString()
                                   ?? "Unknown";

                string userAgent = context.Request.Headers["User-Agent"].ToString();

                string detailsJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    method = method,
                    path = path,
                    statusCode = context.Response.StatusCode,
                    queryString = context.Request.QueryString.Value
                });

                await auditLogService.LogAsync(
                    userId: userId,
                    action: action,
                    entityType: entityType,
                    entityId: entityId,
                    fieldName: "API_MUTATION",
                    oldValue: null,
                    newValue: detailsJson,
                    ipAddress: ipAddress,
                    userAgent: userAgent
                );
            }
            catch (Exception ex)
            {
                // ไม่ให้ Error ของ Audit Log ส่งผลกระทบต่อ Response ของผู้ใช้งานหลัก
                _logger.LogWarning(ex, "เกิดข้อผิดพลาดในการบันทึก AuditLog อัตโนมัติ: {Message}", ex.Message);
            }
        }
    }
}
