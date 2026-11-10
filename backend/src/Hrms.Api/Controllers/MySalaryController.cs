using Hrms.Api.Filters;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Payroll.DTOs;
using Hrms.Application.Features.Payroll.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/my-salary")]
[Authorize]
[RequirePermission("ESS_SALARY_VIEW,PAYROLL_SLIP_VIEW,PAYROLL_VIEW")]
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

    /// <summary>
    /// ตรวจสอบสถานะว่าผู้ใช้งานมีรหัส PIN สำหรับเข้าดูเงินเดือนแล้วหรือไม่
    /// </summary>
    [HttpGet("pin/status")]
    public async Task<ActionResult<ApiResponse<SalaryPinStatusDto>>> GetSalaryPinStatus(
        CancellationToken cancellationToken)
    {
        var result = await _mySalaryService.GetSalaryPinStatusAsync(cancellationToken);
        return Ok(ApiResponse<SalaryPinStatusDto>.Ok(result, "ดึงสถานะรหัส PIN สำเร็จ"));
    }

    /// <summary>
    /// ตั้งรหัส PIN 6 หลักครั้งแรก
    /// </summary>
    [HttpPost("pin/setup")]
    public async Task<ActionResult<ApiResponse<object>>> SetupSalaryPin(
        [FromBody] SetupSalaryPinRequest request,
        CancellationToken cancellationToken)
    {
        await _mySalaryService.SetupSalaryPinAsync(request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "ตั้งรหัส PIN สำเร็จ"));
    }

    /// <summary>
    /// ตรวจสอบรหัส PIN 6 หลักเพื่อปลดล็อกเข้าดูข้อมูลเงินเดือน
    /// </summary>
    [HttpPost("pin/verify")]
    public async Task<ActionResult<ApiResponse<object>>> VerifySalaryPin(
        [FromBody] VerifySalaryPinRequest request,
        CancellationToken cancellationToken)
    {
        var verified = await _mySalaryService.VerifySalaryPinAsync(request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { verified }, "ยืนยันรหัส PIN สำเร็จ"));
    }

    /// <summary>
    /// รีเซ็ตรหัส PIN 6 หลักโดยการยืนยันรหัสผ่านปัจจุบัน
    /// </summary>
    [HttpPost("pin/reset")]
    public async Task<ActionResult<ApiResponse<object>>> ResetSalaryPin(
        [FromBody] ResetSalaryPinRequest request,
        CancellationToken cancellationToken)
    {
        await _mySalaryService.ResetSalaryPinAsync(request, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "เปลี่ยนรหัส PIN สำเร็จ"));
    }
}
