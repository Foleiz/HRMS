using System.Globalization;
using System.Text;
using Hrms.Api.Filters;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leave.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// ปฏิทินการลาของทีม / รายงานสรุปการลา / ปิดยอดวันลาสิ้นปี
/// </summary>
[ApiController]
[Authorize]
public class LeaveInsightsController : ControllerBase
{
    private readonly ILeaveInsightsService _insights;
    private readonly ILeaveYearEndService _yearEnd;

    public LeaveInsightsController(ILeaveInsightsService insights, ILeaveYearEndService yearEnd)
    {
        _insights = insights;
        _yearEnd = yearEnd;
    }

    /// <summary>ปฏิทินการลา (from/to = yyyy-MM-dd, สูงสุด ~3 เดือนต่อครั้ง)</summary>
    [HttpGet("api/leave-calendar")]
    [RequirePermission("ESS_LEAVE_VIEW,LEAVE_BALANCE_VIEW")]
    public async Task<ActionResult<ApiResponse<LeaveCalendarResult>>> GetCalendar(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long? departmentId,
        [FromQuery] long? divisionId,
        [FromQuery] bool includePending = false,
        CancellationToken cancellationToken = default)
    {
        var today = LeavePolicyRules.ThaiToday();
        var start = ParseDate(from) ?? new DateOnly(today.Year, today.Month, 1);
        var end = ParseDate(to) ?? start.AddMonths(1).AddDays(-1);
        var result = await _insights.GetCalendarAsync(start, end, departmentId, divisionId, includePending, cancellationToken);
        return Ok(ApiResponse<LeaveCalendarResult>.Ok(result, "ดึงปฏิทินการลาสำเร็จ"));
    }

    /// <summary>รายงานสรุปการลาประจำปี (ฝ่ายบุคคล/ผู้บริหาร)</summary>
    [HttpGet("api/reports/leave-summary")]
    [RequirePermission("REPORT_LEAVE_VIEW")]
    public async Task<ActionResult<ApiResponse<LeaveSummaryReport>>> GetLeaveSummary(
        [FromQuery] int? year,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken = default)
    {
        var result = await _insights.GetSummaryReportAsync(year ?? LeavePolicyRules.ThaiToday().Year, departmentId, cancellationToken);
        return Ok(ApiResponse<LeaveSummaryReport>.Ok(result, "ดึงรายงานการลาสำเร็จ"));
    }

    [HttpGet("api/reports/leave-summary/export")]
    [RequirePermission("REPORT_LEAVE_VIEW")]
    public async Task<IActionResult> ExportLeaveSummary(
        [FromQuery] int? year,
        [FromQuery] long? departmentId,
        [FromQuery] string? format,
        CancellationToken cancellationToken = default)
    {
        var report = await _insights.GetSummaryReportAsync(year ?? LeavePolicyRules.ThaiToday().Year, departmentId, cancellationToken);
        var csv = _insights.BuildSummaryCsv(report);
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray();
        if (string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase))
            return File(Hrms.Application.Common.Utilities.ReportFileConverter.CsvToXlsx(bytes, "รายงานการลา"),
                Hrms.Application.Common.Utilities.ReportFileConverter.XlsxContentType, $"Leave_Summary_{report.Year + 543}.xlsx");
        return File(bytes, "text/csv; charset=utf-8", $"Leave_Summary_{report.Year + 543}.csv");
    }

    /// <summary>ดูตัวอย่างการปิดยอดวันลาสิ้นปี (ฝ่ายบุคคล)</summary>
    [HttpGet("api/leave-balances/year-end/{year:int}/preview")]
    [RequirePermission("LEAVE_BALANCE_VIEW", "ORGANIZATION")]
    public async Task<ActionResult<ApiResponse<LeaveYearEndPreview>>> PreviewYearEnd(int year, CancellationToken cancellationToken = default)
    {
        var result = await _yearEnd.PreviewAsync(year, cancellationToken);
        return Ok(ApiResponse<LeaveYearEndPreview>.Ok(result, "ดึงตัวอย่างการปิดยอดสำเร็จ"));
    }

    /// <summary>ยืนยันปิดยอดวันลาสิ้นปี (ฝ่ายบุคคล) — ทำได้ปีละครั้ง</summary>
    [HttpPost("api/leave-balances/year-end/{year:int}/close")]
    [RequirePermission("LEAVE_BALANCE_EDIT", "ORGANIZATION")]
    public async Task<ActionResult<ApiResponse<LeaveYearEndPreview>>> CloseYearEnd(
        int year,
        [FromBody] LeaveYearEndCloseRequest? request,
        CancellationToken cancellationToken = default)
    {
        var result = await _yearEnd.CloseAsync(year, request?.Note, cancellationToken);
        return Ok(ApiResponse<LeaveYearEndPreview>.Ok(result, $"ปิดยอดวันลาปี {result.Year + 543} สำเร็จ"));
    }

    private static DateOnly? ParseDate(string? s) =>
        !string.IsNullOrWhiteSpace(s) && DateOnly.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
}
