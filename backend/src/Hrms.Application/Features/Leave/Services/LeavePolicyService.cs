using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeavePolicyService : ILeavePolicyService
{
    private readonly IHrmsDbContext _context;

    public LeavePolicyService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<LeavePolicyDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.LeavePolicies
            .AsNoTracking()
            .Include(p => p.LeaveType)
            .Include(p => p.EmployeeType)
            .Include(p => p.EmployeeLevel)
            .OrderBy(p => p.LeaveTypeId)
            .ThenBy(p => p.EmployeeLevelId)
            .Select(p => new LeavePolicyDto
            {
                Id = p.Id,
                LeaveTypeId = p.LeaveTypeId,
                LeaveTypeCode = p.LeaveType != null ? p.LeaveType.LeaveCode : string.Empty,
                LeaveTypeName = p.LeaveType != null ? p.LeaveType.LeaveName : string.Empty,
                EmployeeTypeId = p.EmployeeTypeId,
                EmployeeTypeName = p.EmployeeType != null ? p.EmployeeType.TypeName : null,
                EmployeeLevelId = p.EmployeeLevelId,
                EmployeeLevelName = p.EmployeeLevel != null ? p.EmployeeLevel.LevelName : null,
                EntitlementDays = p.EntitlementDays,
                MinimumServiceDays = p.MinimumServiceDays,
                AdvanceRequestDays = p.AdvanceRequestDays,
                IsCarryForwardAllowed = p.IsCarryForwardAllowed,
                CarryForwardMaxMonths = p.CarryForwardMaxMonths,
                CarryForwardExpiryMonths = p.CarryForwardExpiryMonths,
                IsDocumentRequired = p.IsDocumentRequired,
                DocumentRequiredAfterDays = p.DocumentRequiredAfterDays,
                IsAllowedDuringProbation = p.IsAllowedDuringProbation,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                MaxLifetimeOccurrences = p.MaxLifetimeOccurrences,
                MaxDaysPerOccurrence = p.MaxDaysPerOccurrence,
                MaxOccurrencesPerYear = p.MaxOccurrencesPerYear,
                CarryForwardMaxDays = p.CarryForwardMaxDays,
                MaxBackdateDays = p.MaxBackdateDays,
                ProrationMethod = p.ProrationMethod
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<LeavePolicyDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var p = await _context.LeavePolicies
            .AsNoTracking()
            .Include(x => x.LeaveType)
            .Include(x => x.EmployeeType)
            .Include(x => x.EmployeeLevel)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (p == null) return null;

        return new LeavePolicyDto
        {
            Id = p.Id,
            LeaveTypeId = p.LeaveTypeId,
            LeaveTypeCode = p.LeaveType != null ? p.LeaveType.LeaveCode : string.Empty,
            LeaveTypeName = p.LeaveType != null ? p.LeaveType.LeaveName : string.Empty,
            EmployeeTypeId = p.EmployeeTypeId,
            EmployeeTypeName = p.EmployeeType != null ? p.EmployeeType.TypeName : null,
            EmployeeLevelId = p.EmployeeLevelId,
            EmployeeLevelName = p.EmployeeLevel != null ? p.EmployeeLevel.LevelName : null,
            EntitlementDays = p.EntitlementDays,
            MinimumServiceDays = p.MinimumServiceDays,
            AdvanceRequestDays = p.AdvanceRequestDays,
            IsCarryForwardAllowed = p.IsCarryForwardAllowed,
            CarryForwardMaxMonths = p.CarryForwardMaxMonths,
            CarryForwardExpiryMonths = p.CarryForwardExpiryMonths,
            IsDocumentRequired = p.IsDocumentRequired,
            DocumentRequiredAfterDays = p.DocumentRequiredAfterDays,
            IsAllowedDuringProbation = p.IsAllowedDuringProbation,
            EffectiveFrom = p.EffectiveFrom,
            EffectiveTo = p.EffectiveTo,
            MaxLifetimeOccurrences = p.MaxLifetimeOccurrences,
            MaxDaysPerOccurrence = p.MaxDaysPerOccurrence,
            MaxOccurrencesPerYear = p.MaxOccurrencesPerYear,
            CarryForwardMaxDays = p.CarryForwardMaxDays,
            MaxBackdateDays = p.MaxBackdateDays,
            ProrationMethod = p.ProrationMethod
        };
    }

    public async Task<LeavePolicyDto> CreateAsync(CreateLeavePolicyRequest request, CancellationToken cancellationToken = default)
    {
        var leaveType = await _context.LeaveTypes.FindAsync([request.LeaveTypeId], cancellationToken);
        if (leaveType == null)
        {
            throw new KeyNotFoundException($"ไม่พบประเภทการลารหัส ID {request.LeaveTypeId}");
        }

        ValidatePolicyValues(request.EntitlementDays, request.MinimumServiceDays, request.AdvanceRequestDays,
            request.MaxBackdateDays, request.MaxDaysPerOccurrence, request.MaxOccurrencesPerYear, request.MaxLifetimeOccurrences,
            request.CarryForwardMaxDays, request.CarryForwardExpiryMonths, request.EffectiveFrom, request.EffectiveTo);
        await EnsureNoDuplicateAsync(null, request.LeaveTypeId, request.EmployeeTypeId, request.EmployeeLevelId,
            request.EffectiveFrom, request.EffectiveTo, cancellationToken);

        var policy = new LeavePolicy
        {
            LeaveTypeId = request.LeaveTypeId,
            EmployeeTypeId = request.EmployeeTypeId,
            EmployeeLevelId = request.EmployeeLevelId,
            EntitlementDays = request.EntitlementDays,
            MinimumServiceDays = request.MinimumServiceDays,
            AdvanceRequestDays = request.AdvanceRequestDays,
            IsCarryForwardAllowed = request.IsCarryForwardAllowed,
            CarryForwardMaxMonths = null,
            CarryForwardMaxDays = request.IsCarryForwardAllowed ? request.CarryForwardMaxDays : null,
            CarryForwardExpiryMonths = request.IsCarryForwardAllowed ? request.CarryForwardExpiryMonths : null,
            IsDocumentRequired = request.IsDocumentRequired,
            DocumentRequiredAfterDays = request.IsDocumentRequired ? request.DocumentRequiredAfterDays : null,
            IsAllowedDuringProbation = request.IsAllowedDuringProbation,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            MaxLifetimeOccurrences = request.MaxLifetimeOccurrences,
            MaxDaysPerOccurrence = request.MaxDaysPerOccurrence,
            MaxOccurrencesPerYear = request.MaxOccurrencesPerYear,
            MaxBackdateDays = request.MaxBackdateDays,
            ProrationMethod = LeavePolicyRules.NormalizeProration(request.ProrationMethod)
        };

        _context.LeavePolicies.Add(policy);
        await _context.SaveChangesAsync(cancellationToken);

        await ApplyToUnallocatedBalancesAsync(policy.LeaveTypeId, leaveType.LeaveName, cancellationToken);

        return (await GetByIdAsync(policy.Id, cancellationToken))!;
    }

    public async Task<LeavePolicyDto> UpdateAsync(long id, UpdateLeavePolicyRequest request, CancellationToken cancellationToken = default)
    {
        var policy = await _context.LeavePolicies.FindAsync([id], cancellationToken);
        if (policy == null)
        {
            throw new KeyNotFoundException($"ไม่พบนโยบายการลารหัส ID {id}");
        }

        var effectiveFrom = request.EffectiveFrom ?? policy.EffectiveFrom; // ไม่ส่งมา = คงวันที่มีผลเดิม
        ValidatePolicyValues(request.EntitlementDays, request.MinimumServiceDays, request.AdvanceRequestDays,
            request.MaxBackdateDays, request.MaxDaysPerOccurrence, request.MaxOccurrencesPerYear, request.MaxLifetimeOccurrences,
            request.CarryForwardMaxDays, request.CarryForwardExpiryMonths, effectiveFrom, request.EffectiveTo);
        await EnsureNoDuplicateAsync(policy.Id, policy.LeaveTypeId, request.EmployeeTypeId, request.EmployeeLevelId,
            effectiveFrom, request.EffectiveTo, cancellationToken);

        policy.EmployeeTypeId = request.EmployeeTypeId;
        policy.EmployeeLevelId = request.EmployeeLevelId;
        policy.EntitlementDays = request.EntitlementDays;
        policy.MinimumServiceDays = request.MinimumServiceDays;
        policy.AdvanceRequestDays = request.AdvanceRequestDays;
        policy.IsCarryForwardAllowed = request.IsCarryForwardAllowed;
        policy.CarryForwardMaxMonths = null; // เลิกใช้ (เดิมถูกใช้เก็บจำนวนวันผิดหน่วย) — ใช้ CarryForwardMaxDays แทน
        policy.CarryForwardMaxDays = request.IsCarryForwardAllowed ? request.CarryForwardMaxDays : null;
        policy.CarryForwardExpiryMonths = request.IsCarryForwardAllowed ? request.CarryForwardExpiryMonths : null;
        policy.IsDocumentRequired = request.IsDocumentRequired;
        policy.DocumentRequiredAfterDays = request.IsDocumentRequired ? request.DocumentRequiredAfterDays : null;
        policy.IsAllowedDuringProbation = request.IsAllowedDuringProbation;
        policy.EffectiveFrom = effectiveFrom;
        policy.EffectiveTo = request.EffectiveTo;
        policy.MaxLifetimeOccurrences = request.MaxLifetimeOccurrences;
        policy.MaxDaysPerOccurrence = request.MaxDaysPerOccurrence;
        policy.MaxOccurrencesPerYear = request.MaxOccurrencesPerYear;
        policy.MaxBackdateDays = request.MaxBackdateDays;
        policy.ProrationMethod = LeavePolicyRules.NormalizeProration(request.ProrationMethod);

        await _context.SaveChangesAsync(cancellationToken);

        var leaveTypeName = await _context.LeaveTypes.AsNoTracking()
            .Where(t => t.Id == policy.LeaveTypeId).Select(t => t.LeaveName).FirstOrDefaultAsync(cancellationToken) ?? string.Empty;
        await ApplyToUnallocatedBalancesAsync(policy.LeaveTypeId, leaveTypeName, cancellationToken);

        return (await GetByIdAsync(policy.Id, cancellationToken))!;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var policy = await _context.LeavePolicies.FindAsync([id], cancellationToken);
        if (policy == null) return false;

        _context.LeavePolicies.Remove(policy);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ValidatePolicyValues(
        decimal entitlementDays, int minimumServiceDays, int advanceRequestDays, int? maxBackdateDays,
        decimal? maxDaysPerOccurrence, int? maxOccurrencesPerYear, int? maxLifetimeOccurrences,
        decimal? carryForwardMaxDays, int? carryForwardExpiryMonths, DateOnly effectiveFrom, DateOnly? effectiveTo)
    {
        if (entitlementDays < 0) throw new InvalidOperationException("จำนวนวันลาต่อปีต้องไม่ติดลบ");
        if (minimumServiceDays < 0 || advanceRequestDays < 0 || maxBackdateDays < 0)
            throw new InvalidOperationException("อายุงานขั้นต่ำ / จำนวนวันยื่นล่วงหน้า / ยื่นย้อนหลัง ต้องไม่ติดลบ");
        if (maxDaysPerOccurrence <= 0 || maxOccurrencesPerYear <= 0 || maxLifetimeOccurrences <= 0)
            throw new InvalidOperationException("ค่าจำกัดสูงสุดต่อครั้ง / ต่อปี / ตลอดอายุงาน ต้องมากกว่า 0 (เว้นว่าง = ไม่จำกัด)");
        if (carryForwardMaxDays < 0 || carryForwardExpiryMonths < 0)
            throw new InvalidOperationException("ค่าการยกยอดต้องไม่ติดลบ");
        if (effectiveTo.HasValue && effectiveTo.Value < effectiveFrom)
            throw new InvalidOperationException("วันสิ้นสุดการมีผลต้องไม่ก่อนวันเริ่มมีผล");
    }

    /// <summary>กันนโยบายซ้ำ: ประเภทการลา + ประเภทพนักงาน + ระดับ เดียวกัน และช่วงวันที่มีผลทับกัน</summary>
    private async Task EnsureNoDuplicateAsync(
        long? excludeId, long leaveTypeId, long? employeeTypeId, long? employeeLevelId,
        DateOnly effectiveFrom, DateOnly? effectiveTo, CancellationToken cancellationToken)
    {
        var duplicate = await _context.LeavePolicies.AsNoTracking()
            .Where(p => p.LeaveTypeId == leaveTypeId
                        && (excludeId == null || p.Id != excludeId)
                        && p.EmployeeTypeId == employeeTypeId
                        && p.EmployeeLevelId == employeeLevelId
                        && (p.EffectiveTo == null || p.EffectiveTo >= effectiveFrom)
                        && (effectiveTo == null || p.EffectiveFrom <= effectiveTo))
            .AnyAsync(cancellationToken);
        if (duplicate)
            throw new InvalidOperationException(
                "มีสิทธิ์การลาของประเภทการลาและกลุ่มพนักงานนี้อยู่แล้วในช่วงเวลาเดียวกัน กรุณาแก้ไขรายการเดิมแทนการสร้างใหม่");
    }

    /// <summary>
    /// จัดสรรโควตาให้ยอดวันลาปีปัจจุบันที่ยังไม่เคยได้รับโควตา (สิทธิ์ 0 และยังไม่เคยใช้)
    /// โดยเลือกนโยบายที่ตรงกับพนักงานแต่ละคนด้วยกฎเดียวกับการยื่นลา
    /// </summary>
    private async Task ApplyToUnallocatedBalancesAsync(long leaveTypeId, string leaveTypeName, CancellationToken cancellationToken)
    {
        var year = LeavePolicyRules.ThaiToday().Year;
        var balances = await _context.LeaveBalances
            .Where(b => b.LeaveTypeId == leaveTypeId && b.Year == year && b.AnnualQuotaDays == 0 && b.UsedDays == 0)
            .ToListAsync(cancellationToken);
        if (balances.Count == 0) return;

        var policies = await _context.LeavePolicies.AsNoTracking()
            .Where(p => p.LeaveTypeId == leaveTypeId)
            .ToListAsync(cancellationToken);
        var empIds = balances.Select(b => b.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments.AsNoTracking()
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);
        var hireDates = await _context.EmploymentContracts.AsNoTracking()
            .Where(c => empIds.Contains(c.EmployeeId))
            .GroupBy(c => c.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, HireDate = g.Min(c => c.StartDate) })
            .ToDictionaryAsync(x => x.EmployeeId, x => (DateOnly?)x.HireDate, cancellationToken);
        var onDate = LeavePolicyRules.PolicyDateForYear(year);

        foreach (var b in balances)
        {
            assignments.TryGetValue(b.EmployeeId, out var assign);
            var policy = LeavePolicyRules.SelectPolicy(policies, assign?.EmployeeTypeId, assign?.EmployeeLevelId, onDate);
            if (policy == null) continue;
            hireDates.TryGetValue(b.EmployeeId, out var hireDate);
            var entitlement = LeavePolicyRules.ComputeEntitlement(policy, hireDate, year);
            if (entitlement <= 0) continue;

            b.AnnualQuotaDays = entitlement;
            b.NetRemainingLeaveDays = b.BroughtForwardDays + entitlement + b.ActiveCarriedForwardDays - b.UsedDays + b.AdjustedDays;
            b.Transactions.Add(new LeaveBalanceTransaction
            {
                TransactionType = "ENTITLEMENT",
                Amount = entitlement,
                Note = $"จัดสรรโควตาวันลาอัตโนมัติตามนโยบาย '{leaveTypeName}'",
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync(cancellationToken);
    }

}
