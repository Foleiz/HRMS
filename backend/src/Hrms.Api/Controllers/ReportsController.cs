using Hrms.Api.Filters;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Utilities;
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
    [RequirePermission("REPORT_HEADCOUNT_VIEW,REPORT_VIEW,DASHBOARD_DEPT_VIEW,DASHBOARD_DIV_VIEW,DASHBOARD_CEO_VIEW,DASHBOARD_ADMIN_VIEW")]
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
    [RequirePermission("REPORT_HEADCOUNT_VIEW,REPORT_VIEW")]
    public async Task<IActionResult> ExportDailyHeadcountCsv(
        [FromQuery] string? date,
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        DateOnly queryDate = DateOnly.FromDateTime(DateTime.Today);
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsed))
        {
            queryDate = parsed;
        }

        var csvBytes = await _reportService.ExportDailyHeadcountCsvAsync(queryDate, divisionId, departmentId, cancellationToken);
        var fileName = $"Daily_Headcount_{queryDate:yyyyMMdd}.csv";

        return ExportFile(csvBytes, fileName, format);
    }

    /// <summary>
    /// ดึงรายงานสรุปเวลาทำงานและการมาสายประจำเดือน (Monthly Attendance & Lateness Report)
    /// </summary>
    [HttpGet("attendance/monthly-lateness")]
    [RequirePermission("REPORT_ATT_VIEW,REPORT_VIEW")]
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
    [RequirePermission("REPORT_ATT_VIEW,REPORT_VIEW")]
    public async Task<IActionResult> ExportMonthlyLatenessCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        [FromQuery] string? search,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportMonthlyLatenessCsvAsync(queryYear, queryMonth, departmentId, search, cancellationToken);
        var fileName = $"Monthly_Attendance_Lateness_{queryYear}_{queryMonth:D2}.csv";

        return ExportFile(csvBytes, fileName, format);
    }

    /// <summary>
    /// ดึงรายงานสรุปภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) ประจำเดือน
    /// </summary>
    [HttpGet("financial/payroll-tax")]
    [RequirePermission("PAYROLL_TAX_VIEW,PAYROLL_HR_VIEW,PAYROLL_FINANCE_VIEW,PAYROLL_ADMIN_VIEW,PAYROLL_VIEW")]
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
    // ไฟล์ ภ.ง.ด.1 มีข้อมูลเงินได้ทุกคน — เฉพาะการเงิน/ภาษีเงินเดือน (ไม่เปิดให้ REPORT_VIEW ทั่วไป)
    [RequirePermission("PAYROLL_TAX_VIEW,PAYROLL_FINANCE_VIEW,PAYROLL_ADMIN_VIEW,PAYROLL_EXPORT")]
    public async Task<IActionResult> ExportPayrollTaxCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportPayrollTaxCsvAsync(queryYear, queryMonth, departmentId, cancellationToken);
        var fileName = $"PND1_Tax_Report_{queryYear}_{queryMonth:D2}.csv";

        return ExportFile(csvBytes, fileName, format);
    }

    /// <summary>
    /// ส่งออกรายงานการนำส่งเงินสมทบกองทุนประกันสังคม (สปส. 1-10) เป็นไฟล์ CSV
    /// </summary>
    [HttpGet("financial/sso/export")]
    // ไฟล์ สปส.1-10: การเงิน/ภาษีเงินเดือน และ HR เงินเดือน (ไม่เปิดให้ REPORT_VIEW ทั่วไป)
    [RequirePermission("PAYROLL_TAX_VIEW,PAYROLL_HR_VIEW,PAYROLL_FINANCE_VIEW,PAYROLL_ADMIN_VIEW,PAYROLL_EXPORT")]
    public async Task<IActionResult> ExportSsoCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportSsoCsvAsync(queryYear, queryMonth, departmentId, cancellationToken);
        var fileName = $"SSO_Report_1_10_{queryYear}_{queryMonth:D2}.csv";

        return ExportFile(csvBytes, fileName, format);
    }

    /// <summary>
    /// ดึงรายงานอัตราการเข้า-ออกของพนักงาน (Monthly Turnover Rate)
    /// </summary>
    [HttpGet("analytics/turnover")]
    [RequirePermission("REPORT_HEADCOUNT_VIEW,REPORT_VIEW")]
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
    [RequirePermission("REPORT_HEADCOUNT_VIEW,REPORT_VIEW")]
    public async Task<IActionResult> ExportMonthlyTurnoverCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        var now = DateTime.Today;
        int queryYear = year ?? now.Year;
        int queryMonth = month ?? now.Month;

        var csvBytes = await _reportService.ExportMonthlyTurnoverCsvAsync(queryYear, queryMonth, divisionId, departmentId, cancellationToken);
        var fileName = $"Turnover_Report_{queryYear}_{queryMonth:D2}.csv";

        return ExportFile(csvBytes, fileName, format);
    }

    /// <summary>รายงานพนักงานแยกตามแผนก</summary>
    [HttpGet("employees/by-department")]
    [RequirePermission("REPORT_HEADCOUNT_VIEW,REPORT_VIEW")]
    public async Task<IActionResult> GetEmployeesByDepartment(
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetEmployeesByDepartmentAsync(divisionId, departmentId, cancellationToken);
        return Ok(ApiResponse<EmployeesByDepartmentReportDto>.Ok(result, "ดึงรายงานพนักงานแยกตามแผนกสำเร็จ"));
    }

    [HttpGet("employees/by-department/export")]
    [RequirePermission("REPORT_HEADCOUNT_VIEW,REPORT_VIEW")]
    public async Task<IActionResult> ExportEmployeesByDepartment(
        [FromQuery] long? divisionId,
        [FromQuery] long? departmentId,
        [FromQuery] string? format,
        CancellationToken cancellationToken)
    {
        var csvBytes = await _reportService.ExportEmployeesByDepartmentCsvAsync(divisionId, departmentId, cancellationToken);
        return ExportFile(csvBytes, $"Employees_By_Department_{DateTime.Today:yyyyMMdd}.csv", format);
    }

    /// <summary>ส่งไฟล์รายงานตามรูปแบบที่ขอ: csv (ค่าเริ่มต้น) หรือ xlsx</summary>
    private IActionResult ExportFile(byte[] csvBytes, string csvFileName, string? format)
    {
        if (string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase))
        {
            var baseName = Path.GetFileNameWithoutExtension(csvFileName);
            return File(ReportFileConverter.CsvToXlsx(csvBytes, "รายงาน"), ReportFileConverter.XlsxContentType, $"{baseName}.xlsx");
        }
        return File(csvBytes, "text/csv; charset=utf-8", csvFileName);
    }
}
