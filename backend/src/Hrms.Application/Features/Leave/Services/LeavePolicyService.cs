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
                MaxOccurrencesPerYear = p.MaxOccurrencesPerYear
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
            MaxOccurrencesPerYear = p.MaxOccurrencesPerYear
        };
    }

    public async Task<LeavePolicyDto> CreateAsync(CreateLeavePolicyRequest request, CancellationToken cancellationToken = default)
    {
        var leaveType = await _context.LeaveTypes.FindAsync([request.LeaveTypeId], cancellationToken);
        if (leaveType == null)
        {
            throw new KeyNotFoundException($"ไม่พบประเภทการลารหัส ID {request.LeaveTypeId}");
        }

        var policy = new LeavePolicy
        {
            LeaveTypeId = request.LeaveTypeId,
            EmployeeTypeId = request.EmployeeTypeId,
            EmployeeLevelId = request.EmployeeLevelId,
            EntitlementDays = request.EntitlementDays,
            MinimumServiceDays = request.MinimumServiceDays,
            AdvanceRequestDays = request.AdvanceRequestDays,
            IsCarryForwardAllowed = request.IsCarryForwardAllowed,
            CarryForwardMaxMonths = request.CarryForwardMaxMonths,
            CarryForwardExpiryMonths = request.CarryForwardExpiryMonths,
            IsDocumentRequired = request.IsDocumentRequired,
            DocumentRequiredAfterDays = request.DocumentRequiredAfterDays,
            IsAllowedDuringProbation = request.IsAllowedDuringProbation,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            MaxLifetimeOccurrences = request.MaxLifetimeOccurrences,
            MaxDaysPerOccurrence = request.MaxDaysPerOccurrence,
            MaxOccurrencesPerYear = request.MaxOccurrencesPerYear
        };

        _context.LeavePolicies.Add(policy);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(policy.Id, cancellationToken))!;
    }

    public async Task<LeavePolicyDto> UpdateAsync(long id, UpdateLeavePolicyRequest request, CancellationToken cancellationToken = default)
    {
        var policy = await _context.LeavePolicies.FindAsync([id], cancellationToken);
        if (policy == null)
        {
            throw new KeyNotFoundException($"ไม่พบนโยบายการลารหัส ID {id}");
        }

        policy.EmployeeTypeId = request.EmployeeTypeId;
        policy.EmployeeLevelId = request.EmployeeLevelId;
        policy.EntitlementDays = request.EntitlementDays;
        policy.MinimumServiceDays = request.MinimumServiceDays;
        policy.AdvanceRequestDays = request.AdvanceRequestDays;
        policy.IsCarryForwardAllowed = request.IsCarryForwardAllowed;
        policy.CarryForwardMaxMonths = request.CarryForwardMaxMonths;
        policy.CarryForwardExpiryMonths = request.CarryForwardExpiryMonths;
        policy.IsDocumentRequired = request.IsDocumentRequired;
        policy.DocumentRequiredAfterDays = request.DocumentRequiredAfterDays;
        policy.IsAllowedDuringProbation = request.IsAllowedDuringProbation;
        policy.EffectiveFrom = request.EffectiveFrom;
        policy.EffectiveTo = request.EffectiveTo;
        policy.MaxLifetimeOccurrences = request.MaxLifetimeOccurrences;
        policy.MaxDaysPerOccurrence = request.MaxDaysPerOccurrence;
        policy.MaxOccurrencesPerYear = request.MaxOccurrencesPerYear;

        await _context.SaveChangesAsync(cancellationToken);

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
}
