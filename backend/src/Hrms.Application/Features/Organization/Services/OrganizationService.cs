using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Organization.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Organization.Services;

/// <summary>
/// Service จัดการโครงสร้างองค์กร (Company, Division, Department, Position, Level)
/// สำหรับ Developer 1: Sprint 1
/// </summary>
public class OrganizationService : IOrganizationService
{
    private readonly IHrmsDbContext _dbContext;

    public OrganizationService(IHrmsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private static (DateTime Expiry, CompanyDto? Data)? _cachedCompanyProfile;
    private static readonly TimeSpan CompanyCacheTtl = TimeSpan.FromHours(1);

    public static void InvalidateCompanyCache() => _cachedCompanyProfile = null;

    #region Company
    public async Task<CompanyDto?> GetCompanyProfileAsync(CancellationToken cancellationToken = default)
    {
        if (_cachedCompanyProfile.HasValue && _cachedCompanyProfile.Value.Expiry > DateTime.UtcNow)
        {
            return _cachedCompanyProfile.Value.Data;
        }

        var company = await _dbContext.Companies
            .AsNoTracking()
            .Include(c => c.CeoEmployee)
            .FirstOrDefaultAsync(cancellationToken);
        if (company == null) return null;

        string? logoBase64 = null;
        if (company.LogoData != null && company.LogoData.Length > 0)
        {
            logoBase64 = $"data:image/png;base64,{Convert.ToBase64String(company.LogoData)}";
        }

        var result = new CompanyDto
        {
            Id = company.Id,
            CompanyCode = company.CompanyCode,
            CompanyName = company.CompanyName,
            Address = company.Address,
            Phone = company.Phone,
            Email = company.Email,
            Status = company.Status,
            LogoData = logoBase64,
            CeoEmployeeId = company.CeoEmployeeId,
            CeoEmployeeCode = company.CeoEmployee?.EmployeeCode,
            CeoEmployeeName = company.CeoEmployee != null
                ? $"{company.CeoEmployee.FirstName} {company.CeoEmployee.LastName}".Trim()
                : null,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt
        };

        _cachedCompanyProfile = (DateTime.UtcNow.Add(CompanyCacheTtl), result);
        return result;
    }

    public async Task<CompanyDto> UpdateCompanyProfileAsync(UpdateCompanyDto request, CancellationToken cancellationToken = default)
    {
        InvalidateCompanyCache();
        var company = await _dbContext.Companies
            .Include(c => c.CeoEmployee)
            .FirstOrDefaultAsync(cancellationToken);
        if (company == null)
        {
            throw new NotFoundException("Company", 1);
        }

        company.CompanyName = request.CompanyName.Trim();
        company.Address = request.Address?.Trim();
        company.Phone = request.Phone?.Trim();
        company.Email = request.Email?.Trim();
        company.Status = request.Status;
        company.CeoEmployeeId = request.CeoEmployeeId;

        if (string.IsNullOrWhiteSpace(request.LogoData))
        {
            company.LogoData = null;
        }
        else
        {
            string raw = request.LogoData;
            int commaIdx = raw.IndexOf(',');
            if (commaIdx >= 0 && raw.StartsWith("data:"))
            {
                raw = raw.Substring(commaIdx + 1);
            }
            try
            {
                company.LogoData = Convert.FromBase64String(raw);
            }
            catch
            {
                // In case base64 parsing fails, preserve existing
            }
        }

        company.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        string? ceoCode = null;
        string? ceoName = null;
        if (company.CeoEmployeeId.HasValue)
        {
            var ceo = await _dbContext.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == company.CeoEmployeeId.Value, cancellationToken);
            if (ceo != null)
            {
                ceoCode = ceo.EmployeeCode;
                ceoName = $"{ceo.FirstName} {ceo.LastName}".Trim();
            }
        }

        string? logoBase64 = null;
        if (company.LogoData != null && company.LogoData.Length > 0)
        {
            logoBase64 = $"data:image/png;base64,{Convert.ToBase64String(company.LogoData)}";
        }

        return new CompanyDto
        {
            Id = company.Id,
            CompanyCode = company.CompanyCode,
            CompanyName = company.CompanyName,
            Address = company.Address,
            Phone = company.Phone,
            Email = company.Email,
            Status = company.Status,
            LogoData = logoBase64,
            CeoEmployeeId = company.CeoEmployeeId,
            CeoEmployeeCode = ceoCode,
            CeoEmployeeName = ceoName,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt
        };
    }
    #endregion

    #region Divisions
    public async Task<List<DivisionDto>> GetAllDivisionsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Divisions
            .AsNoTracking()
            .Include(d => d.HeadEmployee)
            .Include(d => d.Departments)
            .OrderBy(d => d.DivisionCode)
            .Select(d => new DivisionDto
            {
                Id = d.Id,
                CompanyId = d.CompanyId,
                DivisionCode = d.DivisionCode,
                DivisionName = d.DivisionName,
                HeadEmployeeId = d.HeadEmployeeId,
                HeadEmployeeName = d.HeadEmployee != null ? d.HeadEmployee.FullName : null,
                DepartmentCount = d.Departments.Count,
                Status = d.Status,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<DivisionDto> GetDivisionByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var d = await _dbContext.Divisions
            .AsNoTracking()
            .Include(x => x.HeadEmployee)
            .Include(x => x.Departments)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (d == null) throw new NotFoundException("Division", id);

        return new DivisionDto
        {
            Id = d.Id,
            CompanyId = d.CompanyId,
            DivisionCode = d.DivisionCode,
            DivisionName = d.DivisionName,
            HeadEmployeeId = d.HeadEmployeeId,
            HeadEmployeeName = d.HeadEmployee != null ? d.HeadEmployee.FullName : null,
            DepartmentCount = d.Departments.Count,
            Status = d.Status,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<DivisionDto> CreateDivisionAsync(CreateDivisionDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.DivisionName))
        {
            throw new ValidationException("กรุณากรอกชื่อฝ่าย");
        }

        // รหัสรันอัตโนมัติ (DIV001, DIV002, ...) ถ้าไม่ได้ระบุมา
        string code = string.IsNullOrWhiteSpace(request.DivisionCode)
            ? await CodeGenerator.NextAsync(_dbContext.Divisions.Select(d => d.DivisionCode), "DIV", 3, cancellationToken)
            : request.DivisionCode.Trim().ToUpper();

        // ตรวจสอบความซ้ำซ้อนของรหัสฝ่าย
        bool exists = await _dbContext.Divisions.AnyAsync(d => d.DivisionCode.ToUpper() == code, cancellationToken);
        if (exists)
        {
            throw new ValidationException($"รหัสฝ่าย '{code}' มีอยู่ในระบบแล้ว");
        }

        // หา Company เริ่มต้น
        var company = await _dbContext.Companies.FirstOrDefaultAsync(cancellationToken);
        long companyId = company?.Id ?? 1;

        var division = new Division
        {
            CompanyId = companyId,
            DivisionCode = code,
            DivisionName = request.DivisionName.Trim(),
            HeadEmployeeId = request.HeadEmployeeId,
            Status = request.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Divisions.Add(division);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetDivisionByIdAsync(division.Id, cancellationToken);
    }

    public async Task<DivisionDto> UpdateDivisionAsync(long id, UpdateDivisionDto request, CancellationToken cancellationToken = default)
    {
        var division = await _dbContext.Divisions.FindAsync(new object[] { id }, cancellationToken);
        if (division == null) throw new NotFoundException("Division", id);

        division.DivisionName = request.DivisionName.Trim();
        division.HeadEmployeeId = request.HeadEmployeeId;
        division.Status = request.Status;
        division.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetDivisionByIdAsync(id, cancellationToken);
    }

    public async Task DeleteDivisionAsync(long id, CancellationToken cancellationToken = default)
    {
        var division = await _dbContext.Divisions
            .Include(d => d.Departments)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (division == null) throw new NotFoundException("Division", id);

        // ตรวจสอบว่ายังมีแผนกสังกัดอยู่หรือไม่
        if (division.Departments.Any())
        {
            throw new BusinessRuleException($"ไม่สามารถลบฝ่าย '{division.DivisionName}' ได้ เนื่องจากยังมี {division.Departments.Count} แผนกสังกัดอยู่ โปรดย้ายหรือลบแผนกออกก่อน");
        }

        _dbContext.Divisions.Remove(division);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    #endregion

    #region Departments
    public async Task<List<DepartmentDto>> GetAllDepartmentsAsync(long? divisionId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Departments
            .AsNoTracking()
            .Include(d => d.Division)
            .Include(d => d.ParentDepartment)
            .Include(d => d.HeadEmployee)
            .Include(d => d.Positions)
            .AsQueryable();

        if (divisionId.HasValue)
        {
            query = query.Where(d => d.DivisionId == divisionId.Value);
        }

        return await query
            .OrderBy(d => d.DepartmentCode)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                DivisionId = d.DivisionId,
                DivisionName = d.Division.DivisionName,
                ParentDepartmentId = d.ParentDepartmentId,
                ParentDepartmentName = d.ParentDepartment != null ? d.ParentDepartment.DepartmentName : null,
                DepartmentCode = d.DepartmentCode,
                DepartmentName = d.DepartmentName,
                HeadEmployeeId = d.HeadEmployeeId,
                HeadEmployeeName = d.HeadEmployee != null ? d.HeadEmployee.FullName : null,
                PositionCount = d.Positions.Count,
                Status = d.Status,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<DepartmentDto> GetDepartmentByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var d = await _dbContext.Departments
            .AsNoTracking()
            .Include(x => x.Division)
            .Include(x => x.ParentDepartment)
            .Include(x => x.HeadEmployee)
            .Include(x => x.Positions)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (d == null) throw new NotFoundException("Department", id);

        return new DepartmentDto
        {
            Id = d.Id,
            DivisionId = d.DivisionId,
            DivisionName = d.Division.DivisionName,
            ParentDepartmentId = d.ParentDepartmentId,
            ParentDepartmentName = d.ParentDepartment != null ? d.ParentDepartment.DepartmentName : null,
            DepartmentCode = d.DepartmentCode,
            DepartmentName = d.DepartmentName,
            HeadEmployeeId = d.HeadEmployeeId,
            HeadEmployeeName = d.HeadEmployee != null ? d.HeadEmployee.FullName : null,
            PositionCount = d.Positions.Count,
            Status = d.Status,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.DepartmentName))
        {
            throw new ValidationException("กรุณากรอกชื่อแผนก");
        }

        // รหัสรันอัตโนมัติ (DEP001, DEP002, ...) ถ้าไม่ได้ระบุมา
        string code = string.IsNullOrWhiteSpace(request.DepartmentCode)
            ? await CodeGenerator.NextAsync(_dbContext.Departments.Select(d => d.DepartmentCode), "DEP", 3, cancellationToken)
            : request.DepartmentCode.Trim().ToUpper();

        // ตรวจสอบรหัสแผนกซ้ำในสายงานเดียวกัน
        bool exists = await _dbContext.Departments.AnyAsync(d =>
            d.DivisionId == request.DivisionId && d.DepartmentCode.ToUpper() == code, cancellationToken);
        if (exists)
        {
            throw new ValidationException($"รหัสแผนก '{code}' มีอยู่ในสายงานนี้แล้ว");
        }

        var dept = new Department
        {
            DivisionId = request.DivisionId,
            ParentDepartmentId = request.ParentDepartmentId,
            DepartmentCode = code,
            DepartmentName = request.DepartmentName.Trim(),
            HeadEmployeeId = request.HeadEmployeeId,
            Status = request.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Departments.Add(dept);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetDepartmentByIdAsync(dept.Id, cancellationToken);
    }

    public async Task<DepartmentDto> UpdateDepartmentAsync(long id, UpdateDepartmentDto request, CancellationToken cancellationToken = default)
    {
        var dept = await _dbContext.Departments.FindAsync(new object[] { id }, cancellationToken);
        if (dept == null) throw new NotFoundException("Department", id);

        dept.DivisionId = request.DivisionId;
        dept.ParentDepartmentId = request.ParentDepartmentId;
        dept.DepartmentName = request.DepartmentName.Trim();
        dept.HeadEmployeeId = request.HeadEmployeeId;
        dept.Status = request.Status;
        dept.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetDepartmentByIdAsync(id, cancellationToken);
    }

    public async Task DeleteDepartmentAsync(long id, CancellationToken cancellationToken = default)
    {
        var dept = await _dbContext.Departments
            .Include(d => d.Positions)
            .Include(d => d.SubDepartments)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (dept == null) throw new NotFoundException("Department", id);

        if (dept.SubDepartments.Any())
        {
            throw new BusinessRuleException($"ไม่สามารถลบแผนก '{dept.DepartmentName}' ได้ เนื่องจากยังมีแผนกย่อยสังกัดอยู่");
        }

        if (dept.Positions.Any())
        {
            throw new BusinessRuleException($"ไม่สามารถลบแผนก '{dept.DepartmentName}' ได้ เนื่องจากยังมี {dept.Positions.Count} ตำแหน่งงานสังกัดอยู่");
        }

        _dbContext.Departments.Remove(dept);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    #endregion

    #region Positions
    public async Task<List<PositionDto>> GetAllPositionsAsync(long? departmentId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Positions
            .AsNoTracking()
            .Include(p => p.Department)
                .ThenInclude(d => d.Division)
            .Include(p => p.EmployeeLevel)
            .AsQueryable();

        if (departmentId.HasValue)
        {
            query = query.Where(p => p.DepartmentId == departmentId.Value);
        }

        return await query
            .OrderBy(p => p.PositionCode)
            .Select(p => new PositionDto
            {
                Id = p.Id,
                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department.DepartmentName,
                DivisionName = p.Department.Division.DivisionName,
                EmployeeLevelId = p.EmployeeLevelId,
                LevelCode = p.EmployeeLevel != null ? p.EmployeeLevel.LevelCode : null,
                LevelName = p.EmployeeLevel != null ? p.EmployeeLevel.LevelName : null,
                PositionCode = p.PositionCode,
                PositionName = p.PositionName,
                Status = p.Status,
                HeadcountPlan = p.HeadcountPlan,
                FilledCount = _dbContext.EmployeeAssignments.Count(a => a.PositionId == p.Id && a.IsCurrent
                                                                       && a.Employee != null && a.Employee.EmploymentStatus == "ACTIVE"),
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PositionDto> GetPositionByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var p = await _dbContext.Positions
            .AsNoTracking()
            .Include(x => x.Department)
                .ThenInclude(d => d.Division)
            .Include(x => x.EmployeeLevel)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (p == null) throw new NotFoundException("Position", id);

        var filled = await _dbContext.EmployeeAssignments.CountAsync(a => a.PositionId == id && a.IsCurrent
                                                                         && a.Employee != null && a.Employee.EmploymentStatus == "ACTIVE", cancellationToken);
        return new PositionDto
        {
            Id = p.Id,
            DepartmentId = p.DepartmentId,
            DepartmentName = p.Department.DepartmentName,
            DivisionName = p.Department.Division.DivisionName,
            EmployeeLevelId = p.EmployeeLevelId,
            LevelCode = p.EmployeeLevel != null ? p.EmployeeLevel.LevelCode : null,
            LevelName = p.EmployeeLevel != null ? p.EmployeeLevel.LevelName : null,
            PositionCode = p.PositionCode,
            PositionName = p.PositionName,
            Status = p.Status,
            HeadcountPlan = p.HeadcountPlan,
            FilledCount = filled,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }

    /// <summary>ชื่อตำแหน่งต้องไม่ซ้ำภายในแผนกเดียวกัน (ฟอร์มพนักงานเลือกตำแหน่งตามชื่อ+แผนก)</summary>
    private async Task EnsureUniquePositionNameAsync(long departmentId, string name, long? excludeId, CancellationToken cancellationToken)
    {
        var key = (name ?? string.Empty).Trim().ToLower();
        var dup = await _dbContext.Positions.AnyAsync(p => p.DepartmentId == departmentId && p.PositionName.Trim().ToLower() == key
                                                           && (excludeId == null || p.Id != excludeId), cancellationToken);
        if (dup)
            throw new ValidationException($"แผนกนี้มีตำแหน่งชื่อ '{name?.Trim()}' อยู่แล้ว");
    }

    private static int? ValidateHeadcount(int? plan)
    {
        if (plan.HasValue && (plan.Value < 0 || plan.Value > 100000))
            throw new ValidationException("อัตรากำลังต้องเป็นจำนวน 0 ขึ้นไป (เว้นว่าง = ไม่กำหนด)");
        return plan;
    }

    public async Task<PositionDto> CreatePositionAsync(CreatePositionDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.PositionName))
        {
            throw new ValidationException("กรุณากรอกชื่อตำแหน่ง");
        }

        // รหัสรันอัตโนมัติ (POS001, POS002, ...) ถ้าไม่ได้ระบุมา
        string code = string.IsNullOrWhiteSpace(request.PositionCode)
            ? await CodeGenerator.NextAsync(_dbContext.Positions.Select(p => p.PositionCode), "POS", 3, cancellationToken)
            : request.PositionCode.Trim().ToUpper();

        bool exists = await _dbContext.Positions.AnyAsync(p => p.PositionCode.ToUpper() == code, cancellationToken);
        if (exists)
        {
            throw new ValidationException($"รหัสตำแหน่ง '{code}' มีอยู่ในระบบแล้ว");
        }

        await EnsureUniquePositionNameAsync(request.DepartmentId, request.PositionName, null, cancellationToken);

        var pos = new Position
        {
            DepartmentId = request.DepartmentId,
            EmployeeLevelId = request.EmployeeLevelId,
            PositionCode = code,
            PositionName = request.PositionName.Trim(),
            Status = request.Status,
            HeadcountPlan = ValidateHeadcount(request.HeadcountPlan),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Positions.Add(pos);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetPositionByIdAsync(pos.Id, cancellationToken);
    }

    public async Task<PositionDto> UpdatePositionAsync(long id, UpdatePositionDto request, CancellationToken cancellationToken = default)
    {
        var pos = await _dbContext.Positions.FindAsync(new object[] { id }, cancellationToken);
        if (pos == null) throw new NotFoundException("Position", id);

        await EnsureUniquePositionNameAsync(request.DepartmentId, request.PositionName, id, cancellationToken);
        pos.DepartmentId = request.DepartmentId;
        pos.EmployeeLevelId = request.EmployeeLevelId;
        pos.PositionName = request.PositionName.Trim();
        pos.Status = request.Status;
        pos.HeadcountPlan = ValidateHeadcount(request.HeadcountPlan);
        pos.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetPositionByIdAsync(id, cancellationToken);
    }

    public async Task DeletePositionAsync(long id, CancellationToken cancellationToken = default)
    {
        var pos = await _dbContext.Positions.FindAsync(new object[] { id }, cancellationToken);
        if (pos == null) throw new NotFoundException("Position", id);

        var assignmentCount = await _dbContext.EmployeeAssignments.CountAsync(a => a.PositionId == id, cancellationToken);
        if (assignmentCount > 0)
        {
            throw new BusinessRuleException($"ไม่สามารถลบตำแหน่ง '{pos.PositionName}' ได้ เนื่องจากมีประวัติหรือพนักงานใช้งานตำแหน่งนี้อยู่ {assignmentCount} คน (หากไม่ต้องการใช้งาน กรุณาแก้ไขสถานะเป็น 'ไม่ได้ใช้งาน' แทน)");
        }

        var salaryCount = await _dbContext.SalaryStructures.CountAsync(s => s.PositionId == id, cancellationToken);
        if (salaryCount > 0)
        {
            throw new BusinessRuleException($"ไม่สามารถลบตำแหน่ง '{pos.PositionName}' ได้ เนื่องจากมีโครงสร้างเงินเดือนเชื่อมโยงอยู่ {salaryCount} รายการ (โปรดยกเลิกหรือลบโครงสร้างเงินเดือนก่อน)");
        }

        var transferCount = await _dbContext.EmployeeTransferRequests.CountAsync(t => t.FromPositionId == id || t.ToPositionId == id, cancellationToken);
        if (transferCount > 0)
        {
            throw new BusinessRuleException($"ไม่สามารถลบตำแหน่ง '{pos.PositionName}' ได้ เนื่องจากมีประวัติคำขอโอนย้ายตำแหน่งเชื่อมโยงอยู่ {transferCount} รายการ");
        }

        _dbContext.Positions.Remove(pos);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    #endregion

    #region Employee Levels
    public async Task<List<EmployeeLevelDto>> GetAllEmployeeLevelsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.EmployeeLevels
            .AsNoTracking()
            .OrderBy(l => l.LevelRank ?? 999)
            .ThenBy(l => l.LevelCode)
            .Select(l => new EmployeeLevelDto
            {
                Id = l.Id,
                LevelCode = l.LevelCode,
                LevelName = l.LevelName,
                LevelRank = l.LevelRank,
                Status = l.Status
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<EmployeeLevelDto> GetEmployeeLevelByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var level = await _dbContext.EmployeeLevels
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (level == null)
            throw new KeyNotFoundException($"ไม่พบระดับพนักงานรหัส {id}");

        return new EmployeeLevelDto
        {
            Id = level.Id,
            LevelCode = level.LevelCode,
            LevelName = level.LevelName,
            LevelRank = level.LevelRank,
            Status = level.Status
        };
    }

    public async Task<EmployeeLevelDto> CreateEmployeeLevelAsync(CreateEmployeeLevelDto request, CancellationToken cancellationToken = default)
    {
        // รหัสรันอัตโนมัติ (LVL01, LVL02, ...) ถ้าไม่ได้ระบุมา
        string levelCode = string.IsNullOrWhiteSpace(request.LevelCode)
            ? await CodeGenerator.NextAsync(_dbContext.EmployeeLevels.Select(l => l.LevelCode), "LVL", 2, cancellationToken)
            : request.LevelCode.Trim();

        bool exists = await _dbContext.EmployeeLevels
            .AnyAsync(l => l.LevelCode.ToLower() == levelCode.ToLower(), cancellationToken);

        if (exists)
            throw new InvalidOperationException($"รหัสระดับพนักงาน '{levelCode}' มีอยู่ในระบบแล้ว");

        var level = new EmployeeLevel
        {
            LevelCode = levelCode,
            LevelName = request.LevelName.Trim(),
            LevelRank = request.LevelRank,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status
        };

        _dbContext.EmployeeLevels.Add(level);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new EmployeeLevelDto
        {
            Id = level.Id,
            LevelCode = level.LevelCode,
            LevelName = level.LevelName,
            LevelRank = level.LevelRank,
            Status = level.Status
        };
    }

    public async Task<EmployeeLevelDto> UpdateEmployeeLevelAsync(long id, UpdateEmployeeLevelDto request, CancellationToken cancellationToken = default)
    {
        var level = await _dbContext.EmployeeLevels
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (level == null)
            throw new KeyNotFoundException($"ไม่พบระดับพนักงานรหัส {id}");

        level.LevelName = request.LevelName.Trim();
        level.LevelRank = request.LevelRank;
        level.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new EmployeeLevelDto
        {
            Id = level.Id,
            LevelCode = level.LevelCode,
            LevelName = level.LevelName,
            LevelRank = level.LevelRank,
            Status = level.Status
        };
    }

    public async Task DeleteEmployeeLevelAsync(long id, CancellationToken cancellationToken = default)
    {
        var level = await _dbContext.EmployeeLevels
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (level == null)
            throw new NotFoundException("EmployeeLevel", id);

        bool inUse = await _dbContext.Positions.AnyAsync(p => p.EmployeeLevelId == id, cancellationToken);
        if (inUse)
            throw new BusinessRuleException($"ไม่สามารถลบระดับพนักงาน '{level.LevelName}' ได้ เนื่องจากมีตำแหน่งงานที่เชื่อมโยงอยู่");

        _dbContext.EmployeeLevels.Remove(level);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    #endregion

    #region Org Chart
    public async Task<OrgChartDto> GetOrgChartAsync(CancellationToken cancellationToken = default)
    {
        var company = await _dbContext.Companies.AsNoTracking()
            .OrderBy(c => c.Id)
            .Select(c => new { c.CompanyName, c.CeoEmployeeId })
            .FirstOrDefaultAsync(cancellationToken);

        var divisions = await _dbContext.Divisions.AsNoTracking()
            .Where(d => d.Status == "ACTIVE")
            .OrderBy(d => d.DivisionCode)
            .ToListAsync(cancellationToken);

        var departments = await _dbContext.Departments.AsNoTracking()
            .Where(d => d.Status == "ACTIVE")
            .OrderBy(d => d.DepartmentCode)
            .ToListAsync(cancellationToken);

        var plans = (await _dbContext.Positions.AsNoTracking()
                .Where(p => p.Status == "ACTIVE" && p.HeadcountPlan != null)
                .Select(p => new { p.DepartmentId, Plan = p.HeadcountPlan!.Value })
                .ToListAsync(cancellationToken))
            .GroupBy(p => p.DepartmentId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Plan));

        // เฉพาะพนักงานที่ยังทำงานอยู่ + ตำแหน่งปัจจุบันล่าสุด
        var rows = await _dbContext.Employees.AsNoTracking()
            .Where(e => e.EmploymentStatus == "ACTIVE")
            .Select(e => new
            {
                e.Id,
                e.EmployeeCode,
                e.Prefix,
                e.FirstName,
                e.LastName,
                e.AvatarUpdatedAt,
                WorkEmail = e.Contact != null ? e.Contact.OrganizationEmail : null,
                Assignment = e.Assignments
                    .Where(a => a.IsCurrent)
                    .OrderByDescending(a => a.EffectiveFrom)
                    .Select(a => new
                    {
                        a.DivisionId,
                        a.DepartmentId,
                        PositionName = a.Position != null ? a.Position.PositionName : null
                    })
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var people = rows.ToDictionary(r => r.Id, r => new OrgChartPersonDto
        {
            Id = r.Id,
            EmployeeCode = r.EmployeeCode,
            FullName = $"{r.Prefix} {r.FirstName} {r.LastName}".Trim(),
            PositionName = r.Assignment?.PositionName,
            AvatarUrl = r.AvatarUpdatedAt.HasValue ? $"/api/employees/{r.Id}/avatar?v={r.AvatarUpdatedAt.Value.Ticks}" : null,
            WorkEmail = string.IsNullOrWhiteSpace(r.WorkEmail) ? null : r.WorkEmail
        });

        // หัวหน้าที่ลาออก/ไม่ active → ถือว่าตำแหน่งว่าง
        OrgChartPersonDto? Person(long? id) => id.HasValue && people.TryGetValue(id.Value, out var p) ? p : null;

        // คนที่แสดงเป็นหัวหน้าในแผนผังแล้ว จะไม่ซ้ำในรายชื่อสมาชิก
        var shownAsHead = new HashSet<long>();
        if (Person(company?.CeoEmployeeId) != null) shownAsHead.Add(company!.CeoEmployeeId!.Value);
        foreach (var d in divisions) if (Person(d.HeadEmployeeId) != null) shownAsHead.Add(d.HeadEmployeeId!.Value);
        foreach (var d in departments) if (Person(d.HeadEmployeeId) != null) shownAsHead.Add(d.HeadEmployeeId!.Value);

        var activeDivisionIds = divisions.Select(d => d.Id).ToHashSet();
        var activeDepartmentIds = departments.Where(d => activeDivisionIds.Contains(d.DivisionId)).Select(d => d.Id).ToHashSet();

        var byDepartment = rows
            .Where(r => r.Assignment != null && activeDepartmentIds.Contains(r.Assignment.DepartmentId))
            .GroupBy(r => r.Assignment!.DepartmentId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Id).ToList());

        // กันกรณีข้อมูลแผนกแม่-ลูกวนกันเอง (แต่ละแผนกถูกสร้างได้ครั้งเดียว)
        var builtDepartments = new HashSet<long>();
        OrgChartDepartmentDto BuildDepartment(Department d)
        {
            builtDepartments.Add(d.Id);
            var memberIds = byDepartment.TryGetValue(d.Id, out var ids) ? ids : new List<long>();
            return new OrgChartDepartmentDto
            {
                Id = d.Id,
                DepartmentCode = d.DepartmentCode,
                DepartmentName = d.DepartmentName,
                Head = Person(d.HeadEmployeeId),
                ActiveCount = memberIds.Count,
                HeadcountPlan = plans.TryGetValue(d.Id, out var plan) ? plan : null,
                Members = memberIds.Where(id => !shownAsHead.Contains(id))
                    .Select(id => people[id])
                    .OrderBy(p => p.EmployeeCode)
                    .ToList(),
                SubDepartments = departments
                    .Where(c => c.ParentDepartmentId == d.Id && c.DivisionId == d.DivisionId && !builtDepartments.Contains(c.Id))
                    .Select(BuildDepartment)
                    .ToList()
            };
        }

        var result = new OrgChartDto
        {
            CompanyName = company?.CompanyName ?? string.Empty,
            Ceo = Person(company?.CeoEmployeeId),
            TotalEmployees = rows.Count,
            TotalDepartments = activeDepartmentIds.Count,
        };

        foreach (var div in divisions)
        {
            var divDepts = departments.Where(d => d.DivisionId == div.Id).ToList();
            var divDeptIds = divDepts.Select(d => d.Id).ToHashSet();
            // แผนกระดับบนสุดของฝ่าย = ไม่มีแผนกแม่ หรือแผนกแม่ไม่ได้อยู่ในฝ่ายนี้/ปิดใช้งาน
            var roots = divDepts.Where(d => !d.ParentDepartmentId.HasValue || !divDeptIds.Contains(d.ParentDepartmentId.Value));
            result.Divisions.Add(new OrgChartDivisionDto
            {
                Id = div.Id,
                DivisionCode = div.DivisionCode,
                DivisionName = div.DivisionName,
                Head = Person(div.HeadEmployeeId),
                ActiveCount = divDeptIds.Sum(id => byDepartment.TryGetValue(id, out var ids) ? ids.Count : 0),
                Departments = roots.Select(BuildDepartment).ToList()
            });
        }

        result.Unassigned = rows
            .Where(r => (r.Assignment == null || !activeDepartmentIds.Contains(r.Assignment.DepartmentId)) && !shownAsHead.Contains(r.Id))
            .Select(r => people[r.Id])
            .OrderBy(p => p.EmployeeCode)
            .ToList();

        return result;
    }
    #endregion

    #region Summary
    public async Task<OrganizationSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        int companies = await _dbContext.Companies.CountAsync(cancellationToken);
        int divisions = await _dbContext.Divisions.CountAsync(cancellationToken);
        int departments = await _dbContext.Departments.CountAsync(cancellationToken);
        int positions = await _dbContext.Positions.CountAsync(cancellationToken);
        int levels = await _dbContext.EmployeeLevels.CountAsync(cancellationToken);

        return new OrganizationSummaryDto
        {
            CompanyCount = companies,
            DivisionCount = divisions,
            DepartmentCount = departments,
            PositionCount = positions,
            LevelCount = levels
        };
    }
    #endregion
}
