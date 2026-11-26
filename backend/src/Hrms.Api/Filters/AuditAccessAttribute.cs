using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Settings.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.Filters;

/// <summary>
/// แอตทริบิวต์สำหรับบันทึก Audit Log เมื่อมีการเปิดดูข้อมูลอ่อนไหว (VIEW)
/// การดาวน์โหลดเอกสารสำคัญ (DOWNLOAD) หรือการส่งออกรายงาน (EXPORT)
/// ทำงานเฉพาะเมื่อคำขอสำเร็จ (HTTP 2xx) พร้อมเก็บ Status Code, ชื่อไฟล์ และจำนวนแถวที่ส่งออกลง Metadata
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class AuditAccessAttribute : TypeFilterAttribute
{
    public AuditAccessAttribute(
        string action,
        string entityType,
        string? idRouteParam = null,
        string? label = null,
        bool idIsEmployee = false)
        : base(typeof(AuditAccessFilter))
    {
        Arguments = new object[]
        {
            action,
            entityType,
            idRouteParam ?? string.Empty,
            label ?? string.Empty,
            idIsEmployee
        };
    }
}

public sealed class AuditAccessFilter : IAsyncActionFilter
{
    public const string LoggedFlagKey = "AuditLoggedByAttribute";
    public const string ExportRowCountKey = "AuditExportRowCount";

    private readonly string _action;
    private readonly string _entityType;
    private readonly string _idRouteParam;
    private readonly string _label;
    private readonly bool _idIsEmployee;
    private readonly IAuditLogService _auditLogService;
    private readonly ICurrentUserService _currentUser;
    private readonly IHrmsDbContext _dbContext;
    private readonly ILogger<AuditAccessFilter> _logger;

    public AuditAccessFilter(
        string action,
        string entityType,
        string idRouteParam,
        string label,
        bool idIsEmployee,
        IAuditLogService auditLogService,
        ICurrentUserService currentUser,
        IHrmsDbContext dbContext,
        ILogger<AuditAccessFilter> logger)
    {
        _action = action;
        _entityType = entityType;
        _idRouteParam = idRouteParam;
        _label = label;
        _idIsEmployee = idIsEmployee;
        _auditLogService = auditLogService;
        _currentUser = currentUser;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        long? entityId = ExtractId(context, _idRouteParam);

        var executed = await next();

        if (executed.Exception != null && !executed.ExceptionHandled)
            return;

        int statusCode = ResolveStatusCode(executed);
        if (statusCode < 200 || statusCode >= 300)
            return;

        try
        {
            var httpContext = context.HttpContext;
            httpContext.Items[LoggedFlagKey] = true;

            string? fileName = null;
            string? contentType = null;
            long? fileSize = null;
            int? exportedRows = httpContext.Items.TryGetValue(ExportRowCountKey, out var rcObj) && rcObj is int rc
                ? rc
                : null;

            if (executed.Result is FileContentResult fcr)
            {
                fileName = string.IsNullOrWhiteSpace(fcr.FileDownloadName)
                    ? ExtractInlineFileName(httpContext.Response.Headers["Content-Disposition"].ToString())
                    : fcr.FileDownloadName;
                contentType = fcr.ContentType;
                fileSize = fcr.FileContents.LongLength;

                // คำนวณจำนวนแถวข้อมูลในไฟล์ CSV อัตโนมัติ (หักบรรทัด Header 1 แถว)
                if (!exportedRows.HasValue &&
                    contentType != null &&
                    contentType.Contains("csv", StringComparison.OrdinalIgnoreCase))
                {
                    exportedRows = CountCsvDataRows(fcr.FileContents);
                }
            }

            long? subjectEmpId = await ResolveSubjectEmployeeIdAsync(entityId, httpContext.RequestAborted);

            // ข้ามการบันทึก VIEW ซ้ำซ้อนเมื่อพนักงานเปิดดูโปรไฟล์ตัวเองปกติ (แต่บันทึกเสมอสำหรับสลิปเงินเดือน/ดาวน์โหลด/ส่งออก)
            if (string.Equals(_action, "VIEW", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(_entityType, "employee", StringComparison.OrdinalIgnoreCase) &&
                subjectEmpId.HasValue &&
                _currentUser.EmployeeId.HasValue &&
                subjectEmpId.Value == _currentUser.EmployeeId.Value)
            {
                return;
            }

            var path = httpContext.Request.Path.Value ?? string.Empty;
            var query = httpContext.Request.QueryString.HasValue ? httpContext.Request.QueryString.Value : null;

            var metadataJson = JsonSerializer.Serialize(new
            {
                statusCode,
                path,
                query,
                label = string.IsNullOrWhiteSpace(_label) ? null : _label,
                fileName,
                contentType,
                fileSize,
                exportedRows
            });

            var newValueJson = fileName != null || exportedRows.HasValue
                ? JsonSerializer.Serialize(new
                {
                    fileName,
                    exportedRows,
                    statusCode
                })
                : JsonSerializer.Serialize(new
                {
                    path,
                    statusCode
                });

            await _auditLogService.LogAsync(
                action: _action,
                entityType: _entityType,
                entityId: entityId,
                fieldName: string.IsNullOrWhiteSpace(_label) ? _action : _label,
                oldValue: null,
                newValue: newValueJson,
                userId: _currentUser.UserId,
                ipAddress: _currentUser.IpAddress,
                userAgent: _currentUser.UserAgent,
                metadata: metadataJson,
                subjectEmployeeId: subjectEmpId,
                cancellationToken: httpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ไม่สามารถบันทึก AuditAccess สำหรับ {Action} {EntityType}: {Message}", _action, _entityType, ex.Message);
        }
    }

    private static long? ExtractId(ActionExecutingContext context, string paramName)
    {
        if (string.IsNullOrWhiteSpace(paramName)) return null;

        if (context.ActionArguments.TryGetValue(paramName, out var val) && val != null &&
            long.TryParse(val.ToString(), out var argId) && argId > 0)
        {
            return argId;
        }

        if (context.RouteData.Values.TryGetValue(paramName, out var rVal) && rVal != null &&
            long.TryParse(rVal.ToString(), out var routeId) && routeId > 0)
        {
            return routeId;
        }

        return null;
    }

    private static int ResolveStatusCode(ActionExecutedContext executed)
    {
        return executed.Result switch
        {
            ObjectResult o => o.StatusCode ?? StatusCodes.Status200OK,
            StatusCodeResult s => s.StatusCode,
            FileResult => StatusCodes.Status200OK,
            JsonResult j => j.StatusCode ?? StatusCodes.Status200OK,
            _ => executed.HttpContext.Response.StatusCode
        };
    }

    private async Task<long?> ResolveSubjectEmployeeIdAsync(long? entityId, CancellationToken cancellationToken)
    {
        if (_idIsEmployee && entityId.HasValue)
            return entityId.Value;

        var type = _entityType.ToLowerInvariant();
        if (type is "my_salary" or "my_payslip")
            return _currentUser.EmployeeId;

        if (!entityId.HasValue)
            return null;

        var id = entityId.Value;
        return type switch
        {
            "employee" => id,
            "payroll" or "payslip" => await _dbContext.Payrolls.AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => (long?)p.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            "employment_contract" => await _dbContext.EmploymentContracts.AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => (long?)c.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            "employee_document" => await _dbContext.EmployeeDocuments.AsNoTracking()
                .Where(d => d.Id == id)
                .Select(d => (long?)d.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            "leave_request" => await _dbContext.LeaveRequests.AsNoTracking()
                .Where(r => r.Id == id)
                .Select(r => (long?)r.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            "employee_benefit_claim" or "benefit_claim" => await _dbContext.EmployeeBenefitClaims.AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => (long?)c.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            "general_request" => await _dbContext.GeneralRequests.AsNoTracking()
                .Where(r => r.Id == id)
                .Select(r => (long?)r.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            "employee_transfer" => await _dbContext.EmployeeTransferRequests.AsNoTracking()
                .Where(t => t.Id == id)
                .Select(t => (long?)t.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken),
            _ => null
        };
    }

    public static int CountCsvDataRows(byte[] csvBytes)
    {
        if (csvBytes.Length == 0) return 0;
        int lines = 0;
        for (int i = 0; i < csvBytes.Length; i++)
        {
            if (csvBytes[i] == (byte)'\n') lines++;
        }
        if (csvBytes[^1] != (byte)'\n') lines++;
        return Math.Max(0, lines - 1);
    }

    private static string? ExtractInlineFileName(string? disposition)
    {
        if (string.IsNullOrWhiteSpace(disposition)) return null;
        const string marker = "filename=\"";
        var idx = disposition.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return null;
        var start = idx + marker.Length;
        var end = disposition.IndexOf('"', start);
        if (end <= start) return null;
        return Uri.UnescapeDataString(disposition[start..end]);
    }
}
