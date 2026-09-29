using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeavePolicyService : ILeavePolicyService
{
    private readonly IHrmsDbContext _context;
    private readonly ILeaveEntitlementSync _sync;

    public LeavePolicyService(IHrmsDbContext context, ILeaveEntitlementSync sync)
    {
        _context = context;
        _sync = sync;
    }

    /// <summary>สิทธิ์การลาเปลี่ยน → คำนวณสิทธิ์ปีนี้ของยอดวันลาประเภทนั้นใหม่ทันที</summary>
    private Task SyncCurrentYearAsync(long leaveTypeId, CancellationToken cancellationToken) =>
        _sync.SyncAsync(LeavePolicyRules.ThaiToday().Year, null, leaveTypeId, cancellationToken);

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

        await SyncCurrentYearAsync(policy.LeaveTypeId, cancellationToken);

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

        await SyncCurrentYearAsync(policy.LeaveTypeId, cancellationToken);

        return (await GetByIdAsync(policy.Id, cancellationToken))!;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var policy = await _context.LeavePolicies.FindAsync([id], cancellationToken);
        if (policy == null) return false;

        var leaveTypeId = policy.LeaveTypeId;
        _context.LeavePolicies.Remove(policy);
        await _context.SaveChangesAsync(cancellationToken);
        await SyncCurrentYearAsync(leaveTypeId, cancellationToken);
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

}
