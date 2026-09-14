using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Settings.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IHrmsDbContext _dbContext;

    public AuditLogService(IHrmsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        long? entityId = null,
        string? fieldName = null,
        string? oldValue = null,
        string? newValue = null,
        long? userId = null,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Action = action.ToUpperInvariant(),
            EntityType = entityType.ToUpperInvariant(),
            EntityId = entityId,
            FieldName = fieldName,
            OldValue = EnsureJson(oldValue),
            NewValue = EnsureJson(newValue),
            UserId = userId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.AuditLogs.Add(log);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.AuditLogs
            .Include(a => a.User)
                .ThenInclude(u => u!.Employee)
            .AsNoTracking()
            .AsQueryable();

        if (filter.StartDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(filter.StartDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(a => a.CreatedAt >= startUtc);
        }

        if (filter.EndDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(filter.EndDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(a => a.CreatedAt <= endUtc);
        }

        if (filter.UserId.HasValue)
        {
            query = query.Where(a => a.UserId == filter.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action) && filter.Action != "ทั้งหมด")
        {
            query = query.Where(a => a.Action == filter.Action.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityType) && filter.EntityType != "ทั้งหมด")
        {
            query = query.Where(a => a.EntityType == filter.EntityType.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(a =>
                (a.User != null && a.User.Username.ToLower().Contains(s)) ||
                (a.User != null && a.User.Employee != null && (a.User.Employee.FirstName.ToLower().Contains(s) || a.User.Employee.LastName.ToLower().Contains(s))) ||
                (a.FieldName != null && a.FieldName.ToLower().Contains(s)) ||
                (a.IpAddress != null && a.IpAddress.ToLower().Contains(s)) ||
                a.EntityType.ToLower().Contains(s) ||
                (a.EntityId != null && a.EntityId.ToString()!.Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        int page = filter.Page > 0 ? filter.Page : 1;
        int pageSize = filter.PageSize > 0 ? filter.PageSize : 15;

        var entities = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = entities.Select(a => new AuditLogDto
        {
            Id = a.Id,
            UserId = a.UserId,
            Username = a.User != null ? a.User.Username : "SYSTEM",
            FullName = a.User != null && a.User.Employee != null
                ? $"{a.User.Employee.FirstName} {a.User.Employee.LastName}"
                : (a.User != null ? a.User.Username : "ระบบ"),
            Action = a.Action,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            FieldName = a.FieldName,
            OldValue = CleanJsonDisplay(a.OldValue),
            NewValue = CleanJsonDisplay(a.NewValue),
            IpAddress = a.IpAddress,
            Description = FormatDescription(a.Action, a.EntityType, a.EntityId, a.FieldName),
            CreatedAt = a.CreatedAt
        }).ToList();

        return new PagedResult<AuditLogDto>(items, totalCount, page, pageSize);
    }

    public async Task<byte[]> ExportLogsCsvAsync(AuditLogQueryFilter filter, CancellationToken cancellationToken = default)
    {
        // Limit export to max 5,000 rows
        filter.Page = 1;
        filter.PageSize = 5000;
        var pagedResult = await GetLogsAsync(filter, cancellationToken);

        var sb = new StringBuilder();
        // UTF-8 BOM for Thai Excel support
        sb.AppendLine("ID,วันเวลา,ผู้ใช้งาน,ชื่อ-นามสกุล,การกระทำ,ประเภทข้อมูล,รหัสข้อมูล,ฟิลด์ที่แก้ไข,ค่าเดิม,ค่าใหม่,IP Address");

        foreach (var item in pagedResult.Items)
        {
            var dateStr = item.CreatedAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
            var oldVal = EscapeCsv(item.OldValue);
            var newVal = EscapeCsv(item.NewValue);
            var user = EscapeCsv(item.Username);
            var name = EscapeCsv(item.FullName);
            var field = EscapeCsv(item.FieldName);
            var ip = EscapeCsv(item.IpAddress);

            sb.AppendLine($"{item.Id},\"{dateStr}\",\"{user}\",\"{name}\",\"{item.Action}\",\"{item.EntityType}\",\"{item.EntityId}\",\"{field}\",\"{oldVal}\",\"{newVal}\",\"{ip}\"");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var content = Encoding.UTF8.GetBytes(sb.ToString());
        var finalBytes = new byte[preamble.Length + content.Length];
        Buffer.BlockCopy(preamble, 0, finalBytes, 0, preamble.Length);
        Buffer.BlockCopy(content, 0, finalBytes, preamble.Length, content.Length);

        return finalBytes;
    }

    private static string? EnsureJson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if ((trimmed.StartsWith("{") && trimmed.EndsWith("}")) ||
            (trimmed.StartsWith("[") && trimmed.EndsWith("]")) ||
            (trimmed.StartsWith("\"") && trimmed.EndsWith("\"")))
        {
            return trimmed;
        }
        return System.Text.Json.JsonSerializer.Serialize(value);
    }

    private static string? CleanJsonDisplay(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.StartsWith("\"") && trimmed.EndsWith("\"") && trimmed.Length >= 2)
        {
            return trimmed.Substring(1, trimmed.Length - 2);
        }
        return trimmed;
    }

    private static string FormatDescription(string action, string entityType, long? entityId, string? field)
    {
        return action switch
        {
            "LOGIN" => "เข้าสู่ระบบสำเร็จ",
            "LOGOUT" => "ออกจากระบบ",
            "INSERT" => $"สร้างข้อมูลใหม่ {entityType} #{entityId}",
            "UPDATE" => $"แก้ไขข้อมูล {entityType} #{entityId}" + (!string.IsNullOrEmpty(field) ? $" (ฟิลด์ {field})" : ""),
            "DELETE" => $"ลบข้อมูล {entityType} #{entityId}",
            "APPROVE" => $"อนุมัติรายการ {entityType} #{entityId}",
            "REJECT" => $"ปฏิเสธรายการ {entityType} #{entityId}",
            "EXPORT" => $"ส่งออกข้อมูล {entityType}",
            _ => $"{action} {entityType} #{entityId}"
        };
    }

    private static string EscapeCsv(string? val)
    {
        if (string.IsNullOrEmpty(val)) return "";
        return val.Replace("\"", "\"\"").Replace("\r", "").Replace("\n", " ");
    }
}
