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

    // ESS Methods for Employee Self-Service
    Task<AttendanceDailyDto?> GetMyTodayAttendanceAsync(long employeeId, CancellationToken cancellationToken = default);
    Task<List<AttendanceDailyDto>> GetMyAttendanceHistoryAsync(long employeeId, int year, int month, CancellationToken cancellationToken = default);
    Task<MyAttendanceMonthlySummaryDto> GetMyMonthlySummaryAsync(long employeeId, int year, int month, CancellationToken cancellationToken = default);

    // Admin / HR Monthly Summary Methods
    Task<MonthlyAttendanceOverviewDto> GetMonthlyAttendanceSummaryAsync(int year, int month, long? departmentId = null, CancellationToken cancellationToken = default);
    Task<MonthlyAttendanceOverviewDto> ProcessMonthlyAttendanceSummaryAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<byte[]> ExportMonthlyAttendanceCsvAsync(int year, int month, long? departmentId = null, CancellationToken cancellationToken = default);
}
