using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Features.Attendance.Dtos;

namespace Hrms.Application.Features.Attendance.Services;

public interface IOvertimeService
{
    Task<List<OvertimeRequestDto>> GetOvertimeRequestsAsync(OvertimeFilterQuery filter, CancellationToken cancellationToken = default);
    Task<OvertimeRequestDto?> GetOvertimeRequestByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<OvertimeRequestDto> CreateOvertimeRequestAsync(CreateOvertimeRequest request, CancellationToken cancellationToken = default);
    Task<OvertimeRequestDto> ReviewOvertimeRequestAsync(long id, ReviewOvertimeRequest request, long reviewerEmployeeId, CancellationToken cancellationToken = default);
    Task<bool> CancelOvertimeRequestAsync(long id, long employeeId, CancellationToken cancellationToken = default);
}
