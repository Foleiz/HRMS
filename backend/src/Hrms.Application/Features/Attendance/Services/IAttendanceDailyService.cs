using System;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Features.Attendance.Dtos;

namespace Hrms.Application.Features.Attendance.Services;

public interface IAttendanceDailyService
{
    Task<PagedAttendanceResult> GetDailyAttendanceAsync(DailyAttendanceFilterQuery filter, CancellationToken cancellationToken = default);
    Task<DailyAttendanceSummaryDto> GetDailySummaryAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<AttendanceDailyDto> ClockInAsync(ClockInRequest request, CancellationToken cancellationToken = default);
    Task<AttendanceDailyDto> ClockOutAsync(ClockOutRequest request, CancellationToken cancellationToken = default);
    Task<AttendanceDailyDto> UpdateAttendanceAsync(long id, UpdateAttendanceRequest request, CancellationToken cancellationToken = default);
    Task<int> CalculateDailyAttendanceForDateAsync(DateOnly date, CancellationToken cancellationToken = default);
}
