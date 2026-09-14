using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

public class EmployeeTypeService : IEmployeeTypeService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public EmployeeTypeService(IHrmsDbContext dbContext, ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task<List<EmployeeTypeDto>> GetAllAsync(string? search = null, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.EmployeeTypes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t => t.TypeCode.ToLower().Contains(s) || t.TypeName.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(status) && status.ToUpper() != "ALL")
        {
            query = query.Where(t => t.Status == status.ToUpper());
        }

        var types = await query
            .Include(t => t.EmployeeTypeBenefits)
                .ThenInclude(etb => etb.BenefitItem)
            .OrderBy(t => t.Id)
            .ToListAsync(cancellationToken);

        // คำนวณจำนวนสัญญาจ้างที่ใช้งานอยู่ในแต่ละประเภท
        var contractCounts = await _dbContext.EmploymentContracts
            .Where(c => c.EmployeeTypeId.HasValue && c.Status == "ACTIVE")
            .GroupBy(c => c.EmployeeTypeId!.Value)
            .Select(g => new { TypeId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TypeId, x => x.Count, cancellationToken);

        return types.Select(t => new EmployeeTypeDto
        {
            Id = t.Id,
            TypeCode = t.TypeCode,
            TypeName = t.TypeName,
            WageType = t.WageType,
            HasSocialSecurity = t.HasSocialSecurity,
            HasLeaveEntitlement = t.HasLeaveEntitlement,
            HasOvertime = t.HasOvertime,
            HasProvidentFund = t.HasProvidentFund,
            Status = t.Status,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            ActiveContractsCount = contractCounts.GetValueOrDefault(t.Id, 0),
            Benefits = t.EmployeeTypeBenefits
                .Where(etb => etb.IsActive && etb.BenefitItem != null)
                .Select(etb => new BenefitItemDto
                {
                    Id = etb.BenefitItem.Id,
                    BenefitCode = etb.BenefitItem.BenefitCode,
                    BenefitName = etb.BenefitItem.BenefitName,
                    Category = etb.BenefitItem.Category,
                    Description = etb.BenefitItem.Description,
                    IsStatutory = etb.BenefitItem.IsStatutory,
                    Status = etb.BenefitItem.Status,
                    CreatedAt = etb.BenefitItem.CreatedAt,
                    UpdatedAt = etb.BenefitItem.UpdatedAt
                }).ToList()
        }).ToList();
    }

    public async Task<EmployeeTypeStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var all = await _dbContext.EmployeeTypes.AsNoTracking().ToListAsync(cancellationToken);

        return new EmployeeTypeStatsDto
        {
            TotalTypes = all.Count,
            MonthlyWageCount = all.Count(t => t.WageType == "MONTHLY"),
            OtherWageCount = all.Count(t => t.WageType != "MONTHLY"),
            ActiveCount = all.Count(t => t.Status == "ACTIVE")
        };
    }

    public async Task<EmployeeTypeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var t = await _dbContext.EmployeeTypes
            .Include(t => t.EmployeeTypeBenefits)
                .ThenInclude(etb => etb.BenefitItem)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (t == null)
        {
            throw new NotFoundException("ประเภทพนักงาน/สัญญาจ้าง", id);
        }

        int activeContracts = await _dbContext.EmploymentContracts
            .CountAsync(c => c.EmployeeTypeId == id && c.Status == "ACTIVE", cancellationToken);

        return new EmployeeTypeDto
        {
            Id = t.Id,
            TypeCode = t.TypeCode,
            TypeName = t.TypeName,
            WageType = t.WageType,
            HasSocialSecurity = t.HasSocialSecurity,
            HasLeaveEntitlement = t.HasLeaveEntitlement,
            HasOvertime = t.HasOvertime,
            HasProvidentFund = t.HasProvidentFund,
            Status = t.Status,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            ActiveContractsCount = activeContracts,
            Benefits = t.EmployeeTypeBenefits
                .Where(etb => etb.IsActive && etb.BenefitItem != null)
                .Select(etb => new BenefitItemDto
                {
                    Id = etb.BenefitItem.Id,
                    BenefitCode = etb.BenefitItem.BenefitCode,
                    BenefitName = etb.BenefitItem.BenefitName,
                    Category = etb.BenefitItem.Category,
                    Description = etb.BenefitItem.Description,
                    IsStatutory = etb.BenefitItem.IsStatutory,
                    Status = etb.BenefitItem.Status,
                    CreatedAt = etb.BenefitItem.CreatedAt,
                    UpdatedAt = etb.BenefitItem.UpdatedAt
                }).ToList()
        };
    }

    public async Task<EmployeeTypeDto> CreateAsync(CreateEmployeeTypeRequest request, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.HasPermission("EMP_MANAGE") && !_currentUserService.HasPermission("SYS_ADMIN"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์สร้างประเภทพนักงาน/สัญญาจ้าง");
        }

        if (string.IsNullOrWhiteSpace(request.TypeCode))
        {
            throw new ValidationException("กรุณาระบุรหัสประเภท (Type Code)");
        }

        if (string.IsNullOrWhiteSpace(request.TypeName))
        {
            throw new ValidationException("กรุณาระบุชื่อประเภท (Type Name)");
        }

        var normalizedCode = request.TypeCode.Trim().ToUpper();
        bool exists = await _dbContext.EmployeeTypes
            .AnyAsync(t => t.TypeCode == normalizedCode, cancellationToken);
        if (exists)
        {
            throw new ValidationException($"รหัสประเภท '{normalizedCode}' มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น");
        }

        var entity = new EmployeeType
        {
            TypeCode = normalizedCode,
            TypeName = request.TypeName.Trim(),
            WageType = string.IsNullOrWhiteSpace(request.WageType) ? "MONTHLY" : request.WageType.Trim().ToUpper(),
            HasSocialSecurity = request.HasSocialSecurity,
            HasLeaveEntitlement = request.HasLeaveEntitlement,
            HasOvertime = request.HasOvertime,
            HasProvidentFund = request.HasProvidentFund,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpper(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.BenefitItemIds != null && request.BenefitItemIds.Any())
        {
            var selectedCodes = await _dbContext.BenefitItems
                .Where(b => request.BenefitItemIds.Contains(b.Id))
                .Select(b => b.BenefitCode)
                .ToListAsync(cancellationToken);

            entity.HasSocialSecurity = selectedCodes.Contains("SSO");
            entity.HasLeaveEntitlement = selectedCodes.Contains("LEAVE");
            entity.HasOvertime = selectedCodes.Contains("OT");
            entity.HasProvidentFund = selectedCodes.Contains("PVD");
        }

        _dbContext.EmployeeTypes.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (request.BenefitItemIds != null && request.BenefitItemIds.Any())
        {
            foreach (var bId in request.BenefitItemIds.Distinct())
            {
                _dbContext.EmployeeTypeBenefits.Add(new EmployeeTypeBenefit
                {
                    EmployeeTypeId = entity.Id,
                    BenefitItemId = bId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<EmployeeTypeDto> UpdateAsync(long id, UpdateEmployeeTypeRequest request, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.HasPermission("EMP_MANAGE") && !_currentUserService.HasPermission("SYS_ADMIN"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์แก้ไขประเภทพนักงาน/สัญญาจ้าง");
        }

        var entity = await _dbContext.EmployeeTypes.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new NotFoundException("ประเภทพนักงาน/สัญญาจ้าง", id);
        }

        if (string.IsNullOrWhiteSpace(request.TypeName))
        {
            throw new ValidationException("กรุณาระบุชื่อประเภท (Type Name)");
        }

        entity.TypeName = request.TypeName.Trim();
        entity.WageType = string.IsNullOrWhiteSpace(request.WageType) ? "MONTHLY" : request.WageType.Trim().ToUpper();
        entity.HasSocialSecurity = request.HasSocialSecurity;
        entity.HasLeaveEntitlement = request.HasLeaveEntitlement;
        entity.HasOvertime = request.HasOvertime;
        entity.HasProvidentFund = request.HasProvidentFund;
        entity.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpper();
        entity.UpdatedAt = DateTime.UtcNow;

        if (request.BenefitItemIds != null)
        {
            var selectedCodes = await _dbContext.BenefitItems
                .Where(b => request.BenefitItemIds.Contains(b.Id))
                .Select(b => b.BenefitCode)
                .ToListAsync(cancellationToken);

            entity.HasSocialSecurity = selectedCodes.Contains("SSO");
            entity.HasLeaveEntitlement = selectedCodes.Contains("LEAVE");
            entity.HasOvertime = selectedCodes.Contains("OT");
            entity.HasProvidentFund = selectedCodes.Contains("PVD");

            var currentBenefits = await _dbContext.EmployeeTypeBenefits
                .Where(etb => etb.EmployeeTypeId == id)
                .ToListAsync(cancellationToken);

            _dbContext.EmployeeTypeBenefits.RemoveRange(currentBenefits);

            foreach (var bId in request.BenefitItemIds.Distinct())
            {
                _dbContext.EmployeeTypeBenefits.Add(new EmployeeTypeBenefit
                {
                    EmployeeTypeId = id,
                    BenefitItemId = bId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.HasPermission("EMP_MANAGE") && !_currentUserService.HasPermission("SYS_ADMIN"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์ลบประเภทพนักงาน/สัญญาจ้าง");
        }

        var entity = await _dbContext.EmployeeTypes.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new NotFoundException("ประเภทพนักงาน/สัญญาจ้าง", id);
        }

        // ตรวจสอบว่ามีการอ้างอิงในสัญญาจ้างหรือการโอนย้ายตำแหน่งหรือไม่
        bool hasContracts = await _dbContext.EmploymentContracts.AnyAsync(c => c.EmployeeTypeId == id, cancellationToken);
        bool hasAssignments = await _dbContext.EmployeeAssignments.AnyAsync(a => a.EmployeeTypeId == id, cancellationToken);

        if (hasContracts || hasAssignments)
        {
            // ปรับสถานะเป็น INACTIVE แทนการ Hard delete เพื่อรักษาความปลอดภัยของข้อมูลประวัติ
            entity.Status = "INACTIVE";
            entity.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            _dbContext.EmployeeTypes.Remove(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
