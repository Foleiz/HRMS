using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

public class BenefitService : IBenefitService
{
    private readonly IHrmsDbContext _context;

    public BenefitService(IHrmsDbContext _context)
    {
        this._context = _context;
    }

    public async Task<List<BenefitItemDto>> GetAllAsync(string? category = null, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.BenefitItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) && category.ToUpper() != "ALL")
        {
            query = query.Where(b => b.Category.ToUpper() == category.Trim().ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(status) && status.ToUpper() != "ALL")
        {
            query = query.Where(b => b.Status.ToUpper() == status.Trim().ToUpper());
        }

        // Count assignments per benefit
        var assignmentCounts = await _context.EmployeeTypeBenefits
            .AsNoTracking()
            .Where(etb => etb.IsActive)
            .GroupBy(etb => etb.BenefitItemId)
            .Select(g => new { BenefitItemId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BenefitItemId, x => x.Count, cancellationToken);

        var benefits = await query
            .OrderByDescending(b => b.IsStatutory)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

        return benefits.Select(b => new BenefitItemDto
        {
            Id = b.Id,
            BenefitCode = b.BenefitCode,
            BenefitName = b.BenefitName,
            Category = b.Category,
            Description = b.Description,
            IsStatutory = b.IsStatutory,
            Status = b.Status,
            AssignedTypesCount = assignmentCounts.GetValueOrDefault(b.Id, 0),
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt
        }).ToList();
    }

    public async Task<BenefitItemDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var benefit = await _context.BenefitItems
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (benefit == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {id}");

        var count = await _context.EmployeeTypeBenefits
            .AsNoTracking()
            .CountAsync(etb => etb.BenefitItemId == id && etb.IsActive, cancellationToken);

        return new BenefitItemDto
        {
            Id = benefit.Id,
            BenefitCode = benefit.BenefitCode,
            BenefitName = benefit.BenefitName,
            Category = benefit.Category,
            Description = benefit.Description,
            IsStatutory = benefit.IsStatutory,
            Status = benefit.Status,
            AssignedTypesCount = count,
            CreatedAt = benefit.CreatedAt,
            UpdatedAt = benefit.UpdatedAt
        };
    }

    public async Task<BenefitItemDto> CreateAsync(CreateBenefitItemRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.BenefitCode))
            throw new ValidationException("กรุณาระบุรหัสสิทธิประโยชน์ (Benefit Code)");

        if (string.IsNullOrWhiteSpace(request.BenefitName))
            throw new ValidationException("กรุณาระบุชื่อสิทธิประโยชน์/สวัสดิการ");

        var normalizedCode = request.BenefitCode.Trim().ToUpper();

        var exists = await _context.BenefitItems
            .AnyAsync(b => b.BenefitCode == normalizedCode, cancellationToken);

        if (exists)
            throw new ValidationException($"รหัสสิทธิประโยชน์ '{normalizedCode}' มีอยู่ในระบบแล้ว");

        var benefit = new BenefitItem
        {
            BenefitCode = normalizedCode,
            BenefitName = request.BenefitName.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "OTHER" : request.Category.Trim().ToUpper(),
            Description = request.Description?.Trim(),
            IsStatutory = request.IsStatutory,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpper(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.BenefitItems.Add(benefit);
        await _context.SaveChangesAsync(cancellationToken);

        return new BenefitItemDto
        {
            Id = benefit.Id,
            BenefitCode = benefit.BenefitCode,
            BenefitName = benefit.BenefitName,
            Category = benefit.Category,
            Description = benefit.Description,
            IsStatutory = benefit.IsStatutory,
            Status = benefit.Status,
            AssignedTypesCount = 0,
            CreatedAt = benefit.CreatedAt,
            UpdatedAt = benefit.UpdatedAt
        };
    }

    public async Task<BenefitItemDto> UpdateAsync(long id, UpdateBenefitItemRequest request, CancellationToken cancellationToken = default)
    {
        var benefit = await _context.BenefitItems
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (benefit == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {id}");

        if (string.IsNullOrWhiteSpace(request.BenefitName))
            throw new ValidationException("กรุณาระบุชื่อสิทธิประโยชน์/สวัสดิการ");

        benefit.BenefitName = request.BenefitName.Trim();
        benefit.Category = string.IsNullOrWhiteSpace(request.Category) ? "OTHER" : request.Category.Trim().ToUpper();
        benefit.Description = request.Description?.Trim();
        benefit.IsStatutory = request.IsStatutory;
        benefit.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpper();
        benefit.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var count = await _context.EmployeeTypeBenefits
            .AsNoTracking()
            .CountAsync(etb => etb.BenefitItemId == id && etb.IsActive, cancellationToken);

        return new BenefitItemDto
        {
            Id = benefit.Id,
            BenefitCode = benefit.BenefitCode,
            BenefitName = benefit.BenefitName,
            Category = benefit.Category,
            Description = benefit.Description,
            IsStatutory = benefit.IsStatutory,
            Status = benefit.Status,
            AssignedTypesCount = count,
            CreatedAt = benefit.CreatedAt,
            UpdatedAt = benefit.UpdatedAt
        };
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var benefit = await _context.BenefitItems
            .Include(b => b.EmployeeTypeBenefits)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (benefit == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {id}");

        if (benefit.IsStatutory)
            throw new ValidationException("ไม่สามารถลบสิทธิประโยชน์ที่เป็นสิทธิตามกฎหมายได้ (สามารถเลือกปิดการใช้งานแทนได้)");

        if (benefit.EmployeeTypeBenefits.Any())
            throw new ValidationException("ไม่สามารถลบสิทธิประโยชน์นี้ได้ เนื่องจากถูกผูกอยู่กับประเภทสัญญาจ้างงานแล้ว กรุณาปลดการผูกสิทธิ์ก่อน");

        _context.BenefitItems.Remove(benefit);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
