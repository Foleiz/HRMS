using System.Globalization;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.EmployeeDocuments.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.EmployeeDocuments.Services;

public interface IDocumentExpiryNotifier
{
    /// <summary>ตรวจเอกสารใกล้หมดอายุ / หมดอายุ แล้วส่งแจ้งเตือน (แจ้งแต่ละสถานะครั้งเดียวต่อเอกสาร)</summary>
    Task<DocumentExpiryCheckResult> RunAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// แจ้งเตือนเอกสารใกล้หมดอายุ (ตามขอบเขต: การอนุมัติและการแจ้งเตือน)
/// - เจ้าของเอกสาร: แจ้งรายเอกสาร
/// - ฝ่ายบุคคล: แจ้งสรุปรอบละ 1 รายการ แล้วดูรายละเอียดที่หน้า "เอกสารใกล้หมดอายุ"
/// </summary>
public class DocumentExpiryNotifier : IDocumentExpiryNotifier
{
    public const string OwnerNotificationType = "DOCUMENT_EXPIRY";
    public const string HrNotificationType = "DOCUMENT_EXPIRY_HR";
    public const string ReferenceType = "EMPLOYEE_DOCUMENT";

    private static readonly string[] HrRoleCodes = { "HR", "HR_ADMIN", "HR_MGR" };
    private static readonly SemaphoreSlim RunLock = new(1, 1);
    private static readonly CultureInfo Thai = new("th-TH");

    private readonly IHrmsDbContext _context;

    public DocumentExpiryNotifier(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<DocumentExpiryCheckResult> RunAsync(CancellationToken cancellationToken = default)
    {
        // กันรันซ้อน (งานอัตโนมัติ + ฝ่ายบุคคลกดตรวจเอง)
        await RunLock.WaitAsync(cancellationToken);
        try
        {
            return await RunCoreAsync(cancellationToken);
        }
        finally
        {
            RunLock.Release();
        }
    }

    private async Task<DocumentExpiryCheckResult> RunCoreAsync(CancellationToken cancellationToken)
    {
        var today = DocumentExpiry.Today();
        var horizon = today.AddDays(365);

        var candidates = await _context.EmployeeDocuments.AsNoTracking()
            .Where(d => d.ExpiryDate != null && d.ExpiryDate <= horizon
                        && (d.ExpiryWarningNotifiedAt == null || d.ExpiredNotifiedAt == null))
            .Select(d => new
            {
                d.Id,
                d.EmployeeId,
                ExpiryDate = d.ExpiryDate!.Value,
                d.ExpiryWarningNotifiedAt,
                d.ExpiredNotifiedAt,
                TypeName = d.DocumentType.DocumentName,
                d.DocumentType.NotifyBeforeDays
            })
            .ToListAsync(cancellationToken);

        var expiring = new List<(long Id, long EmployeeId, string TypeName, DateOnly Expiry, int Days)>();
        var expired = new List<(long Id, long EmployeeId, string TypeName, DateOnly Expiry, int Days)>();
        foreach (var c in candidates)
        {
            var (status, days) = DocumentExpiry.GetStatus(c.ExpiryDate, c.NotifyBeforeDays, today);
            if (status == DocumentExpiry.Expired && c.ExpiredNotifiedAt == null)
                expired.Add((c.Id, c.EmployeeId, c.TypeName, c.ExpiryDate, days ?? 0));
            else if (status == DocumentExpiry.ExpiringSoon && c.ExpiryWarningNotifiedAt == null)
                expiring.Add((c.Id, c.EmployeeId, c.TypeName, c.ExpiryDate, days ?? 0));
        }

        var result = new DocumentExpiryCheckResult
        {
            ExpiringSoonNotified = expiring.Count,
            ExpiredNotified = expired.Count
        };
        if (expiring.Count == 0 && expired.Count == 0) return result;

        var now = DateTime.UtcNow;
        var employeeIds = expiring.Concat(expired).Select(x => x.EmployeeId).Distinct().ToList();
        var ownerUsers = (await _context.UserAccounts.AsNoTracking()
                .Where(u => employeeIds.Contains(u.EmployeeId) && u.Status == "ACTIVE")
                .Select(u => new { u.Id, u.EmployeeId })
                .ToListAsync(cancellationToken))
            .GroupBy(u => u.EmployeeId)
            .ToDictionary(g => g.Key, g => g.Select(u => u.Id).ToList());

        var notifications = new List<Notification>();

        // 1) แจ้งเจ้าของเอกสาร
        foreach (var d in expiring)
        {
            if (!ownerUsers.TryGetValue(d.EmployeeId, out var users)) continue;
            var title = $"เอกสารของคุณใกล้หมดอายุ: {d.TypeName}";
            var message = $"หมดอายุวันที่ {FormatDate(d.Expiry)} (อีก {d.Days} วัน) กรุณาส่งเอกสารฉบับใหม่ให้ฝ่ายบุคคล";
            notifications.AddRange(users.Select(uid => Build(uid, OwnerNotificationType, title, message, d.Id, now)));
        }
        foreach (var d in expired)
        {
            if (!ownerUsers.TryGetValue(d.EmployeeId, out var users)) continue;
            var title = $"เอกสารของคุณหมดอายุแล้ว: {d.TypeName}";
            var message = $"หมดอายุเมื่อวันที่ {FormatDate(d.Expiry)} กรุณาส่งเอกสารฉบับใหม่ให้ฝ่ายบุคคล";
            notifications.AddRange(users.Select(uid => Build(uid, OwnerNotificationType, title, message, d.Id, now)));
        }

        // 2) แจ้งสรุปฝ่ายบุคคล
        var hrUsers = await _context.UserAccounts.AsNoTracking()
            .Where(u => u.Status == "ACTIVE" && u.UserRoles.Any(ur => HrRoleCodes.Contains(ur.Role.RoleCode)))
            .Select(u => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken);
        result.HrRecipients = hrUsers.Count;

        var parts = new List<string>();
        if (expiring.Count > 0) parts.Add($"ใกล้หมดอายุ {expiring.Count} รายการ");
        if (expired.Count > 0) parts.Add($"หมดอายุแล้ว {expired.Count} รายการ");
        var hrTitle = $"เอกสารพนักงาน{string.Join(" / ", parts)}";
        var hrMessage = string.Join(", ", expiring.Concat(expired).Take(5).Select(x => x.TypeName).Distinct())
                        + (expiring.Count + expired.Count > 5 ? " และอื่น ๆ" : "")
                        + " — ดูรายละเอียดที่เมนูพนักงาน > เอกสารใกล้หมดอายุ";
        notifications.AddRange(hrUsers.Select(uid => Build(uid, HrNotificationType, hrTitle, hrMessage, null, now)));

        if (notifications.Count > 0)
        {
            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 3) บันทึกว่าแจ้งแล้ว (หมดอายุแล้วถือว่าผ่านช่วงใกล้หมดอายุไปแล้วด้วย)
        var expiringIds = expiring.Select(x => x.Id).ToList();
        var expiredIds = expired.Select(x => x.Id).ToList();
        if (expiringIds.Count > 0)
        {
            await _context.EmployeeDocuments
                .Where(d => expiringIds.Contains(d.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.ExpiryWarningNotifiedAt, (DateTime?)now), cancellationToken);
        }
        if (expiredIds.Count > 0)
        {
            await _context.EmployeeDocuments
                .Where(d => expiredIds.Contains(d.Id))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(d => d.ExpiredNotifiedAt, (DateTime?)now)
                    .SetProperty(d => d.ExpiryWarningNotifiedAt, d => d.ExpiryWarningNotifiedAt ?? now), cancellationToken);
        }

        return result;
    }

    private static Notification Build(long userId, string type, string title, string message, long? referenceId, DateTime now) => new()
    {
        UserId = userId,
        NotificationType = type,
        Title = title.Length > 255 ? title[..255] : title,
        Message = message,
        ReferenceType = ReferenceType,
        ReferenceId = referenceId,
        IsRead = false,
        CreatedAt = now
    };

    private static string FormatDate(DateOnly date) => date.ToString("d MMM yyyy", Thai);
}
