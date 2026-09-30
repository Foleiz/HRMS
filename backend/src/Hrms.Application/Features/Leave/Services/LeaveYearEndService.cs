using System.Globalization;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

// ───────────────────────── DTOs ─────────────────────────

public class LeaveYearEndRow
{
    public long BalanceId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public long LeaveTypeId { get; set; }
    public string LeaveTypeName { get; set; } = string.Empty;
    public decimal RemainingDays { get; set; }
    public bool CarryForwardAllowed { get; set; }
    public decimal? CarryForwardMaxDays { get; set; }
    public decimal CarryDays { get; set; }
    public decimal ForfeitDays { get; set; }
    public string? CarryForwardExpiry { get; set; }
}

public class LeaveYearEndPreview
{
    public int Year { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? ClosedByName { get; set; }
    public bool CanClose { get; set; }
    /// <summary>เหตุผลที่ยังปิดยอดไม่ได้ (ถ้ามี)</summary>
    public string? BlockReason { get; set; }
    public int PendingRequests { get; set; }
    public int BalanceCount { get; set; }
    public decimal TotalRemainingDays { get; set; }
    public decimal TotalCarriedDays { get; set; }
    public decimal TotalForfeitedDays { get; set; }
    public List<LeaveYearEndRow> Rows { get; set; } = new();
}

public class LeaveYearEndCloseRequest
{
    public string? Note { get; set; }
}

public interface ILeaveYearEndService
{
    Task<LeaveYearEndPreview> PreviewAsync(int year, CancellationToken cancellationToken = default);
    Task<LeaveYearEndPreview> CloseAsync(int year, string? note, CancellationToken cancellationToken = default);
    /// <summary>ตัดยอดยกมาที่ไม่ได้ใช้เมื่อเลยวันหมดอายุ (งานเบื้องหลัง) — คืนจำนวนยอดที่ถูกตัด</summary>
    Task<int> ExpireCarryForwardAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// ปิดยอดวันลาสิ้นปี
/// - ดูตัวอย่างก่อน: คงเหลือของแต่ละคน → ยกไปปีหน้าตามเพดานในสิทธิ์การลา ส่วนที่เกิน/ไม่อนุญาตยกยอดถูกตัดทิ้ง
/// - ยืนยัน: บันทึกรายการ CARRY_FORWARD / EXPIRED ในประวัติยอด, ตั้งยอดยกมาของปีหน้า และวันหมดอายุ
/// - ปิดได้ปีละครั้ง, ปิดได้หลังสิ้นปีแล้วเท่านั้น และต้องไม่มีใบลาของปีนั้นค้างอนุมัติ
/// - หลังปิดยอด ยื่น/แก้/อนุมัติใบลาของปีนั้นไม่ได้อีก
/// - ยอดยกมาที่ไม่ได้ใช้จะถูกตัดอัตโนมัติเมื่อเลยวันหมดอายุ (ExpireCarryForwardAsync) — ถือว่าวันที่ใช้ไปหักจากยอดยกมาก่อน
/// </summary>
public class LeaveYearEndService : ILeaveYearEndService
{
    private static readonly string[] HrRoles = { "ADMIN", "SUPER_ADMIN", "SYS_ADMIN", "SYSTEM_SUPER", "HR", "HR_ADMIN", "HR_MGR" };
    public const string YearEndReference = "YEAR_END";
    public const string CarryExpiryReference = "CARRY_EXPIRY";

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ILeaveEntitlementSync _entitlementSync;

    public LeaveYearEndService(IHrmsDbContext context, ICurrentUserService currentUser, ILeaveEntitlementSync entitlementSync)
    {
        _context = context;
        _currentUser = currentUser;
        _entitlementSync = entitlementSync;
    }

    private void EnsureHr()
    {
        if (!HrRoles.Any(_currentUser.HasRole))
            throw new ForbiddenException("เฉพาะฝ่ายบุคคลเท่านั้นที่ปิดยอดวันลาสิ้นปีได้");
    }

    private static int NormalizeYear(int year) => year > 2400 ? year - 543 : year;

    public async Task<LeaveYearEndPreview> PreviewAsync(int year, CancellationToken cancellationToken = default)
    {
        EnsureHr();
        year = NormalizeYear(year);
        var (preview, _) = await BuildPreviewAsync(year, cancellationToken);
        return preview;
    }

    public async Task<LeaveYearEndPreview> CloseAsync(int year, string? note, CancellationToken cancellationToken = default)
    {
        EnsureHr();
        year = NormalizeYear(year);
        var (preview, rows) = await BuildPreviewAsync(year, cancellationToken);
        if (!preview.CanClose) throw new BusinessRuleException(preview.BlockReason ?? $"ยังปิดยอดวันลาปี {year + 543} ไม่ได้");

        var nextYear = year + 1;
        var actor = _currentUser.EmployeeId;
        var now = DateTime.UtcNow;
        var activeEmpIds = await _context.Employees.AsNoTracking()
            .Where(e => e.EmploymentStatus == "ACTIVE")
            .Select(e => e.Id)
            .ToListAsync(cancellationToken);

        // ให้มียอดของปีหน้าครบก่อน (สร้างสิทธิ์ปีใหม่ตามนโยบาย)
        await _entitlementSync.SyncAsync(nextYear, activeEmpIds, null, cancellationToken);

        var rowByKey = rows.ToDictionary(r => (r.EmployeeId, r.LeaveTypeId));

        // 1) ปีที่ปิด: บันทึกยอดยกไป / ยอดที่ถูกตัด
        var balanceIds = rows.Select(r => r.BalanceId).ToList();
        var yearBalances = await _context.LeaveBalances
            .Where(b => balanceIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, cancellationToken);
        foreach (var r in rows)
        {
            if (!yearBalances.TryGetValue(r.BalanceId, out var b)) continue;
            if (r.CarryDays > 0)
            {
                b.Transactions.Add(new LeaveBalanceTransaction
                {
                    TransactionType = "CARRY_FORWARD", Amount = -r.CarryDays,
                    ReferenceType = YearEndReference, ReferenceId = year,
                    Note = $"ปิดยอดปี {year + 543}: ยกยอดไปปี {nextYear + 543}",
                    CreatedAt = now, CreatedByEmployeeId = actor
                });
            }
            if (r.ForfeitDays > 0)
            {
                b.Transactions.Add(new LeaveBalanceTransaction
                {
                    TransactionType = "EXPIRED", Amount = -r.ForfeitDays,
                    ReferenceType = YearEndReference, ReferenceId = year,
                    Note = r.CarryForwardAllowed
                        ? $"ปิดยอดปี {year + 543}: ตัดส่วนที่เกินเพดานยกยอด ({Fmt(r.CarryForwardMaxDays ?? 0)} วัน)"
                        : $"ปิดยอดปี {year + 543}: ประเภทการลานี้ไม่อนุญาตยกยอด",
                    CreatedAt = now, CreatedByEmployeeId = actor
                });
            }
        }

        // 2) ปีหน้า: ตั้งยอดยกมาให้ตรงกับผลการปิดยอด (รวมกรณีที่ระบบยกยอดอัตโนมัติไว้ก่อนแล้ว)
        var nextBalances = await _context.LeaveBalances
            .Include(b => b.Transactions)
            .Where(b => b.Year == nextYear && activeEmpIds.Contains(b.EmployeeId))
            .ToListAsync(cancellationToken);
        foreach (var nb in nextBalances)
        {
            rowByKey.TryGetValue((nb.EmployeeId, nb.LeaveTypeId), out var r);
            var target = r?.CarryDays ?? 0m;
            // ยอดยกมาที่ถูกตัดหมดอายุไปแล้ว ไม่ย้อนกลับไปแก้
            if (nb.Transactions.Any(t => t.ReferenceType == CarryExpiryReference)) continue;
            if (nb.ActiveCarriedForwardDays == target && (target == 0 || nb.CarryForwardExpiry != null)) continue;

            var delta = target - nb.ActiveCarriedForwardDays;
            if (delta != 0)
            {
                nb.Transactions.Add(new LeaveBalanceTransaction
                {
                    TransactionType = "CARRY_FORWARD", Amount = delta,
                    ReferenceType = YearEndReference, ReferenceId = year,
                    Note = $"ยอดยกมาจากการปิดยอดปี {year + 543} ({Fmt(nb.ActiveCarriedForwardDays)} → {Fmt(target)} วัน)",
                    CreatedAt = now, CreatedByEmployeeId = actor
                });
            }
            nb.ActiveCarriedForwardDays = target;
            nb.CarryForwardExpiry = target > 0 && r?.CarryForwardExpiry != null ? DateOnly.ParseExact(r.CarryForwardExpiry, "yyyy-MM-dd", CultureInfo.InvariantCulture) : null;
            Recalculate(nb);
        }

        _context.LeaveYearClosings.Add(new LeaveYearClosing
        {
            Year = year,
            ClosedAt = now,
            ClosedByEmployeeId = actor,
            BalanceCount = rows.Count,
            TotalCarriedDays = rows.Sum(r => r.CarryDays),
            TotalForfeitedDays = rows.Sum(r => r.ForfeitDays),
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim()
        });

        await _context.SaveChangesAsync(cancellationToken);

        var (after, _) = await BuildPreviewAsync(year, cancellationToken);
        return after;
    }

    public async Task<int> ExpireCarryForwardAsync(CancellationToken cancellationToken = default)
    {
        var today = LeavePolicyRules.ThaiToday();
        var balances = await _context.LeaveBalances
            .Where(b => b.CarryForwardExpiry != null && b.CarryForwardExpiry <= today
                        && b.ActiveCarriedForwardDays > 0 && b.ActiveCarriedForwardDays > b.UsedDays)
            .ToListAsync(cancellationToken);

        var count = 0;
        foreach (var b in balances)
        {
            // วันที่ใช้ไปถือว่าหักจากยอดยกมาก่อน ส่วนที่เหลือของยอดยกมาจึงหมดอายุ
            var unused = Math.Max(0m, b.ActiveCarriedForwardDays - b.UsedDays);
            var expire = Math.Min(unused, Math.Max(0m, b.NetRemainingLeaveDays));
            if (expire <= 0) continue;

            b.Transactions.Add(new LeaveBalanceTransaction
            {
                TransactionType = "EXPIRED",
                Amount = -expire,
                ReferenceType = CarryExpiryReference,
                ReferenceId = b.Year,
                Note = $"ยอดยกมาหมดอายุ ({ThaiDate(b.CarryForwardExpiry!.Value)}) ตัด {Fmt(expire)} วันที่ยังไม่ได้ใช้",
                CreatedAt = DateTime.UtcNow
            });
            b.ActiveCarriedForwardDays -= expire;
            Recalculate(b);
            count++;
        }

        if (count > 0) await _context.SaveChangesAsync(cancellationToken);
        return count;
    }

    // ───────────────────────── helpers ─────────────────────────

    private async Task<(LeaveYearEndPreview Preview, List<LeaveYearEndRow> Rows)> BuildPreviewAsync(int year, CancellationToken cancellationToken)
    {
        var closing = await _context.LeaveYearClosings.AsNoTracking()
            .Where(c => c.Year == year)
            .Select(c => new
            {
                c.ClosedAt, c.BalanceCount, c.TotalCarriedDays, c.TotalForfeitedDays,
                ClosedBy = c.ClosedByEmployee != null ? c.ClosedByEmployee.FirstName + " " + c.ClosedByEmployee.LastName : null
            })
            .FirstOrDefaultAsync(cancellationToken);

        var fromUtc = DateTime.SpecifyKind(new DateTime(year, 1, 1).AddHours(-7), DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(new DateTime(year + 1, 1, 1).AddHours(-7), DateTimeKind.Utc);
        var pending = await _context.LeaveRequests.AsNoTracking()
            .CountAsync(r => r.Status == "PENDING" && r.StartDatetime >= fromUtc && r.StartDatetime < toUtc, cancellationToken);

        var balances = await _context.LeaveBalances.AsNoTracking()
            .Where(b => b.Year == year && b.NetRemainingLeaveDays > 0 && b.Employee!.EmploymentStatus == "ACTIVE")
            .Select(b => new
            {
                b.Id, b.EmployeeId, b.LeaveTypeId, b.NetRemainingLeaveDays,
                Code = b.Employee!.EmployeeCode, b.Employee.Prefix, b.Employee.FirstName, b.Employee.LastName,
                TypeName = b.LeaveType!.LeaveName
            })
            .ToListAsync(cancellationToken);

        var typeIds = balances.Select(b => b.LeaveTypeId).Distinct().ToList();
        var policiesByType = (await _context.LeavePolicies.AsNoTracking()
                .Where(p => typeIds.Contains(p.LeaveTypeId))
                .ToListAsync(cancellationToken))
            .GroupBy(p => p.LeaveTypeId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // ใช้นโยบายที่มีผล ณ วันที่ 1 ม.ค. ของปีถัดไป (เหมือนตอนสร้างยอดปีใหม่)
        var policyDate = new DateOnly(year + 1, 1, 1);
        var groups = await LeaveEmployeeGroups.ResolveAsync(_context, balances.Select(b => b.EmployeeId).Distinct().ToList(), policyDate, cancellationToken);

        var rows = new List<LeaveYearEndRow>();
        foreach (var b in balances)
        {
            groups.TryGetValue(b.EmployeeId, out var group);
            LeavePolicy? policy = null;
            if (policiesByType.TryGetValue(b.LeaveTypeId, out var typePolicies))
                policy = LeavePolicyRules.SelectPolicy(typePolicies, group.EmployeeTypeId, group.EmployeeLevelId, policyDate);

            var allowed = policy is { IsCarryForwardAllowed: true };
            var cap = allowed ? LeavePolicyRules.CarryForwardMaxDays(policy!) : 0m;
            var carry = allowed ? Math.Min(b.NetRemainingLeaveDays, cap) : 0m;
            rows.Add(new LeaveYearEndRow
            {
                BalanceId = b.Id,
                EmployeeId = b.EmployeeId,
                EmployeeCode = b.Code,
                EmployeeName = $"{b.Prefix} {b.FirstName} {b.LastName}".Trim(),
                LeaveTypeId = b.LeaveTypeId,
                LeaveTypeName = b.TypeName,
                RemainingDays = b.NetRemainingLeaveDays,
                CarryForwardAllowed = allowed,
                CarryForwardMaxDays = allowed ? cap : null,
                CarryDays = carry,
                ForfeitDays = b.NetRemainingLeaveDays - carry,
                CarryForwardExpiry = carry > 0
                    ? policyDate.AddMonths(LeavePolicyRules.CarryForwardExpiryMonths(policy!)).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                    : null
            });
        }
        rows = rows.OrderBy(r => r.EmployeeCode).ThenBy(r => r.LeaveTypeName).ToList();

        string? block = null;
        if (closing != null) block = $"ปี {year + 543} ปิดยอดไปแล้ว";
        else if (year >= LeavePolicyRules.ThaiToday().Year) block = $"ปิดยอดปี {year + 543} ได้หลังสิ้นปี (ตั้งแต่ 1 ม.ค. {year + 1 + 543}) — ตอนนี้ดูตัวอย่างได้อย่างเดียว";
        else if (pending > 0) block = $"ยังมีใบลาของปี {year + 543} รออนุมัติ {pending} ใบ — อนุมัติหรือปฏิเสธให้หมดก่อนปิดยอด";

        var preview = new LeaveYearEndPreview
        {
            Year = year,
            IsClosed = closing != null,
            ClosedAt = closing?.ClosedAt,
            ClosedByName = closing?.ClosedBy,
            CanClose = block == null,
            BlockReason = block,
            PendingRequests = pending,
            BalanceCount = closing?.BalanceCount ?? rows.Count,
            TotalRemainingDays = rows.Sum(r => r.RemainingDays),
            TotalCarriedDays = closing?.TotalCarriedDays ?? rows.Sum(r => r.CarryDays),
            TotalForfeitedDays = closing?.TotalForfeitedDays ?? rows.Sum(r => r.ForfeitDays),
            Rows = rows
        };
        return (preview, rows);
    }

    private static void Recalculate(LeaveBalance b) =>
        b.NetRemainingLeaveDays = b.BroughtForwardDays + b.AnnualQuotaDays + b.ActiveCarriedForwardDays - b.UsedDays + b.AdjustedDays;

    private static string Fmt(decimal d) => d.ToString("0.##", CultureInfo.InvariantCulture);

    private static string ThaiDate(DateOnly d) => $"{d.Day}/{d.Month}/{d.Year + 543}";
}
