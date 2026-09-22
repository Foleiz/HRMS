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

    public async Task<List<ApprovalDelegationDto>> GetAllAsync(
        string? status = null,
        long? delegatorId = null,
        long? delegateId = null,
        string? documentType = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ApprovalDelegations
            .Include(d => d.DelegatorEmployee)
                .ThenInclude(e => e!.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .Include(d => d.DelegateEmployee)
                .ThenInclude(e => e!.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(d => d.Status == status);
        }

        if (delegatorId.HasValue)
        {
            query = query.Where(d => d.DelegatorEmployeeId == delegatorId.Value);
        }

        if (delegateId.HasValue)
        {
            query = query.Where(d => d.DelegateEmployeeId == delegateId.Value);
        }

        if (!string.IsNullOrWhiteSpace(documentType))
        {
            query = query.Where(d => d.DocumentType == null || d.DocumentType == documentType);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        var list = await query
            .OrderByDescending(d => d.Id)
            .ToListAsync(cancellationToken);

        return list.Select(d => MapToDto(d, today)).ToList();
    }

    public async Task<ApprovalDelegationDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var delegation = await _context.ApprovalDelegations
            .Include(d => d.DelegatorEmployee)
                .ThenInclude(e => e!.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .Include(d => d.DelegateEmployee)
                .ThenInclude(e => e!.Assignments.Where(a => a.IsCurrent))
                    .ThenInclude(a => a.Position)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (delegation == null) return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        return MapToDto(delegation, today);
    }

    public async Task<ApprovalDelegationDto> CreateAsync(CreateApprovalDelegationRequest request, CancellationToken cancellationToken = default)
    {
        if (request.DelegatorEmployeeId == request.DelegateEmployeeId)
        {
            throw new InvalidOperationException("ไม่สามารถมอบอำนาจอนุมัติแทนให้ตนเองได้");
        }

        if (request.EndDate < request.StartDate)
        {
            throw new InvalidOperationException("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น");
        }

        var delegator = await _context.Employees.FindAsync(new object[] { request.DelegatorEmployeeId }, cancellationToken);
        if (delegator == null)
        {
            throw new InvalidOperationException($"ไม่พบข้อมูลพนักงานผู้มอบอำนาจ (รหัส ID {request.DelegatorEmployeeId})");
        }

        var delegateEmp = await _context.Employees.FindAsync(new object[] { request.DelegateEmployeeId }, cancellationToken);
        if (delegateEmp == null)
        {
            throw new InvalidOperationException($"ไม่พบข้อมูลพนักงานผู้รับมอบอำนาจ (รหัส ID {request.DelegateEmployeeId})");
        }

        // Check overlapping active delegation
        var overlap = await _context.ApprovalDelegations.AnyAsync(d =>
            d.DelegatorEmployeeId == request.DelegatorEmployeeId
            && d.Status == "ACTIVE"
            && (d.DocumentType == null || request.DocumentType == null || d.DocumentType == request.DocumentType)
            && d.StartDate <= request.EndDate
            && d.EndDate >= request.StartDate,
            cancellationToken);

        if (overlap)
        {
            throw new InvalidOperationException("มีรายการมอบอำนาจอนุมัติแทนในช่วงเวลาดังกล่าวที่ยังเปิดใช้งานอยู่แล้ว");
        }

        var entity = new ApprovalDelegation
        {
            DelegatorEmployeeId = request.DelegatorEmployeeId,
            DelegateEmployeeId = request.DelegateEmployeeId,
            DocumentType = string.IsNullOrWhiteSpace(request.DocumentType) ? null : request.DocumentType.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = "ACTIVE"
        };

        _context.ApprovalDelegations.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<ApprovalDelegationDto> UpdateAsync(long id, UpdateApprovalDelegationRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.ApprovalDelegations.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new InvalidOperationException($"ไม่พบรายการมอบอำนาจอนุมัติแทนรหัส ID {id}");
        }

        if (entity.DelegatorEmployeeId == request.DelegateEmployeeId)
        {
            throw new InvalidOperationException("ไม่สามารถมอบอำนาจอนุมัติแทนให้ตนเองได้");
        }

        if (request.EndDate < request.StartDate)
        {
            throw new InvalidOperationException("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น");
        }

        var delegateEmp = await _context.Employees.FindAsync(new object[] { request.DelegateEmployeeId }, cancellationToken);
        if (delegateEmp == null)
        {
            throw new InvalidOperationException($"ไม่พบข้อมูลพนักงานผู้รับมอบอำนาจ (รหัส ID {request.DelegateEmployeeId})");
        }

        var docType = string.IsNullOrWhiteSpace(request.DocumentType) ? null : request.DocumentType.Trim();

        // Check overlapping active delegation excluding current
        if (request.Status == "ACTIVE")
        {
            var overlap = await _context.ApprovalDelegations.AnyAsync(d =>
                d.Id != id
                && d.DelegatorEmployeeId == entity.DelegatorEmployeeId
                && d.Status == "ACTIVE"
                && (d.DocumentType == null || docType == null || d.DocumentType == docType)
                && d.StartDate <= request.EndDate
                && d.EndDate >= request.StartDate,
                cancellationToken);

            if (overlap)
            {
                throw new InvalidOperationException("มีรายการมอบอำนาจอนุมัติแทนในช่วงเวลาดังกล่าวที่ยังเปิดใช้งานอยู่แล้ว");
            }
        }

        entity.DelegateEmployeeId = request.DelegateEmployeeId;
        entity.DocumentType = docType;
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.Status = request.Status;

        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.ApprovalDelegations.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null) return false;

        _context.ApprovalDelegations.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ApprovalDelegation?> GetActiveDelegationAsync(
        long delegatorEmployeeId,
        string documentType,
        DateOnly? date = null,
        CancellationToken cancellationToken = default)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        return await _context.ApprovalDelegations
            .Include(d => d.DelegateEmployee)
            .Where(d => d.DelegatorEmployeeId == delegatorEmployeeId
                     && d.Status == "ACTIVE"
                     && (d.DocumentType == null || d.DocumentType == documentType)
                     && d.StartDate <= targetDate
                     && d.EndDate >= targetDate)
            .OrderByDescending(d => d.DocumentType != null)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static ApprovalDelegationDto MapToDto(ApprovalDelegation d, DateOnly today)
    {
        var isActiveNow = d.Status == "ACTIVE" && d.StartDate <= today && d.EndDate >= today;
        var delegatorAssign = d.DelegatorEmployee?.Assignments?.FirstOrDefault(a => a.IsCurrent);
        var delegateAssign = d.DelegateEmployee?.Assignments?.FirstOrDefault(a => a.IsCurrent);

        return new ApprovalDelegationDto
        {
            Id = d.Id,
            DelegatorEmployeeId = d.DelegatorEmployeeId,
            DelegatorEmployeeCode = d.DelegatorEmployee?.EmployeeCode ?? string.Empty,
            DelegatorEmployeeName = $"{d.DelegatorEmployee?.FirstName} {d.DelegatorEmployee?.LastName}".Trim(),
            DelegatorPosition = delegatorAssign?.Position?.PositionName,
            DelegateEmployeeId = d.DelegateEmployeeId,
            DelegateEmployeeCode = d.DelegateEmployee?.EmployeeCode ?? string.Empty,
            DelegateEmployeeName = $"{d.DelegateEmployee?.FirstName} {d.DelegateEmployee?.LastName}".Trim(),
            DelegatePosition = delegateAssign?.Position?.PositionName,
            DocumentType = d.DocumentType,
            DocumentTypeLabel = GetDocumentTypeLabel(d.DocumentType),
            StartDate = d.StartDate,
            EndDate = d.EndDate,
            Status = d.Status,
            IsActiveNow = isActiveNow,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string GetDocumentTypeLabel(string? docType)
    {
        return docType switch
        {
            "LEAVE_REQUEST" => "คำขอลา",
            "ATTENDANCE_ADJUSTMENT" => "ปรับเวลาเข้า-ออก",
            "RESIGNATION_REQUEST" => "คำขอลาออก",
            "CERTIFICATE_REQUEST" => "ขอหนังสือรับรอง",
            "EMPLOYMENT_CONTRACT" => "สัญญาจ้างงาน",
            "PAYROLL_PERIOD" => "รอบเงินเดือน",
            _ => string.IsNullOrWhiteSpace(docType) ? "ทุกประเภทเอกสาร" : docType
        };
    }
}
