using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Approvals.Services;

public class ApprovalDelegationService : IApprovalDelegationService
{
    private readonly IHrmsDbContext _context;

    public ApprovalDelegationService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<ApprovalDelegationDto>> GetAllAsync(long? delegatorEmployeeId = null, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.ApprovalDelegations
            .AsNoTracking()
            .Include(d => d.DelegatorEmployee)
            .Include(d => d.DelegateEmployee)
            .AsQueryable();

        if (delegatorEmployeeId.HasValue)
        {
            query = query.Where(d => d.DelegatorEmployeeId == delegatorEmployeeId.Value);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(d => d.Status == status);
        }

        var list = await query.OrderByDescending(d => d.StartDate).ToListAsync(cancellationToken);
        return list.Select(MapToDto).ToList();
    }

    public async Task<ApprovalDelegationDto> CreateAsync(CreateApprovalDelegationRequest request, CancellationToken cancellationToken = default)
    {
        if (request.DelegatorEmployeeId == request.DelegateEmployeeId)
        {
            throw new InvalidOperationException("ไม่สามารถมอบอำนาจอนุมัติแทนให้ตัวเองได้");
        }

        if (request.EndDate < request.StartDate)
        {
            throw new InvalidOperationException("วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น");
        }

        var delegatorExists = await _context.Employees.AnyAsync(e => e.Id == request.DelegatorEmployeeId, cancellationToken);
        if (!delegatorExists)
        {
            throw new InvalidOperationException($"ไม่พบพนักงานผู้มอบอำนาจ (ID {request.DelegatorEmployeeId})");
        }

        var delegateExists = await _context.Employees.AnyAsync(e => e.Id == request.DelegateEmployeeId, cancellationToken);
        if (!delegateExists)
        {
            throw new InvalidOperationException($"ไม่พบพนักงานผู้รับมอบอำนาจ (ID {request.DelegateEmployeeId})");
        }

        // ป้องกันการมอบอำนาจซ้ำซ้อน — ผู้มอบอำนาจคนเดียวกัน + ประเภทเอกสารเดียวกัน (หรือมอบทุกประเภท)
        // ที่ยัง ACTIVE และช่วงวันที่ทับซ้อนกัน จะทำให้ระบบอนุมัติแทนไม่รู้ว่าควรใช้รายการไหน
        var hasOverlap = await _context.ApprovalDelegations
            .AnyAsync(d =>
                d.DelegatorEmployeeId == request.DelegatorEmployeeId &&
                d.Status == "ACTIVE" &&
                (d.DocumentType == null || request.DocumentType == null || d.DocumentType == request.DocumentType) &&
                d.StartDate <= request.EndDate && d.EndDate >= request.StartDate,
                cancellationToken);

        if (hasOverlap)
        {
            throw new InvalidOperationException("ผู้มอบอำนาจคนนี้มีรายการมอบอำนาจในช่วงวันที่ทับซ้อนกันอยู่แล้ว กรุณายกเลิกรายการเดิมก่อน หรือปรับช่วงวันที่ใหม่");
        }

        var delegation = new ApprovalDelegation
        {
            DelegatorEmployeeId = request.DelegatorEmployeeId,
            DelegateEmployeeId = request.DelegateEmployeeId,
            DocumentType = string.IsNullOrWhiteSpace(request.DocumentType) ? null : request.DocumentType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = "ACTIVE"
        };

        _context.ApprovalDelegations.Add(delegation);
        await _context.SaveChangesAsync(cancellationToken);

        var saved = await _context.ApprovalDelegations
            .AsNoTracking()
            .Include(d => d.DelegatorEmployee)
            .Include(d => d.DelegateEmployee)
            .FirstAsync(d => d.Id == delegation.Id, cancellationToken);

        return MapToDto(saved);
    }

    public async Task<ApprovalDelegationDto> SetStatusAsync(long id, string status, CancellationToken cancellationToken = default)
    {
        var normalizedStatus = status.Trim().ToUpper();
        if (normalizedStatus != "ACTIVE" && normalizedStatus != "INACTIVE")
        {
            throw new InvalidOperationException("สถานะต้องเป็น ACTIVE หรือ INACTIVE เท่านั้น");
        }

        var delegation = await _context.ApprovalDelegations.FindAsync([id], cancellationToken);
        if (delegation == null)
        {
            throw new KeyNotFoundException($"ไม่พบรายการมอบอำนาจอนุมัติแทนรหัส ID {id}");
        }

        delegation.Status = normalizedStatus;
        await _context.SaveChangesAsync(cancellationToken);

        var saved = await _context.ApprovalDelegations
            .AsNoTracking()
            .Include(d => d.DelegatorEmployee)
            .Include(d => d.DelegateEmployee)
            .FirstAsync(d => d.Id == id, cancellationToken);

        return MapToDto(saved);
    }

    private static ApprovalDelegationDto MapToDto(ApprovalDelegation d)
    {
        return new ApprovalDelegationDto
        {
            Id = d.Id,
            DelegatorEmployeeId = d.DelegatorEmployeeId,
            DelegatorEmployeeName = d.DelegatorEmployee?.FullName,
            DelegateEmployeeId = d.DelegateEmployeeId,
            DelegateEmployeeName = d.DelegateEmployee?.FullName,
            DocumentType = d.DocumentType,
            StartDate = d.StartDate,
            EndDate = d.EndDate,
            Status = d.Status
        };
    }
}
