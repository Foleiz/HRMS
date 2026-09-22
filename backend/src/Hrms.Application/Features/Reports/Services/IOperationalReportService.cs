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

    /// <summary>
    /// ดึงรายงานสรุปภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) ประจำเดือน
    /// </summary>
    Task<PayrollTaxSummaryDto> GetPayrollTaxSummaryReportAsync(
        int year,
        int month,
        long? departmentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ส่งออกรายงานภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) เป็นไฟล์ CSV
    /// </summary>
    Task<byte[]> ExportPayrollTaxCsvAsync(
        int year,
        int month,
        long? departmentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ส่งออกรายงานเงินสมทบประกันสังคม (สปส. 1-10) เป็นไฟล์ CSV
    /// </summary>
    Task<byte[]> ExportSsoCsvAsync(
        int year,
        int month,
        long? departmentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงรายงานอัตราการเข้า-ออกของพนักงาน (Monthly Turnover Rate)
    /// </summary>
    Task<MonthlyTurnoverSummaryDto> GetMonthlyTurnoverReportAsync(
        int year,
        int month,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// ส่งออกรายงานอัตราการเข้า-ออกของพนักงานเป็นไฟล์ CSV
    /// </summary>
    Task<byte[]> ExportMonthlyTurnoverCsvAsync(
        int year,
        int month,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default);
}
