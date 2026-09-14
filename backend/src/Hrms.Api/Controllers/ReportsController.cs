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
}
