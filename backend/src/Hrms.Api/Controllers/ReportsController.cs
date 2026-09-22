using Hrms.Application.Common.Models;
using Hrms.Application.Features.Reports.DTOs;
using Hrms.Application.Features.Reports.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IOperationalReportService _reportService;

    public ReportsController(IOperationalReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>
    /// ดึงข้อมูลรายงานอัตรากำลังคนประจำวัน (Daily Department Headcount Snapshot)
    /// </summary>
    [HttpGet("headcount/daily")]
    public async Task<ActionResult<ApiResponse<DailyHeadcountSummaryDto>>> GetDailyHeadcountSnapshot(
        [FromQuery] string? date,
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        DateOnly queryDate = DateOnly.FromDateTime(DateTime.Today);
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsed))
        {
            queryDate = parsed;
        }

        var result = await _reportService.GetDailyHeadcountSnapshotAsync(queryDate, divisionId, departmentId, cancellationToken);
        return Ok(ApiResponse<DailyHeadcountSummaryDto>.Ok(result, "ดึงรายงานอัตรากำลังคนประจำวันสำเร็จ"));
    }

    /// <summary>
    /// ส่งออกรายงานอัตรากำลังคนประจำวันเป็นไฟล์ CSV
    /// </summary>
    [HttpGet("headcount/daily/export")]
    public async Task<IActionResult> ExportDailyHeadcountCsv(
        [FromQuery] string? date,
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        DateOnly queryDate = DateOnly.FromDateTime(DateTime.Today);
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsed))
        {
            queryDate = parsed;
        }

        var csvBytes = await _reportService.ExportDailyHeadcountCsvAsync(queryDate, divisionId, departmentId, cancellationToken);
        var fileName = $"Daily_Headcount_{queryDate:yyyyMMdd}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    /// <summary>
    /// ดึงรายงานสรุปเวลาทำงานและการมาสายประจำเดือน (Monthly Attendance & Lateness Report)
    /// </summary>
    [HttpGet("attendance/monthly-lateness")]
    public async Task<ActionResult<ApiResponse<MonthlyLatenessReportDto>>> GetMonthlyAttendanceLatenessReport(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var result = await _reportService.GetMonthlyAttendanceLatenessReportAsync(queryYear, queryMonth, departmentId, search, cancellationToken);
        return Ok(ApiResponse<MonthlyLatenessReportDto>.Ok(result, "ดึงรายงานสรุปเวลาและการมาสายประจำเดือนสำเร็จ"));
    }

    /// <summary>
    /// ส่งออกรายงานสรุปเวลาและการมาสายประจำเดือนเป็นไฟล์ CSV
    /// </summary>
    [HttpGet("attendance/monthly-lateness/export")]
    public async Task<IActionResult> ExportMonthlyLatenessCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportMonthlyLatenessCsvAsync(queryYear, queryMonth, departmentId, search, cancellationToken);
        var fileName = $"Monthly_Attendance_Lateness_{queryYear}_{queryMonth:D2}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    /// <summary>
    /// ดึงรายงานสรุปภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) ประจำเดือน
    /// </summary>
    [HttpGet("financial/payroll-tax")]
    public async Task<ActionResult<ApiResponse<PayrollTaxSummaryDto>>> GetPayrollTaxSummaryReport(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var result = await _reportService.GetPayrollTaxSummaryReportAsync(queryYear, queryMonth, departmentId, cancellationToken);
        return Ok(ApiResponse<PayrollTaxSummaryDto>.Ok(result, "ดึงรายงานสรุปภาษีหัก ณ ที่จ่ายและประกันสังคมสำเร็จ"));
    }

    /// <summary>
    /// ส่งออกรายงานสรุปภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) เป็นไฟล์ CSV
    /// </summary>
    [HttpGet("financial/payroll-tax/export")]
    public async Task<IActionResult> ExportPayrollTaxCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportPayrollTaxCsvAsync(queryYear, queryMonth, departmentId, cancellationToken);
        var fileName = $"PND1_Tax_Report_{queryYear}_{queryMonth:D2}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    /// <summary>
    /// ส่งออกรายงานการนำส่งเงินสมทบกองทุนประกันสังคม (สปส. 1-10) เป็นไฟล์ CSV
    /// </summary>
    [HttpGet("financial/sso/export")]
    public async Task<IActionResult> ExportSsoCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportSsoCsvAsync(queryYear, queryMonth, departmentId, cancellationToken);
        var fileName = $"SSO_Report_1_10_{queryYear}_{queryMonth:D2}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    /// <summary>
    /// ดึงรายงานอัตราการเข้า-ออกของพนักงาน (Monthly Turnover Rate)
    /// </summary>
    [HttpGet("analytics/turnover")]
    public async Task<ActionResult<ApiResponse<MonthlyTurnoverSummaryDto>>> GetMonthlyTurnoverReport(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var result = await _reportService.GetMonthlyTurnoverReportAsync(queryYear, queryMonth, divisionId, departmentId, cancellationToken);
        return Ok(ApiResponse<MonthlyTurnoverSummaryDto>.Ok(result, "ดึงรายงานอัตราการเข้า-ออกของพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ส่งออกรายงานอัตราการเข้า-ออกของพนักงานเป็นไฟล์ CSV
    /// </summary>
    [HttpGet("analytics/turnover/export")]
    public async Task<IActionResult> ExportMonthlyTurnoverCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportMonthlyTurnoverCsvAsync(queryYear, queryMonth, divisionId, departmentId, cancellationToken);
        var fileName = $"Turnover_Report_{queryYear}_{queryMonth:D2}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }
}
