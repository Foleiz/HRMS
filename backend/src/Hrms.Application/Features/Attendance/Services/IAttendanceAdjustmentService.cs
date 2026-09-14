using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Features.Attendance.Dtos;

namespace Hrms.Application.Features.Attendance.Services;

public interface IAttendanceAdjustmentService
{
    Task<PagedAdjustmentResult> GetAdjustmentsAsync(AdjustmentFilterDto filter, CancellationToken cancellationToken = default);
    Task<AttendanceAdjustmentDto> GetAdjustmentByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<AttendanceAdjustmentDto> CreateAdjustmentAsync(CreateAttendanceAdjustmentRequest request, long requestedByEmployeeId, CancellationToken cancellationToken = default);
    Task<AttendanceAdjustmentDto> ReviewAdjustmentAsync(long id, ReviewAttendanceAdjustmentRequest request, long reviewedByEmployeeId, CancellationToken cancellationToken = default);
    Task<AttendanceAdjustmentDto> CancelAdjustmentAsync(long id, long employeeId, CancellationToken cancellationToken = default);
    Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default);
}
