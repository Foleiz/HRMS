using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

/// <summary>
/// คำนวณ "สิทธิ์ปีนี้" ของยอดวันลาอัตโนมัติจากสิทธิ์การลา (แทนปุ่มจัดสรรยอดประจำปีเดิม)
/// - สร้างยอดวันลาให้พนักงานทุกคน × ประเภทการลาที่เปิดใช้งาน ถ้ายังไม่มี
/// - สิทธิ์ปีนี้ = คำนวณจากนโยบายที่ตรงกับพนักงานเสมอ (แก้นโยบาย / ย้ายประเภท-ระดับพนักงาน → ยอดปรับตาม)
/// - ยอดยกมา: คิดครั้งเดียวตอนสร้างยอดของปีใหม่ จากคงเหลือปีก่อน
/// - ปีที่ผ่านมาแล้ว: สร้างยอดที่ขาดเท่านั้น ไม่ปรับสิทธิ์ย้อนหลัง
/// - ไม่แตะวันที่ใช้ไปและยอดที่ HR ปรับเอง (ปรับยอด) — ทุกการเปลี่ยนแปลงบันทึกรายการในประวัติ
/// - ประเภทการลาที่ไม่มีสิทธิ์การลาเลย: สร้างยอดเป็น 0 และไม่แตะค่าเดิม
/// </summary>
public interface ILeaveEntitlementSync
{
    /// <summary>ซิงค์ยอดวันลาของปีที่กำหนด (ระบุพนักงาน/ประเภทการลาเพื่อจำกัดขอบเขต)</summary>
    Task SyncAsync(int year, IReadOnlyCollection<long>? employeeIds = null, long? leaveTypeId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// ซิงค์แบบจำกัดความถี่ (ไม่เกิน 1 ครั้ง/5 นาที ต่อ ปี+พนักงาน+ประเภทการลา) — ใช้กับหน้าที่อ่านยอดและตอนยื่นใบลา
    /// ฐานข้อมูลอยู่ไกล (แต่ละ query ~150-250ms) การซิงค์ทุกครั้งทำให้คำขอช้าจน timeout
    /// การแก้นโยบาย/ประเภทการลา/ปิดยอดปี ยังเรียก SyncAsync ตรง จึงอัปเดตทันทีเหมือนเดิม
    /// </summary>
    Task SyncIfStaleAsync(int year, long? employeeId, long? leaveTypeId, CancellationToken cancellationToken = default);
}

public class LeaveEntitlementSync : ILeaveEntitlementSync
{
    private readonly IHrmsDbContext _context;

    public LeaveEntitlementSync(IHrmsDbContext context)
    {
        _context = context;
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, DateTime> LastSync = new();
    private static readonly TimeSpan SyncInterval = TimeSpan.FromMinutes(5);

    public async Task SyncIfStaleAsync(int year, long? employeeId, long? leaveTypeId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        // ซิงค์ทั้งปี/ทุกคน/ทุกประเภทครอบคลุมขอบเขตที่แคบกว่า
        string[] keys =
        {
            $"{year}|{employeeId?.ToString() ?? "*"}|{leaveTypeId?.ToString() ?? "*"}",
            $"{year}|{employeeId?.ToString() ?? "*"}|*",
            $"{year}|*|*",
        };
        foreach (var k in keys)
        {
            if (LastSync.TryGetValue(k, out var last) && now - last < SyncInterval)
                return;
        }

        await SyncAsync(year, employeeId.HasValue ? new[] { employeeId.Value } : null, leaveTypeId, cancellationToken);
        LastSync[keys[0]] = now;
    }

    public async Task SyncAsync(int year, IReadOnlyCollection<long>? employeeIds = null, long? leaveTypeId = null, CancellationToken cancellationToken = default)
    {
        var empQuery = _context.Employees.AsNoTracking().Where(e => e.EmploymentStatus == "ACTIVE");
        if (employeeIds != null)
        {
            var ids = employeeIds.ToList();
            empQuery = empQuery.Where(e => ids.Contains(e.Id));
        }
        var empIds = await empQuery.Select(e => e.Id).ToListAsync(cancellationToken);
        if (empIds.Count == 0) return;

        var leaveTypes = await _context.LeaveTypes.AsNoTracking()
            .Where(t => t.Status == "ACTIVE" && (leaveTypeId == null || t.Id == leaveTypeId))
            .Select(t => new { t.Id, t.LeaveName })
            .ToListAsync(cancellationToken);
        if (leaveTypes.Count == 0) return;
        var typeIds = leaveTypes.Select(t => t.Id).ToList();

        var policiesByType = (await _context.LeavePolicies.AsNoTracking()
                .Where(p => typeIds.Contains(p.LeaveTypeId))
                .ToListAsync(cancellationToken))
            .GroupBy(p => p.LeaveTypeId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var onDate = LeavePolicyRules.PolicyDateForYear(year);
        var groups = await LeaveEmployeeGroups.ResolveAsync(_context, empIds, onDate, cancellationToken);

        var hireDates = await _context.EmploymentContracts.AsNoTracking()
            .Where(c => empIds.Contains(c.EmployeeId))
            .GroupBy(c => c.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, HireDate = g.Min(c => c.StartDate) })
            .ToDictionaryAsync(x => x.EmployeeId, x => (DateOnly?)x.HireDate, cancellationToken);

        var existing = (await _context.LeaveBalances
                .Where(b => b.Year == year && empIds.Contains(b.EmployeeId) && typeIds.Contains(b.LeaveTypeId))
                .ToListAsync(cancellationToken))
            .ToDictionary(b => (b.EmployeeId, b.LeaveTypeId));

        var previous = (await _context.LeaveBalances.AsNoTracking()
                .Where(b => b.Year == year - 1 && empIds.Contains(b.EmployeeId) && typeIds.Contains(b.LeaveTypeId))
                .ToListAsync(cancellationToken))
            .ToDictionary(b => (b.EmployeeId, b.LeaveTypeId));

        // ปีที่ผ่านมาแล้วเป็นประวัติ: สร้างยอดที่ขาดได้ แต่ไม่ปรับสิทธิ์ย้อนหลัง
        var allowAdjustExisting = year >= LeavePolicyRules.ThaiToday().Year;
        var changed = false;

        foreach (var empId in empIds)
        {
            groups.TryGetValue(empId, out var group);
            hireDates.TryGetValue(empId, out var hireDate);

            foreach (var lt in leaveTypes)
            {
                existing.TryGetValue((empId, lt.Id), out var balance);
                var hasPolicies = policiesByType.TryGetValue(lt.Id, out var typePolicies);

                // ประเภทที่ไม่มีสิทธิ์การลา: สร้างยอดเปล่าให้แสดงในตาราง แต่ไม่แก้ค่าที่มีอยู่
                if (!hasPolicies)
                {
                    if (balance == null)
                    {
                        _context.LeaveBalances.Add(NewBalance(empId, lt.Id, year, 0m, 0m, null,
                            "OPENING", $"สร้างยอดวันลา '{lt.LeaveName}' อัตโนมัติ (ยังไม่ได้ตั้งสิทธิ์การลา)"));
                        changed = true;
                    }
                    continue;
                }

                var policy = LeavePolicyRules.SelectPolicy(typePolicies!, group.EmployeeTypeId, group.EmployeeLevelId, onDate);
                var entitlement = policy != null ? LeavePolicyRules.ComputeEntitlement(policy, hireDate, year) : 0m;

                if (balance == null)
                {
                    decimal carried = 0m;
                    DateOnly? carryExpiry = null;
                    if (policy is { IsCarryForwardAllowed: true }
                        && previous.TryGetValue((empId, lt.Id), out var prev) && prev.NetRemainingLeaveDays > 0)
                    {
                        carried = Math.Min(prev.NetRemainingLeaveDays, LeavePolicyRules.CarryForwardMaxDays(policy));
                        carryExpiry = new DateOnly(year, 1, 1).AddMonths(LeavePolicyRules.CarryForwardExpiryMonths(policy));
                    }

                    var created = NewBalance(empId, lt.Id, year, entitlement, carried, carryExpiry,
                        "ENTITLEMENT", policy != null
                            ? $"สิทธิ์วันลา '{lt.LeaveName}' ปี {year + 543} ตามสิทธิ์การลา (อัตโนมัติ)"
                            : $"สร้างยอดวันลา '{lt.LeaveName}' อัตโนมัติ (ไม่มีสิทธิ์การลาที่ตรงกับกลุ่มพนักงาน)");
                    if (carried > 0)
                    {
                        created.Transactions.Add(new LeaveBalanceTransaction
                        {
                            TransactionType = "CARRY_FORWARD",
                            Amount = carried,
                            Note = $"ยอดยกมาจากปี {year - 1 + 543}",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    _context.LeaveBalances.Add(created);
                    changed = true;
                    continue;
                }

                // มียอดอยู่แล้ว: ปรับสิทธิ์ปีนี้ให้ตรงกับนโยบายปัจจุบัน (บันทึกส่วนต่างในประวัติ)
                if (allowAdjustExisting && balance.AnnualQuotaDays != entitlement)
                {
                    var delta = entitlement - balance.AnnualQuotaDays;
                    balance.Transactions.Add(new LeaveBalanceTransaction
                    {
                        TransactionType = "ENTITLEMENT",
                        Amount = delta,
                        Note = $"ปรับสิทธิ์ปีนี้ตามสิทธิ์การลา ({Fmt(balance.AnnualQuotaDays)} → {Fmt(entitlement)} วัน) อัตโนมัติ",
                        CreatedAt = DateTime.UtcNow
                    });
                    balance.AnnualQuotaDays = entitlement;
                    balance.NetRemainingLeaveDays = balance.BroughtForwardDays + balance.AnnualQuotaDays
                        + balance.ActiveCarriedForwardDays - balance.UsedDays + balance.AdjustedDays;
                    changed = true;
                }
            }
        }

        if (changed) await _context.SaveChangesAsync(cancellationToken);
    }

    private static string Fmt(decimal d) => d.ToString("0.##");

    private static LeaveBalance NewBalance(long employeeId, long leaveTypeId, int year, decimal entitlement,
        decimal carried, DateOnly? carryExpiry, string txType, string note) => new()
    {
        EmployeeId = employeeId,
        LeaveTypeId = leaveTypeId,
        Year = year,
        BroughtForwardDays = 0,
        AnnualQuotaDays = entitlement,
        ActiveCarriedForwardDays = carried,
        UsedDays = 0,
        AdjustedDays = 0,
        NetRemainingLeaveDays = entitlement + carried,
        CarryForwardExpiry = carryExpiry,
        Transactions = new List<LeaveBalanceTransaction>
        {
            new() { TransactionType = txType, Amount = entitlement, Note = note, CreatedAt = DateTime.UtcNow }
        }
    };
}
