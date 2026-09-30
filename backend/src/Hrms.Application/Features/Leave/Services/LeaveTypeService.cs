using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeaveTypeService : ILeaveTypeService
{
    private readonly IHrmsDbContext _context;
    private readonly ILeaveEntitlementSync _sync;

    public LeaveTypeService(IHrmsDbContext context, ILeaveEntitlementSync sync)
    {
        _context = context;
        _sync = sync;
    }

    public async Task<List<LeaveTypeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var types = await _context.LeaveTypes
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .ToListAsync(cancellationToken);

        var requestCounts = await _context.LeaveRequests.AsNoTracking()
            .GroupBy(r => r.LeaveTypeId)
            .Select(g => new { LeaveTypeId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.LeaveTypeId, x => x.Count, cancellationToken);

        var adjustedTypeIds = (await _context.LeaveBalanceTransactions.AsNoTracking()
                .Where(t => t.TransactionType == "ADJUSTMENT")
                .Select(t => t.LeaveBalance!.LeaveTypeId)
                .Distinct()
                .ToListAsync(cancellationToken))
            .ToHashSet();

        return types.Select(t =>
        {
            requestCounts.TryGetValue(t.Id, out var count);
            var reason = DeleteBlockedReason(count, adjustedTypeIds.Contains(t.Id));
            return new LeaveTypeDto
            {
                Id = t.Id,
                LeaveCode = t.LeaveCode,
                LeaveName = t.LeaveName,
                QuotaUnit = t.QuotaUnit,
                IsPaidLeave = t.IsPaidLeave,
                DocumentDescription = t.DocumentDescription,
                Status = t.Status,
                FormCategory = t.FormCategory ?? LeavePolicyRules.InferFormCategory(t.LeaveCode, t.LeaveName),
                RequestCount = count,
                CanDelete = reason == null,
                DeleteBlockedReason = reason
            };
        }).ToList();
    }

    /// <summary>เหตุผลที่ลบประเภทการลาไม่ได้ (null = ลบได้)</summary>
    private static string? DeleteBlockedReason(int requestCount, bool hasManualAdjustment)
    {
        if (requestCount > 0)
            return $"มีใบลาประเภทนี้แล้ว {requestCount} ใบ ลบไม่ได้เพื่อเก็บประวัติ — ใช้ \"ปิดใช้งาน\" ในหน้าแก้ไขแทน";
        if (hasManualAdjustment)
            return "มีการปรับยอดวันลาประเภทนี้ด้วยมือแล้ว ลบไม่ได้เพื่อเก็บประวัติ — ใช้ \"ปิดใช้งาน\" ในหน้าแก้ไขแทน";
        return null;
    }

    public async Task<LeaveTypeDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var t = await _context.LeaveTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (t == null) return null;

        return new LeaveTypeDto
        {
            Id = t.Id,
            LeaveCode = t.LeaveCode,
            LeaveName = t.LeaveName,
            QuotaUnit = t.QuotaUnit,
            IsPaidLeave = t.IsPaidLeave,
            DocumentDescription = t.DocumentDescription,
            Status = t.Status,
            FormCategory = t.FormCategory ?? LeavePolicyRules.InferFormCategory(t.LeaveCode, t.LeaveName)
        };
    }

    public async Task<string> GetNextLeaveCodeAsync(CancellationToken cancellationToken = default)
    {
        var codes = await _context.LeaveTypes.AsNoTracking()
            .Select(t => t.LeaveCode)
            .ToListAsync(cancellationToken);

        int max = 0;
        foreach (var code in codes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;
            var m = System.Text.RegularExpressions.Regex.Match(code.Trim(), @"^LV(\d+)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups[1].Value, out var n) && n > max) max = n;
        }
        return $"LV{max + 1:D3}";
    }

    public async Task<LeaveTypeDto> CreateAsync(CreateLeaveTypeRequest request, CancellationToken cancellationToken = default)
    {
        // รหัสสร้างอัตโนมัติ (LV001, LV002, ...) ถ้าไม่ได้ระบุมา
        var leaveCode = string.IsNullOrWhiteSpace(request.LeaveCode)
            ? await GetNextLeaveCodeAsync(cancellationToken)
            : request.LeaveCode.Trim().ToUpperInvariant();

        var exists = await _context.LeaveTypes
            .AnyAsync(t => t.LeaveCode == leaveCode, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"รหัสประเภทการลา '{leaveCode}' มีอยู่ในระบบแล้ว");
        }

        var leaveType = new LeaveType
        {
            LeaveCode = leaveCode,
            LeaveName = request.LeaveName.Trim(),
            QuotaUnit = request.QuotaUnit.ToUpper(),
            IsPaidLeave = request.IsPaidLeave,
            DocumentDescription = string.IsNullOrWhiteSpace(request.DocumentDescription) ? null : request.DocumentDescription.Trim(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.ToUpper(),
            FormCategory = LeavePolicyRules.NormalizeFormCategory(request.FormCategory)
                           ?? LeavePolicyRules.InferFormCategory(leaveCode, request.LeaveName)
        };

        _context.LeaveTypes.Add(leaveType);
        await _context.SaveChangesAsync(cancellationToken);

        // สร้างยอดวันลาประเภทนี้ให้พนักงานทุกคน (ปีปัจจุบัน) — สิทธิ์ปีนี้คำนวณจากสิทธิ์การลา
        // (ไม่ใช้ "โควตาเริ่มต้น" จากฟอร์มประเภทการลาอีกต่อไป ตั้งจำนวนวันที่แท็บสิทธิ์การลาที่เดียว)
        if (leaveType.Status == "ACTIVE")
        {
            await _sync.SyncAsync(LeavePolicyRules.ThaiToday().Year, null, leaveType.Id, cancellationToken);
        }
        return new LeaveTypeDto
        {
            Id = leaveType.Id,
            LeaveCode = leaveType.LeaveCode,
            LeaveName = leaveType.LeaveName,
            QuotaUnit = leaveType.QuotaUnit,
            IsPaidLeave = leaveType.IsPaidLeave,
            DocumentDescription = leaveType.DocumentDescription,
            Status = leaveType.Status,
            FormCategory = leaveType.FormCategory ?? LeavePolicyRules.InferFormCategory(leaveType.LeaveCode, leaveType.LeaveName)
        };
    }

    public async Task<LeaveTypeDto> UpdateAsync(long id, UpdateLeaveTypeRequest request, CancellationToken cancellationToken = default)
    {
        var leaveType = await _context.LeaveTypes.FindAsync([id], cancellationToken);
        if (leaveType == null)
        {
            throw new KeyNotFoundException($"ไม่พบประเภทการลารหัส ID {id}");
        }

        leaveType.LeaveName = request.LeaveName.Trim();
        leaveType.QuotaUnit = request.QuotaUnit.ToUpper();
        leaveType.IsPaidLeave = request.IsPaidLeave;
        leaveType.DocumentDescription = string.IsNullOrWhiteSpace(request.DocumentDescription) ? null : request.DocumentDescription.Trim();
        leaveType.Status = request.Status.ToUpper();
        if (!string.IsNullOrWhiteSpace(request.FormCategory))
            leaveType.FormCategory = LeavePolicyRules.NormalizeFormCategory(request.FormCategory);

        await _context.SaveChangesAsync(cancellationToken);
        if (leaveType.Status == "ACTIVE")
        {
            await _sync.SyncAsync(LeavePolicyRules.ThaiToday().Year, null, leaveType.Id, cancellationToken);
        }

        return new LeaveTypeDto
        {
            Id = leaveType.Id,
            LeaveCode = leaveType.LeaveCode,
            LeaveName = leaveType.LeaveName,
            QuotaUnit = leaveType.QuotaUnit,
            IsPaidLeave = leaveType.IsPaidLeave,
            DocumentDescription = leaveType.DocumentDescription,
            Status = leaveType.Status,
            FormCategory = leaveType.FormCategory ?? LeavePolicyRules.InferFormCategory(leaveType.LeaveCode, leaveType.LeaveName)
        };
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var leaveType = await _context.LeaveTypes.FindAsync([id], cancellationToken);
        if (leaveType == null) return false;

        // มีประวัติการใช้งานจริง (ใบลา / ปรับยอดด้วยมือ) → ห้ามลบ ให้ปิดใช้งานแทน
        var requestCount = await _context.LeaveRequests.CountAsync(r => r.LeaveTypeId == id, cancellationToken);
        var hasManualAdjustment = await _context.LeaveBalanceTransactions
            .AnyAsync(t => t.TransactionType == "ADJUSTMENT" && t.LeaveBalance!.LeaveTypeId == id, cancellationToken);
        var reason = DeleteBlockedReason(requestCount, hasManualAdjustment);
        if (reason != null)
            throw new BusinessRuleException(reason);

        // ยังไม่เคยถูกใช้: ลบถาวรพร้อมข้อมูลที่ระบบสร้างให้อัตโนมัติ (สิทธิ์การลา / ยอดวันลา)
        var balanceIds = await _context.LeaveBalances
            .Where(b => b.LeaveTypeId == id)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);
        if (balanceIds.Count > 0)
        {
            var transactions = await _context.LeaveBalanceTransactions
                .Where(t => balanceIds.Contains(t.LeaveBalanceId))
                .ToListAsync(cancellationToken);
            _context.LeaveBalanceTransactions.RemoveRange(transactions);
            var balances = await _context.LeaveBalances
                .Where(b => b.LeaveTypeId == id)
                .ToListAsync(cancellationToken);
            _context.LeaveBalances.RemoveRange(balances);
        }

        var policies = await _context.LeavePolicies
            .Where(p => p.LeaveTypeId == id)
            .ToListAsync(cancellationToken);
        _context.LeavePolicies.RemoveRange(policies);

        _context.LeaveTypes.Remove(leaveType);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
