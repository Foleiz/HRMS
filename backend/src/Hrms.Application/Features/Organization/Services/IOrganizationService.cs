using Hrms.Application.Features.Organization.Dtos;

namespace Hrms.Application.Features.Organization.Services;

/// <summary>
/// อินเทอร์เฟซจัดการโครงสร้างองค์กร (Company, Division, Department, Position, Level)
/// สำหรับ Developer 1: Sprint 1
/// </summary>
public interface IOrganizationService
{
    // Company
    Task<CompanyDto?> GetCompanyProfileAsync(CancellationToken cancellationToken = default);
    Task<CompanyDto> UpdateCompanyProfileAsync(UpdateCompanyDto request, CancellationToken cancellationToken = default);

    // Divisions
    Task<List<DivisionDto>> GetAllDivisionsAsync(CancellationToken cancellationToken = default);
    Task<DivisionDto> GetDivisionByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<DivisionDto> CreateDivisionAsync(CreateDivisionDto request, CancellationToken cancellationToken = default);
    Task<DivisionDto> UpdateDivisionAsync(long id, UpdateDivisionDto request, CancellationToken cancellationToken = default);
    Task DeleteDivisionAsync(long id, CancellationToken cancellationToken = default);

    // Departments
    Task<List<DepartmentDto>> GetAllDepartmentsAsync(long? divisionId = null, CancellationToken cancellationToken = default);
    Task<DepartmentDto> GetDepartmentByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto request, CancellationToken cancellationToken = default);
    Task<DepartmentDto> UpdateDepartmentAsync(long id, UpdateDepartmentDto request, CancellationToken cancellationToken = default);
    Task DeleteDepartmentAsync(long id, CancellationToken cancellationToken = default);

    // Positions
    Task<List<PositionDto>> GetAllPositionsAsync(long? departmentId = null, CancellationToken cancellationToken = default);
    Task<PositionDto> GetPositionByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<PositionDto> CreatePositionAsync(CreatePositionDto request, CancellationToken cancellationToken = default);
    Task<PositionDto> UpdatePositionAsync(long id, UpdatePositionDto request, CancellationToken cancellationToken = default);
    Task DeletePositionAsync(long id, CancellationToken cancellationToken = default);

    // Employee Levels
    Task<List<EmployeeLevelDto>> GetAllEmployeeLevelsAsync(CancellationToken cancellationToken = default);

    // Dashboard Summary
    Task<OrganizationSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
