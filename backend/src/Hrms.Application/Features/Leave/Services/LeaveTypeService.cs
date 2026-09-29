using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeaveTypeService : ILeaveTypeService
{
    private readonly IHrmsDbContext _context;

    public LeaveTypeService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<LeaveTypeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.LeaveTypes
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .Select(t => new LeaveTypeDto
            {
                Id = t.Id,
                LeaveCode = t.LeaveCode,
                LeaveName = t.LeaveName,
                QuotaUnit = t.QuotaUnit,
                IsPaidLeave = t.IsPaidLeave,
                DocumentDescription = t.DocumentDescription,
                Status = t.Status
            })
            .ToListAsync(cancellationToken);
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
            Status = t.Status
        };
    }

    public async Task<LeaveTypeDto> CreateAsync(CreateLeaveTypeRequest request, CancellationToken cancellationToken = default)
    {
        // Check uniqueness of LeaveCode
        var exists = await _context.LeaveTypes
            .AnyAsync(t => t.LeaveCode == request.LeaveCode.Trim().ToUpper(), cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"รหัสประเภทการลา '{request.LeaveCode}' มีอยู่ในระบบแล้ว");
        }

        var leaveType = new LeaveType
        {
            LeaveCode = request.LeaveCode.Trim().ToUpper(),
            LeaveName = request.LeaveName.Trim(),
            QuotaUnit = request.QuotaUnit.ToUpper(),
            IsPaidLeave = request.IsPaidLeave,
            DocumentDescription = string.IsNullOrWhiteSpace(request.DocumentDescription) ? null : request.DocumentDescription.Trim(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.ToUpper()
        };

        _context.LeaveTypes.Add(leaveType);
        await _context.SaveChangesAsync(cancellationToken);

        return new LeaveTypeDto
        {
            Id = leaveType.Id,
            LeaveCode = leaveType.LeaveCode,
            LeaveName = leaveType.LeaveName,
            QuotaUnit = leaveType.QuotaUnit,
            IsPaidLeave = leaveType.IsPaidLeave,
            DocumentDescription = leaveType.DocumentDescription,
            Status = leaveType.Status
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

        await _context.SaveChangesAsync(cancellationToken);

        return new LeaveTypeDto
        {
            Id = leaveType.Id,
            LeaveCode = leaveType.LeaveCode,
            LeaveName = leaveType.LeaveName,
            QuotaUnit = leaveType.QuotaUnit,
            IsPaidLeave = leaveType.IsPaidLeave,
            DocumentDescription = leaveType.DocumentDescription,
            Status = leaveType.Status
        };
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var leaveType = await _context.LeaveTypes.FindAsync([id], cancellationToken);
        if (leaveType == null) return false;

        // Check if there are dependent records (policies, balances, requests)
        var hasPolicies = await _context.LeavePolicies.AnyAsync(p => p.LeaveTypeId == id, cancellationToken);
        var hasBalances = await _context.LeaveBalances.AnyAsync(b => b.LeaveTypeId == id, cancellationToken);
        var hasRequests = await _context.LeaveRequests.AnyAsync(r => r.LeaveTypeId == id, cancellationToken);

        if (hasPolicies || hasBalances || hasRequests)
        {
            // Soft delete by setting status INACTIVE
            leaveType.Status = "INACTIVE";
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        _context.LeaveTypes.Remove(leaveType);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
