using System.Globalization;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Contracts.Services;

public class ContractAlertResult
{
    public int ProbationNotified { get; set; }
    public int ContractExpiryNotified { get; set; }
}

public interface IContractAlertNotifier
{
    /// <summary>แจ้งเตือนสิ้นสุดทดลองงาน / สัญญาจ้างใกล้หมดอายุ (แต่ละสัญญาแจ้งครั้งเดียว)</summary>
    Task<ContractAlertResult> RunAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// ขอบเขต "การอนุมัติและการแจ้งเตือน": แจ้งเตือนสิ้นสุดทดลองงาน + แจ้งเตือนสัญญาจ้างใกล้หมดอายุ
/// ผู้รับ: ฝ่ายบุคคล และหัวหน้างานโดยตรงของพนักงาน
/// </summary>
public class ContractAlertNotifier : IContractAlertNotifier
{
    /// <summary>แจ้งก่อนสิ้นสุดทดลองงาน (วัน) — ตรงกับตัวเลขบนแดชบอร์ด</summary>
    public const int ProbationNoticeDays = 7;
    /// <summary>แจ้งก่อนสัญญาจ้างหมดอายุ (วัน)</summary>
    public const int ContractNoticeDays = 30;
    /// <summary>ไม่ย้อนแจ้งรายการที่เลยกำหนดมานานกว่านี้ (วัน) กันแจ้งท่วมตอนเปิดใช้ครั้งแรก</summary>
    private const int LookbackDays = 30;

    public const string ProbationType = "PROBATION_ENDING";
    public const string ContractType = "CONTRACT_EXPIRING";
    public const string ReferenceType = "EMPLOYMENT_CONTRACT";

    private static readonly string[] HrRoleCodes = { "HR", "HR_ADMIN", "HR_MGR" };
    private static readonly SemaphoreSlim RunLock = new(1, 1);
    private static readonly CultureInfo Thai = new("th-TH");

    private readonly IHrmsDbContext _context;

    public ContractAlertNotifier(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<ContractAlertResult> RunAsync(CancellationToken cancellationToken = default)
    {
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

    private async Task<ContractAlertResult> RunCoreAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var from = today.AddDays(-LookbackDays);
        var probationUntil = today.AddDays(ProbationNoticeDays);
        var contractUntil = today.AddDays(ContractNoticeDays);

        var probations = await _context.EmploymentContracts.AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.ContractType == "PROBATION"
                        && c.ProbationPassedDate == null && c.ProbationNotifiedAt == null
                        && c.ProbationEndDate != null && c.ProbationEndDate >= from && c.ProbationEndDate <= probationUntil)
            .Select(c => new { c.Id, c.EmployeeId, Date = c.ProbationEndDate!.Value })
            .ToListAsync(cancellationToken);

        var expiring = await _context.EmploymentContracts.AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.ContractType != "PROBATION" && c.ExpiryNotifiedAt == null
                        && c.ContractEndDate != null && c.ContractEndDate >= from && c.ContractEndDate <= contractUntil)
            .Select(c => new { c.Id, c.EmployeeId, Date = c.ContractEndDate!.Value })
            .ToListAsync(cancellationToken);

        var result = new ContractAlertResult { ProbationNotified = probations.Count, ContractExpiryNotified = expiring.Count };
        if (probations.Count == 0 && expiring.Count == 0) return result;

        var employeeIds = probations.Select(p => p.EmployeeId).Concat(expiring.Select(e => e.EmployeeId)).Distinct().ToList();

        var names = await _context.Employees.AsNoTracking()
            .Where(e => employeeIds.Contains(e.Id))
            .Select(e => new { e.Id, e.EmployeeCode, e.Prefix, e.FirstName, e.LastName })
            .ToListAsync(cancellationToken);
        var nameOf = names.ToDictionary(n => n.Id, n => $"{n.Prefix} {n.FirstName} {n.LastName}".Trim() + $" ({n.EmployeeCode})");

        // หัวหน้างานโดยตรงของแต่ละคน → user account ของหัวหน้า
        var managerOf = (await _context.EmployeeAssignments.AsNoTracking()
                .Where(a => employeeIds.Contains(a.EmployeeId) && a.IsCurrent && a.ManagerEmployeeId != null)
                .Select(a => new { a.EmployeeId, a.EffectiveFrom, ManagerId = a.ManagerEmployeeId!.Value })
                .ToListAsync(cancellationToken))
            .GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.EffectiveFrom).First().ManagerId);
        var managerIds = managerOf.Values.Distinct().ToList();
        var managerUsers = (await _context.UserAccounts.AsNoTracking()
                .Where(u => managerIds.Contains(u.EmployeeId) && u.Status == "ACTIVE")
                .Select(u => new { u.Id, u.EmployeeId })
                .ToListAsync(cancellationToken))
            .GroupBy(u => u.EmployeeId)
            .ToDictionary(g => g.Key, g => g.Select(u => u.Id).ToList());

        var hrUsers = await _context.UserAccounts.AsNoTracking()
            .Where(u => u.Status == "ACTIVE" && u.UserRoles.Any(ur => HrRoleCodes.Contains(ur.Role.RoleCode)))
            .Select(u => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

        List<long> RecipientsFor(long employeeId)
        {
            var ids = new List<long>(hrUsers);
            if (managerOf.TryGetValue(employeeId, out var mgr) && managerUsers.TryGetValue(mgr, out var mu)) ids.AddRange(mu);
            return ids.Distinct().ToList();
        }

        var now = DateTime.UtcNow;
        var notifications = new List<Notification>();

        foreach (var p in probations)
        {
            var name = nameOf.GetValueOrDefault(p.EmployeeId, "พนักงาน");
            var days = p.Date.DayNumber - today.DayNumber;
            var title = days >= 0
                ? $"ใกล้สิ้นสุดทดลองงาน: {name}"
                : $"เลยกำหนดสิ้นสุดทดลองงาน: {name}";
            var message = days >= 0
                ? $"ครบกำหนดทดลองงานวันที่ {FormatDate(p.Date)} (อีก {days} วัน) กรุณาประเมินผลการทดลองงาน"
                : $"ครบกำหนดทดลองงานเมื่อ {FormatDate(p.Date)} ยังไม่ได้บันทึกผลการทดลองงาน";
            notifications.AddRange(RecipientsFor(p.EmployeeId).Select(uid => Build(uid, ProbationType, title, message, p.Id, now)));
        }

        foreach (var c in expiring)
        {
            var name = nameOf.GetValueOrDefault(c.EmployeeId, "พนักงาน");
            var days = c.Date.DayNumber - today.DayNumber;
            var title = days >= 0
                ? $"สัญญาจ้างใกล้หมดอายุ: {name}"
                : $"สัญญาจ้างหมดอายุแล้ว: {name}";
            var message = days >= 0
                ? $"สัญญาจ้างสิ้นสุดวันที่ {FormatDate(c.Date)} (อีก {days} วัน) กรุณาพิจารณาต่อสัญญาหรือสิ้นสุดการจ้าง"
                : $"สัญญาจ้างสิ้นสุดเมื่อ {FormatDate(c.Date)} แต่สถานะยังใช้งานอยู่";
            notifications.AddRange(RecipientsFor(c.EmployeeId).Select(uid => Build(uid, ContractType, title, message, c.Id, now)));
        }

        if (notifications.Count > 0)
        {
            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var probationIds = probations.Select(p => p.Id).ToList();
        var expiringIds = expiring.Select(e => e.Id).ToList();
        if (probationIds.Count > 0)
        {
            await _context.EmploymentContracts.Where(c => probationIds.Contains(c.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.ProbationNotifiedAt, (DateTime?)now), cancellationToken);
        }
        if (expiringIds.Count > 0)
        {
            await _context.EmploymentContracts.Where(c => expiringIds.Contains(c.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.ExpiryNotifiedAt, (DateTime?)now), cancellationToken);
        }

        return result;
    }

    private static Notification Build(long userId, string type, string title, string message, long referenceId, DateTime now) => new()
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
