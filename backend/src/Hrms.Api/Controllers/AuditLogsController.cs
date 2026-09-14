using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Application.Features.Settings.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับตรวจสอบประวัติการใช้งานระบบ (Audit Trail / PDPA Activity Log)
/// </summary>
[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AuditLogDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResult<AuditLogDto>>>> GetAuditLogs(
        [FromQuery] AuditLogQueryFilter filter,
        CancellationToken cancellationToken)
    {
        var result = await _auditLogService.GetLogsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<AuditLogDto>>.Ok(result, "ดึงรายการบันทึกการใช้งานระบบสำเร็จ"));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportAuditLogs(
        [FromQuery] AuditLogQueryFilter filter,
        CancellationToken cancellationToken)
    {
        var bytes = await _auditLogService.ExportLogsCsvAsync(filter, cancellationToken);
        var fileName = $"AuditLogs_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }
}
