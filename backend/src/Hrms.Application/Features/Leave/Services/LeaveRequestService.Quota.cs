using Hrms.Application.Features.Attendance.Services;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

/// <summary>
/// ส่วนคำนวณวันลาและโควตา:
/// - นับเฉพาะ "วันทำงาน" ตามเมนูวันทำงานประจำสัปดาห์ (work_week) และไม่นับวันหยุดบริษัท (holiday)
/// - สร้างยอดวันลา (leave_balance) ให้อัตโนมัติเมื่อยังไม่มี เพื่อให้ตรวจโควตาและตัดยอดได้เสมอ
/// - กันโควตาของคำขอที่ "รออนุมัติ" ไว้ตอนยื่น และตรวจโควตาซ้ำตอนอนุมัติ
/// </summary>
public partial class LeaveRequestService
{
    /// <summary>บริษัทเริ่มต้นของระบบ (ใช้แบบเดียวกับ WorkCalendarService)</summary>
    private const long DefaultCompanyId = 1;

    /// <summary>ชั่วโมงทำงานต่อวัน (ใช้คำนวณ leave_hours)</summary>
    private const decimal HoursPerDay = 8m;

    /// <summary>
    /// แปลงเวลาที่เก็บ/รับมาให้เป็น "วันที่ตามเวลาไทย"
    /// - UTC (เช่น "2026-10-04T17:00:00Z" = 5 ต.ค. 00:00 เวลาไทย) → แปลงเป็นเวลาไทยก่อน
    /// - ไม่ระบุ timezone → ถือว่าเป็นเวลาไทยอยู่แล้ว
    /// </summary>
    internal static DateOnly ToThaiDate(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified) return DateOnly.FromDateTime(value);
        var utc = value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value;
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, AttendanceDailyService.ThaiZone));
    }

    private static string FormatDays(decimal days) => days.ToString("0.##");

    /// <summary>
    /// คำนวณจำนวนวันลาจากช่วงวันที่ โดยนับเฉพาะวันทำงานตามการตั้งค่า "วันทำงานประจำสัปดาห์"
    /// และไม่นับวันหยุดบริษัท/วันหยุดนักขัตฤกษ์ในเมนูปฏิทินวันหยุด
    /// </summary>
    public async Task<LeaveDaysCalculationDto> CalculateLeaveDaysAsync(
        DateOnly startDate,
        DateOnly endDate,
        bool isHalfDay = false,
        CancellationToken cancellationToken = default)
    {
        if (endDate < startDate)
            throw new InvalidOperationException("วันที่สิ้นสุดการลาต้องไม่ก่อนวันที่เริ่มลา");
        if (endDate.DayNumber - startDate.DayNumber > 366)
            throw new InvalidOperationException("ช่วงวันลายาวเกินไป (สูงสุด 1 ปีต่อคำขอ)");

        var workWeek = await _context.WorkWeeks
            .AsNoTracking()
            .Where(w => w.CompanyId == DefaultCompanyId)
            .ToListAsync(cancellationToken);

        // ยังไม่เคยตั้งค่าวันทำงาน → ใช้ค่าเริ่มต้นเดียวกับเมนูวันทำงานประจำสัปดาห์ (จันทร์–ศุกร์)
        var workingDays = workWeek.Count > 0
            ? workWeek.Where(w => w.IsWorkingDay).Select(w => (int)w.DayOfWeek).ToHashSet()
            : new HashSet<int> { 1, 2, 3, 4, 5 };

        var holidays = await _context.Holidays
            .AsNoTracking()
            .Where(h => h.CompanyId == DefaultCompanyId && h.HolidayDate >= startDate && h.HolidayDate <= endDate)
            .ToListAsync(cancellationToken);
        var holidayByDate = holidays
            .GroupBy(h => h.HolidayDate)
            .ToDictionary(g => g.Key, g => g.First().HolidayName);

        var result = new LeaveDaysCalculationDto
        {
            StartDate = startDate.ToString("yyyy-MM-dd"),
            EndDate = endDate.ToString("yyyy-MM-dd"),
            CalendarDays = endDate.DayNumber - startDate.DayNumber + 1,
            IsHalfDay = isHalfDay && startDate == endDate,
        };

        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            if (!workingDays.Contains((int)d.DayOfWeek))
            {
                result.NonWorkingDays++;
                continue;
            }
            if (holidayByDate.TryGetValue(d, out var holidayName))
            {
                result.Holidays.Add(new LeaveHolidayDto { Date = d.ToString("yyyy-MM-dd"), Name = holidayName });
                continue;
            }
            result.WorkingDates.Add(d.ToString("yyyy-MM-dd"));
        }

        var workingCount = result.WorkingDates.Count;
        result.LeaveDays = result.IsHalfDay ? (workingCount > 0 ? 0.5m : 0m) : workingCount;
        result.LeaveHours = result.LeaveDays * HoursPerDay;
        return result;
    }

    /// <summary>
    /// คำนวณวันลาของคำขอจากช่วงเวลาที่ส่งมา (ไม่เชื่อค่า leave_days จากหน้าเว็บ)
    /// ครึ่งวัน = ลาวันเดียวและหน้าเว็บส่งจำนวนวันน้อยกว่า 1
    /// </summary>
    private async Task<LeaveDaysCalculationDto> ResolveLeaveDaysAsync(
        DateTime startDatetime,
        DateTime endDatetime,
        decimal requestedDays,
        bool allowZero,
        CancellationToken cancellationToken)
    {
        var start = ToThaiDate(startDatetime);
        var end = ToThaiDate(endDatetime);
        var isHalfDay = start == end && requestedDays > 0 && requestedDays < 1;
        var calc = await CalculateLeaveDaysAsync(start, end, isHalfDay, cancellationToken);

        if (!allowZero && calc.LeaveDays <= 0)
        {
            throw new InvalidOperationException(
                "ช่วงวันที่เลือกตรงกับวันหยุดทั้งหมด (ตามวันทำงานประจำสัปดาห์และวันหยุดบริษัท) จึงไม่มีวันที่ต้องลา");
        }

        return calc;
    }

    /// <summary>
    /// ดึงยอดวันลาของพนักงาน/ประเภท/ปี — ถ้ายังไม่มีจะสร้างให้อัตโนมัติตามนโยบายการลา
    /// (เหมือนการกด "จัดสรรยอดวันลาประจำปี" แต่ทำเฉพาะรายการที่ต้องใช้)
    /// คืนค่า IsQuotaControlled = ประเภทการลานี้มีนโยบายกำหนดสิทธิ์ (ต้องตรวจโควตา)
    /// </summary>
    private async Task<(LeaveBalance Balance, bool IsQuotaControlled)> EnsureLeaveBalanceAsync(
        long employeeId,
        long leaveTypeId,
        int year,
        long? actorEmployeeId,
        CancellationToken cancellationToken)
    {
        var policies = await _context.LeavePolicies
            .AsNoTracking()
            .Where(p => p.LeaveTypeId == leaveTypeId)
            .ToListAsync(cancellationToken);
        var isQuotaControlled = policies.Count > 0;

        var balance = await _context.LeaveBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.LeaveTypeId == leaveTypeId && b.Year == year, cancellationToken);

        // มียอดจริงอยู่แล้ว (หรือไม่มีนโยบายให้จัดสรร) → ใช้ตามเดิม
        if (balance != null && (balance.AnnualQuotaDays > 0 || !isQuotaControlled))
        {
            return (balance, isQuotaControlled);
        }

        // เลือกนโยบายที่ตรงกับพนักงาน (ประเภท/ระดับพนักงาน) — ตรรกะเดียวกับ InitializeYearBalanceAsync
        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.IsCurrent, cancellationToken);
        var policy = policies
            .Where(p => p.EmployeeTypeId == null || p.EmployeeTypeId == assign?.EmployeeTypeId)
            .OrderByDescending(p => p.EmployeeLevelId == assign?.EmployeeLevelId)
            .FirstOrDefault();

        var entitlement = policy?.EntitlementDays ?? 0m;
        decimal carriedDays = 0m;
        DateOnly? carryExpiry = null;
        if (policy != null && policy.IsCarryForwardAllowed)
        {
            var prev = await _context.LeaveBalances
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.LeaveTypeId == leaveTypeId && b.Year == year - 1, cancellationToken);
            if (prev != null && prev.NetRemainingLeaveDays > 0)
            {
                carriedDays = Math.Min(prev.NetRemainingLeaveDays, policy.EntitlementDays);
                var expiryMonths = policy.CarryForwardExpiryMonths ?? policy.CarryForwardMaxMonths ?? 3;
                carryExpiry = new DateOnly(year, 1, 1).AddMonths(expiryMonths);
            }
        }

        if (balance == null)
        {
            balance = new LeaveBalance
            {
                EmployeeId = employeeId,
                LeaveTypeId = leaveTypeId,
                Year = year,
                BroughtForwardDays = 0,
                AnnualQuotaDays = 0,
                ActiveCarriedForwardDays = 0,
                UsedDays = 0,
                AdjustedDays = 0,
                NetRemainingLeaveDays = 0,
            };
            _context.LeaveBalances.Add(balance);
        }

        // ยอดที่ยังไม่เคยจัดสรรโควตาจริง (stub) → จัดสรรตามนโยบาย
        if (balance.AnnualQuotaDays <= 0 && entitlement > 0)
        {
            balance.AnnualQuotaDays = entitlement;
            balance.ActiveCarriedForwardDays = carriedDays;
            balance.CarryForwardExpiry = carryExpiry;
            balance.Transactions.Add(new LeaveBalanceTransaction
            {
                TransactionType = "ENTITLEMENT",
                Amount = entitlement,
                Note = $"จัดสรรโควตาวันลาประจำปี {year} (อัตโนมัติ)",
                CreatedAt = DateTime.UtcNow,
                CreatedByEmployeeId = actorEmployeeId
            });
            if (carriedDays > 0)
            {
                balance.Transactions.Add(new LeaveBalanceTransaction
                {
                    TransactionType = "CARRY_FORWARD",
                    Amount = carriedDays,
                    Note = $"ยอดยกมาจากปี {year - 1}",
                    CreatedAt = DateTime.UtcNow,
                    CreatedByEmployeeId = actorEmployeeId
                });
            }
        }

        RecalculateNetRemaining(balance);
        return (balance, isQuotaControlled);
    }

    private static void RecalculateNetRemaining(LeaveBalance balance)
    {
        balance.NetRemainingLeaveDays = balance.BroughtForwardDays
                                      + balance.AnnualQuotaDays
                                      + balance.ActiveCarriedForwardDays
                                      - balance.UsedDays
                                      + balance.AdjustedDays;
    }

    /// <summary>จำนวนวันของคำขอที่ "รออนุมัติ" (ถูกกันโควตาไว้) ในปีเดียวกัน</summary>
    private async Task<decimal> GetPendingLeaveDaysAsync(
        long employeeId,
        long leaveTypeId,
        int year,
        long? excludeRequestId,
        CancellationToken cancellationToken)
    {
        // กรองช่วงกว้างใน DB ก่อน แล้วค่อยเทียบปีตามเวลาไทยในหน่วยความจำ
        var from = new DateTime(year - 1, 12, 31, 0, 0, 0, DateTimeKind.Utc);
        var to = new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var pending = await _context.LeaveRequests
            .AsNoTracking()
            .Where(r => r.EmployeeId == employeeId
                        && r.LeaveTypeId == leaveTypeId
                        && r.Status == "PENDING"
                        && (excludeRequestId == null || r.Id != excludeRequestId)
                        && r.StartDatetime >= from && r.StartDatetime < to)
            .Select(r => new { r.StartDatetime, r.LeaveDays })
            .ToListAsync(cancellationToken);

        return pending.Where(r => ToThaiDate(r.StartDatetime).Year == year).Sum(r => r.LeaveDays);
    }

    /// <summary>
    /// ตรวจว่าโควตาพอสำหรับคำขอนี้หรือไม่
    /// includePending = true (ตอนยื่น): หักยอดที่รออนุมัติของใบอื่นออกก่อน
    /// includePending = false (ตอนอนุมัติ): เทียบกับยอดคงเหลือจริง
    /// </summary>
    private async Task EnsureQuotaAvailableAsync(
        LeaveBalance balance,
        bool isQuotaControlled,
        decimal requestedDays,
        bool includePending,
        long? excludeRequestId,
        CancellationToken cancellationToken)
    {
        if (!isQuotaControlled || requestedDays <= 0) return;

        var pendingDays = includePending
            ? await GetPendingLeaveDaysAsync(balance.EmployeeId, balance.LeaveTypeId, balance.Year, excludeRequestId, cancellationToken)
            : 0m;
        var available = balance.NetRemainingLeaveDays - pendingDays;
        if (available >= requestedDays) return;

        if (pendingDays > 0)
        {
            throw new InvalidOperationException(
                $"วันลาคงเหลือไม่เพียงพอ (คงเหลือ {FormatDays(balance.NetRemainingLeaveDays)} วัน, " +
                $"รออนุมัติอยู่ {FormatDays(pendingDays)} วัน, ใช้ได้อีก {FormatDays(Math.Max(0, available))} วัน, " +
                $"ขอลา {FormatDays(requestedDays)} วัน)");
        }

        throw new InvalidOperationException(
            $"วันลาคงเหลือไม่เพียงพอ (คงเหลือ {FormatDays(balance.NetRemainingLeaveDays)} วัน, ขอลา {FormatDays(requestedDays)} วัน)");
    }
}
