using Hrms.Application.Features.MasterData.DTOs;

namespace Hrms.Application.Features.MasterData.Services;

public interface IEmployeeTypeService
{
    Task<List<EmployeeTypeDto>> GetAllAsync(string? search = null, string? status = null, CancellationToken cancellationToken = default);
    Task<EmployeeTypeStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);
    Task<EmployeeTypeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<EmployeeTypeDto> CreateAsync(CreateEmployeeTypeRequest request, CancellationToken cancellationToken = default);
    Task<EmployeeTypeDto> UpdateAsync(long id, UpdateEmployeeTypeRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
