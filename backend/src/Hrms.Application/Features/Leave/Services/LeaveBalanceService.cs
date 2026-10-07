using System.Collections.Concurrent;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeaveBalanceService : ILeaveBalanceService
{
    private readonly IHrmsDbContext _context;
    private readonly ILeaveEntitlementSync _sync;

    // ซิงค์สิทธิ์การลาตอน "อ่าน" ไม่เกิน 1 ครั้งต่อ 5 นาทีต่อขอบเขตเดียวกัน
    // (เดิมซิงค์ทุกครั้งที่เปิดหน้า → query + บันทึกฐานข้อมูลหลายรอบ ทำให้ my-summary ช้า 9-15 วินาที)
    // การแก้นโยบาย/ประเภทการลา/อนุมัติลา ยังเรียก ILeaveEntitlementSync ตรงเหมือนเดิม จึงไม่กระทบความถูกต้อง
    private static readonly ConcurrentDictionary<string, DateTime> LastReadSync = new();
    private static readonly TimeSpan ReadSyncInterval = TimeSpan.FromMinutes(5);

    private async Task SyncForReadAsync(int year, long? employeeId, long? leaveTypeId, CancellationToken cancellationToken)
    {
        var key = $"{year}|{employeeId?.ToString() ?? "*"}|{leaveTypeId?.ToString() ?? "*"}";
        var now = DateTime.UtcNow;
        if (LastReadSync.TryGetValue(key, out var last) && now - last < ReadSyncInterval)
            return;

        await _sync.SyncAsync(year, employeeId.HasValue ? new[] { employeeId.Value } : null, leaveTypeId, cancellationToken);
        LastReadSync[key] = now;
    }

    public LeaveBalanceService(IHrmsDbContext context, ILeaveEntitlementSync sync)
    {
        _context = context;
        _sync = sync;
    }

    public async Task<List<LeaveBalanceDto>> GetAllAsync(long? employeeId = null, int? year = null, long? leaveTypeId = null, CancellationToken cancellationToken = default)
    {
        // คำนวณสิทธิ์ปีนี้อัตโนมัติจากสิทธิ์การลาก่อนแสดงผล (ไม่ต้องกดจัดสรรยอดประจำปี)
        var syncYear = year ?? LeavePolicyRules.ThaiToday().Year;
        await SyncForReadAsync(syncYear, employeeId, leaveTypeId, cancellationToken);

        var query = _context.LeaveBalances
            .AsNoTracking()
            .Include(b => b.Employee)
            .Include(b => b.LeaveType)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(b => b.EmployeeId == employeeId.Value);
        }

        if (year.HasValue)
        {
            query = query.Where(b => b.Year == year.Value);
        }

        if (leaveTypeId.HasValue)
        {
            query = query.Where(b => b.LeaveTypeId == leaveTypeId.Value);
        }

        var balances = await query
            .OrderBy(b => b.EmployeeId)
            .ThenBy(b => b.LeaveTypeId)
            .ToListAsync(cancellationToken);

        var empIds = balances.Select(b => b.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        return balances.Select(b =>
        {
            assignments.TryGetValue(b.EmployeeId, out var assign);
            var emp = b.Employee;
            var empName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty;

            return new LeaveBalanceDto
            {
                Id = b.Id,
                EmployeeId = b.EmployeeId,
                EmployeeCode = emp?.EmployeeCode ?? string.Empty,
                EmployeeName = empName,
                DepartmentName = assign?.Department?.DepartmentName ?? "-",
                PositionTitle = assign?.Position?.PositionName ?? "-",
                LeaveTypeId = b.LeaveTypeId,
                LeaveTypeCode = b.LeaveType?.LeaveCode ?? string.Empty,
                LeaveTypeName = b.LeaveType?.LeaveName ?? string.Empty,
                Year = b.Year,
                BroughtForwardDays = b.BroughtForwardDays,
                AnnualQuotaDays = b.AnnualQuotaDays,
                ActiveCarriedForwardDays = b.ActiveCarriedForwardDays,
                UsedDays = b.UsedDays,
                AdjustedDays = b.AdjustedDays,
                NetRemainingLeaveDays = b.NetRemainingLeaveDays,
                CarryForwardExpiry = b.CarryForwardExpiry
            };
        }).ToList();
    }

    public async Task<List<LeaveBalanceTransactionDto>> GetTransactionsAsync(long leaveBalanceId, CancellationToken cancellationToken = default)
    {
        return await _context.LeaveBalanceTransactions
            .AsNoTracking()
            .Include(t => t.CreatedByEmployee)
            .Where(t => t.LeaveBalanceId == leaveBalanceId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new LeaveBalanceTransactionDto
            {
                Id = t.Id,
                LeaveBalanceId = t.LeaveBalanceId,
                TransactionType = t.TransactionType,
                Amount = t.Amount,
                ReferenceType = t.ReferenceType,
                ReferenceId = t.ReferenceId,
                Note = t.Note,
                CreatedAt = t.CreatedAt,
                CreatedByEmployeeName = t.CreatedByEmployee != null
                    ? $"{t.CreatedByEmployee.FirstName} {t.CreatedByEmployee.LastName}".Trim()
                    : null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<LeaveBalanceDto> AdjustBalanceAsync(LeaveBalanceAdjustmentRequest request, long? currentEmployeeId = null, CancellationToken cancellationToken = default)
    {
        var balance = await _context.LeaveBalances
            .Include(b => b.Employee)
            .Include(b => b.LeaveType)
            .FirstOrDefaultAsync(b => b.Id == request.LeaveBalanceId, cancellationToken);

        if (balance == null)
        {
            throw new KeyNotFoundException($"ไม่พบยอดวันลารหัส ID {request.LeaveBalanceId}");
        }

        // Apply adjustment
        balance.AdjustedDays += request.Amount;
        balance.NetRemainingLeaveDays = balance.BroughtForwardDays 
                                      + balance.AnnualQuotaDays 
                                      + balance.ActiveCarriedForwardDays 
                                      - balance.UsedDays 
                                      + balance.AdjustedDays;

        // Record transaction
        var tx = new LeaveBalanceTransaction
        {
            LeaveBalanceId = balance.Id,
            TransactionType = "ADJUSTMENT",
            Amount = request.Amount,
            Note = request.Reason,
            CreatedAt = DateTime.UtcNow,
            CreatedByEmployeeId = currentEmployeeId
        };

        _context.LeaveBalanceTransactions.Add(tx);
        await _context.SaveChangesAsync(cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == balance.EmployeeId && a.IsCurrent, cancellationToken);

        var emp = balance.Employee;
        return new LeaveBalanceDto
        {
            Id = balance.Id,
            EmployeeId = balance.EmployeeId,
            EmployeeCode = emp?.EmployeeCode ?? string.Empty,
            EmployeeName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty,
            DepartmentName = assign?.Department?.DepartmentName ?? "-",
            PositionTitle = assign?.Position?.PositionName ?? "-",
            LeaveTypeId = balance.LeaveTypeId,
            LeaveTypeCode = balance.LeaveType?.LeaveCode ?? string.Empty,
            LeaveTypeName = balance.LeaveType?.LeaveName ?? string.Empty,
            Year = balance.Year,
            BroughtForwardDays = balance.BroughtForwardDays,
            AnnualQuotaDays = balance.AnnualQuotaDays,
            ActiveCarriedForwardDays = balance.ActiveCarriedForwardDays,
            UsedDays = balance.UsedDays,
            AdjustedDays = balance.AdjustedDays,
            NetRemainingLeaveDays = balance.NetRemainingLeaveDays,
            CarryForwardExpiry = balance.CarryForwardExpiry
        };
    }

    public async Task<MyLeaveSummaryDto> GetMySummaryAsync(long employeeId, int year, CancellationToken cancellationToken = default)
    {
        // Convert Thai Buddhist Year (e.g. 2569) to CE (2026)
        if (year > 2400)
        {
            year -= 543;
        }

        // คำนวณสิทธิ์ปีนี้อัตโนมัติก่อนสรุปยอด (หน้า ESS) — GetAllAsync ด้านล่างซิงค์ให้แล้ว ไม่ต้องซิงค์ซ้ำ

        var employee = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Position)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        var currentAssignment = employee?.Assignments?.FirstOrDefault(a => a.IsCurrent);
        string employeeName = employee != null
            ? $"{employee.Prefix} {employee.FirstName} {employee.LastName}".Trim()
            : string.Empty;

        // ดึงยอดวันลาคงเหลือของพนักงานในปีที่เลือก
        var balances = await GetAllAsync(employeeId, year, null, cancellationToken);

        // ดึงสิทธิ์โควตาตามนโยบายบริษัท (Leave Policies) เพื่อใช้เป็น Quota มาตรฐาน
        var policies = await _context.LeavePolicies
            .AsNoTracking()
            .Include(p => p.LeaveType)
            .ToListAsync(cancellationToken);

        // ดึงคำร้องขอลาที่ได้รับอนุมัติแล้ว (APPROVED) ของพนักงานในปีที่เลือก
        var approvedRequests = await _context.LeaveRequests
            .AsNoTracking()
            .Include(r => r.LeaveType)
            .Where(r => r.EmployeeId == employeeId &&
                        r.Status == "APPROVED" &&
                        r.StartDatetime.Year == year)
            .ToListAsync(cancellationToken);

        // ดึงจำนวนชั่วโมง OT สะสมจาก AttendanceMonthlySummaries
        var monthlyOt = await _context.AttendanceMonthlySummaries
            .AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.Year == year)
            .SumAsync(a => a.TotalOvertimeHours, cancellationToken);

        // ค้นหา balance ของแต่ละประเภท
        var sickBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("SICK", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("ป่วย"));
        var personalBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("PERSONAL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("กิจ"));
        var annualBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("ANNUAL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("พักร้อน"));
        var specialBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("TRAVEL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeCode.Equals("SPECIAL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("พิเศษ") || b.LeaveTypeName.Contains("เที่ยว"));
        var ordBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("ORDINATION", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("บวช"));
        var militaryBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("MILITARY", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("ทหาร"));
        var matBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("MATERNITY", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("คลอด"));

        decimal GetQuota(LeaveBalanceDto? bal, string leaveCode, decimal defaultDays)
        {
            if (bal != null && bal.AnnualQuotaDays > 0) return bal.AnnualQuotaDays;
            var pol = policies.FirstOrDefault(p => p.LeaveType != null && p.LeaveType.LeaveCode.Equals(leaveCode, StringComparison.OrdinalIgnoreCase));
            if (pol != null && pol.EntitlementDays > 0) return pol.EntitlementDays;
            return defaultDays;
        }

        decimal GetUsed(LeaveBalanceDto? bal, string leaveCode)
        {
            if (bal != null && bal.UsedDays > 0) return bal.UsedDays;
            var reqs = approvedRequests
                .Where(r => r.LeaveType != null && r.LeaveType.LeaveCode.Equals(leaveCode, StringComparison.OrdinalIgnoreCase))
                .Sum(r => r.LeaveDays);
            return reqs;
        }

        int GetTimes(string leaveCode)
        {
            return approvedRequests.Count(r => r.LeaveType != null && r.LeaveType.LeaveCode.Equals(leaveCode, StringComparison.OrdinalIgnoreCase));
        }

        var sickQuota = GetQuota(sickBal, "SICK", 30m);
        var sickUsed = GetUsed(sickBal, "SICK");

        var personalQuota = GetQuota(personalBal, "PERSONAL", 3m);
        var personalUsed = GetUsed(personalBal, "PERSONAL");

        var annualQuota = GetQuota(annualBal, "ANNUAL", 6m);
        var annualUsed = GetUsed(annualBal, "ANNUAL");

        var specialQuota = GetQuota(specialBal, "TRAVEL", 10m);
        var specialUsed = GetUsed(specialBal, "TRAVEL");

        var ordQuota = GetQuota(ordBal, "ORDINATION", 30m);
        var ordUsed = GetUsed(ordBal, "ORDINATION");

        var militaryQuota = GetQuota(militaryBal, "MILITARY", 365m);
        var militaryUsed = GetUsed(militaryBal, "MILITARY");

        var matQuota = GetQuota(matBal, "MATERNITY", 98m);
        var matUsed = GetUsed(matBal, "MATERNITY");

        return new MyLeaveSummaryDto
        {
            EmployeeId = employeeId,
            EmployeeCode = employee?.EmployeeCode ?? string.Empty,
            EmployeeName = employeeName,
            DepartmentName = currentAssignment?.Department?.DepartmentName ?? string.Empty,
            PositionTitle = currentAssignment?.Position?.PositionName ?? string.Empty,
            Year = year,
            YearThai = year + 543,
            SickLeave = new LeaveCardItemDto
            {
                Code = "SICK",
                Title = "ลาป่วยปีนี้ไปแล้ว",
                UsedDays = sickUsed,
                QuotaDays = sickQuota,
                RemainingDays = Math.Max(0, sickQuota - sickUsed),
                Unit = "วัน"
            },
            PersonalLeave = new LeaveCardItemDto
            {
                Code = "PERSONAL",
                Title = "ลากิจปีนี้ไปแล้ว",
                UsedDays = personalUsed,
                QuotaDays = personalQuota,
                RemainingDays = Math.Max(0, personalQuota - personalUsed),
                Unit = "วัน"
            },
            AnnualLeave = new LeaveCardItemDto
            {
                Code = "ANNUAL",
                Title = "ลาพักร้อนปีนี้ไปแล้ว",
                UsedDays = annualUsed,
                QuotaDays = annualQuota,
                RemainingDays = annualBal != null && annualBal.NetRemainingLeaveDays >= 0 ? annualBal.NetRemainingLeaveDays : Math.Max(0, annualQuota - annualUsed),
                Unit = "วัน"
            },
            SpecialLeave = new LeaveCardItemDto
            {
                Code = "SPECIAL",
                Title = "ลาพิเศษปีนี้ไปแล้ว",
                UsedDays = specialUsed,
                QuotaDays = specialQuota,
                RemainingDays = Math.Max(0, specialQuota - specialUsed),
                Unit = "วัน"
            },
            OrdinationLeave = new LeaveCardItemDto
            {
                Code = "ORDINATION",
                Title = "ลาบวชไปแล้ว",
                UsedDays = ordUsed,
                QuotaDays = ordQuota,
                RemainingDays = Math.Max(0, ordQuota - ordUsed),
                UsedTimes = GetTimes("ORDINATION"),
                MaxTimes = 1,
                Unit = "วัน"
            },
            MilitaryLeave = new LeaveCardItemDto
            {
                Code = "MILITARY",
                Title = "ลาเกณฑ์ทหารไปแล้ว",
                UsedDays = militaryUsed,
                QuotaDays = militaryQuota,
                RemainingDays = Math.Max(0, militaryQuota - militaryUsed),
                UsedTimes = GetTimes("MILITARY"),
                MaxTimes = 1,
                Unit = "วัน"
            },
            MaternityLeave = new LeaveCardItemDto
            {
                Code = "MATERNITY",
                Title = "ลาคลอดไปแล้ว",
                UsedDays = matUsed,
                QuotaDays = matQuota,
                RemainingDays = Math.Max(0, matQuota - matUsed),
                Unit = "วัน"
            },
            TotalOvertimeHours = monthlyOt,
            AllBalances = balances
        };
    }

}

