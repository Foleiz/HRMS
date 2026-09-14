using Hrms.Application.Features.Reports.DTOs;

namespace Hrms.Application.Features.Reports.Services;

public interface IOperationalReportService
{
    /// <summary>
    /// ดึงรายงานภาพรวมอัตรากำลังคนประจำวัน
    /// </summary>
    Task<DailyHeadcountSummaryDto> GetDailyHeadcountSnapshotAsync(
        DateOnly date,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ส่งออกรายงานอัตรากำลังคนประจำวันเป็นไฟล์ CSV
    /// </summary>
    Task<byte[]> ExportDailyHeadcountCsvAsync(
        DateOnly date,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงรายงานสรุปเวลาและการมาสายประจำเดือน
    /// </summary>
    Task<MonthlyLatenessReportDto> GetMonthlyAttendanceLatenessReportAsync(
        int year,
        int month,
        long? departmentId = null,
        string? search = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ส่งออกรายงานสรุปเวลาและการมาสายประจำเดือนเป็นไฟล์ CSV
    /// </summary>
    Task<byte[]> ExportMonthlyLatenessCsvAsync(
        int year,
        int month,
        long? departmentId = null,
        string? search = null,
        CancellationToken cancellationToken = default);
}
