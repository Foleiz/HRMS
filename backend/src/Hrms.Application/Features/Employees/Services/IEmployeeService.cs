using Hrms.Application.Features.Employees.DTOs;

namespace Hrms.Application.Features.Employees.Services;

/// <summary>
/// Interface บริการจัดการข้อมูลประวัติพนักงานและ PDPA Security
/// </summary>
public interface IEmployeeService
{
    Task<List<EmployeeDto>> GetAllAsync(string? search = null, CancellationToken cancellationToken = default);
    Task<EmployeeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<EmployeeDto> UpdateAsync(long id, UpdateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
