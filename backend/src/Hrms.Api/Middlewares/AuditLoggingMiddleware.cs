using System.Text.Json;
using Hrms.Api.Filters;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Settings.Services;

namespace Hrms.Api.Middlewares;

/// <summary>
/// HTTP Layer Middleware สำหรับตรวจจับกิจกรรมสำคัญระดับคำขอ HTTP
/// เช่น การออกจากระบบ (LOGOUT) และการส่งออกไฟล์รายงาน (EXPORT) ที่ไม่ได้ติด [AuditAccess] แยกไว้
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

        // หาก Endpoint นั้นบันทึกผ่าน [AuditAccess] ไปแล้ว ไม่ต้องบันทึกซ้ำ
        if (context.Items.ContainsKey(AuditAccessFilter.LoggedFlagKey))
            return;

        var statusCode = context.Response.StatusCode;

        // 2. ดักจับและบันทึก Audit Log สำหรับคำขอที่สำเร็จ (Status 2xx)
        if (statusCode >= 200 && statusCode < 300)
        {
            try
            {
                // ตรวจจับการออกจากระบบ (LOGOUT)
                if (path.Contains("/api/auth/logout") && method == "POST")
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
                        userAgent: currentUserService.UserAgent,
                        metadata: JsonSerializer.Serialize(new { statusCode, path }),
                        subjectEmployeeId: currentUserService.EmployeeId);

                    _logger.LogInformation("AuditLog: บันทึกการออกจากระบบสำหรับผู้ใช้งาน ID {UserId}", currentUserService.UserId);
                }
                // Fallback ตรวจจับการส่งออกข้อมูล (EXPORT) สำหรับ Endpoint ที่ยังไม่ได้ติด [AuditAccess]
                else if (path.Contains("/export") && (method == "GET" || method == "POST"))
                {
                    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                    var moduleName = segments.Length >= 2 ? segments[1].ToUpperInvariant() : "SYSTEM";
                    int? exportedRows = context.Items.TryGetValue(AuditAccessFilter.ExportRowCountKey, out var rcObj) && rcObj is int rc
                        ? rc
                        : null;

                    var metaJson = JsonSerializer.Serialize(new
                    {
                        statusCode,
                        path,
                        query = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : null,
                        exportedRows
                    });

                    await auditLogService.LogAsync(
                        action: "EXPORT",
                        entityType: moduleName,
                        entityId: null,
                        fieldName: "DataExport",
                        oldValue: null,
                        newValue: metaJson,
                        userId: currentUserService.UserId,
                        ipAddress: currentUserService.IpAddress,
                        userAgent: currentUserService.UserAgent,
                        metadata: metaJson);

                    _logger.LogInformation("AuditLog: บันทึกการส่งออกข้อมูลโมดูล {Module} โดยผู้ใช้งาน ID {UserId}", moduleName, currentUserService.UserId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "เกิดข้อผิดพลาดในการบันทึก AuditLog ผ่าน Middleware: {Message}", ex.Message);
            }
        }
    }
}
