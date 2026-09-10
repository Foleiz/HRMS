using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
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

    #region Company
    public async Task<CompanyDto?> GetCompanyProfileAsync(CancellationToken cancellationToken = default)
    {
        var company = await _dbContext.Companies.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (company == null) return null;

        return new CompanyDto
        {
            Id = company.Id,
            CompanyCode = company.CompanyCode,
            CompanyName = company.CompanyName,
            Address = company.Address,
            Phone = company.Phone,
            Email = company.Email,
            Status = company.Status,
            UpdatedAt = company.UpdatedAt
        };
    }

    public async Task<CompanyDto> UpdateCompanyProfileAsync(UpdateCompanyDto request, CancellationToken cancellationToken = default)
    {
        var company = await _dbContext.Companies.FirstOrDefaultAsync(cancellationToken);
        if (company == null)
        {
            throw new NotFoundException("Company", 1);
        }

        company.CompanyName = request.CompanyName.Trim();
        company.Address = request.Address?.Trim();
        company.Phone = request.Phone?.Trim();
        company.Email = request.Email?.Trim();
        company.Status = request.Status;
        company.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new CompanyDto
        {
            Id = company.Id,
            CompanyCode = company.CompanyCode,
            CompanyName = company.CompanyName,
            Address = company.Address,
            Phone = company.Phone,
            Email = company.Email,
            Status = company.Status,
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
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<DivisionDto> CreateDivisionAsync(CreateDivisionDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.DivisionCode) || string.IsNullOrWhiteSpace(request.DivisionName))
        {
            throw new ValidationException("กรุณากรอกรหัสฝ่ายและชื่อฝ่าย");
        }

        string code = request.DivisionCode.Trim().ToUpper();

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
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.DepartmentCode) || string.IsNullOrWhiteSpace(request.DepartmentName))
        {
            throw new ValidationException("กรุณากรอกรหัสแผนกและชื่อแผนก");
        }

        string code = request.DepartmentCode.Trim().ToUpper();

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
            UpdatedAt = p.UpdatedAt
        };
    }

    public async Task<PositionDto> CreatePositionAsync(CreatePositionDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.PositionCode) || string.IsNullOrWhiteSpace(request.PositionName))
        {
            throw new ValidationException("กรุณากรอกรหัสตำแหน่งและชื่อตำแหน่ง");
        }

        string code = request.PositionCode.Trim().ToUpper();

        bool exists = await _dbContext.Positions.AnyAsync(p => p.PositionCode.ToUpper() == code, cancellationToken);
        if (exists)
        {
            throw new ValidationException($"รหัสตำแหน่ง '{code}' มีอยู่ในระบบแล้ว");
        }

        var pos = new Position
        {
            DepartmentId = request.DepartmentId,
            EmployeeLevelId = request.EmployeeLevelId,
            PositionCode = code,
            PositionName = request.PositionName.Trim(),
            Status = request.Status,
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

        pos.DepartmentId = request.DepartmentId;
        pos.EmployeeLevelId = request.EmployeeLevelId;
        pos.PositionName = request.PositionName.Trim();
        pos.Status = request.Status;
        pos.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetPositionByIdAsync(id, cancellationToken);
    }

    public async Task DeletePositionAsync(long id, CancellationToken cancellationToken = default)
    {
        var pos = await _dbContext.Positions.FindAsync(new object[] { id }, cancellationToken);
        if (pos == null) throw new NotFoundException("Position", id);

        _dbContext.Positions.Remove(pos);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
    #endregion

    #region Employee Levels
    public async Task<List<EmployeeLevelDto>> GetAllEmployeeLevelsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.EmployeeLevels
            .AsNoTracking()
            .OrderBy(l => l.LevelCode)
            .Select(l => new EmployeeLevelDto
            {
                Id = l.Id,
                LevelCode = l.LevelCode,
                LevelName = l.LevelName,
                LevelRank = l.LevelRank,
                MinSalary = l.MinSalary,
                MaxSalary = l.MaxSalary,
                ApprovalLimit = l.ApprovalLimit,
                Status = l.Status
            })
            .ToListAsync(cancellationToken);
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
