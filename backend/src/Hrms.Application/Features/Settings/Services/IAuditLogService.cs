using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;

namespace Hrms.Application.Features.Settings.Services;

/// <summary>
/// Service จัดการประวัติการตรวจสอบการใช้งานระบบ (Audit Trail / Activity Log)
/// </summary>
public interface IAuditLogService
{
    Task LogAsync(
        string action,
        string entityType,
        long? entityId = null,
        string? fieldName = null,
        string? oldValue = null,
        string? newValue = null,
        long? userId = null,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<AuditLogDto>> GetLogsAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default);

    Task<byte[]> ExportLogsCsvAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default);
}
