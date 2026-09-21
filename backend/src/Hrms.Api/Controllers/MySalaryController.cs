using Hrms.Application.Common.Models;
using Hrms.Application.Features.Payroll.DTOs;
using Hrms.Application.Features.Payroll.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/my-salary")]
[Authorize]
public class MySalaryController : ControllerBase
{
    private readonly IMySalaryService _mySalaryService;
    private readonly IPayslipService _payslipService;

    public MySalaryController(IMySalaryService mySalaryService, IPayslipService payslipService)
    {
        _mySalaryService = mySalaryService;
        _payslipService = payslipService;
    }

    /// <summary>
    /// ดึงภาพรวมเงินเดือนและประวัติสลิปของพนักงานที่ล็อกอินอยู่ (ESS My Salary Overview)
    /// </summary>
    [HttpGet("overview")]
    public async Task<ActionResult<ApiResponse<MySalaryOverviewDto>>> GetMySalaryOverview(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await _mySalaryService.GetMySalaryOverviewAsync(year, cancellationToken);
        return Ok(ApiResponse<MySalaryOverviewDto>.Ok(result, "ดึงข้อมูลภาพรวมเงินเดือนสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายละเอียดแจกแจงรายได้-รายหักของสลิปเงินเดือนรายงวด (ESS My Salary Slip Detail)
    /// </summary>
    [HttpGet("slips/{payrollId}")]
    public async Task<ActionResult<ApiResponse<MySalaryDetailDto>>> GetMySalaryDetail(
        [FromRoute] long payrollId,
        CancellationToken cancellationToken)
    {
        var result = await _mySalaryService.GetMySalaryDetailAsync(payrollId, cancellationToken);
        return Ok(ApiResponse<MySalaryDetailDto>.Ok(result, "ดึงรายละเอียดสลิปเงินเดือนสำเร็จ"));
    }

    /// <summary>
    /// ดาวน์โหลดสลิปเงินเดือน E-Payslip PDF (พร้อมเข้ารหัสผ่าน) ของตนเอง
    /// </summary>
    [HttpGet("slips/{payrollId}/download")]
    public async Task<IActionResult> DownloadMyPayslip(
        [FromRoute] long payrollId,
        CancellationToken cancellationToken)
    {
        var (fileBytes, fileName) = await _payslipService.GetMyPayslipPdfAsync(payrollId, cancellationToken);
        return File(fileBytes, "application/pdf", fileName);
    }
}
