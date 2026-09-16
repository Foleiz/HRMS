using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Application.Features.Attendance.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการและตรวจบันทึกเวลาเข้า-ออกงานประจำวัน (Daily Attendance)
/// สำหรับ Developer 1: Sprint 5
/// </summary>
[ApiController]
[Route("api/attendance/daily")]
public class AttendanceDailyController : ControllerBase
{
    private readonly IAttendanceDailyService _service;

    public AttendanceDailyController(IAttendanceDailyService service)
    {
        _service = service;
    }

    /// <summary>
    /// ดึงรายการบันทึกเวลาประจำวัน พร้อมระบบกรอง ค้นหา และแบ่งหน้า
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDailyAttendance(
        [FromQuery] DailyAttendanceFilterQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetDailyAttendanceAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedAttendanceResult>.Ok(result));
    }

    /// <summary>
    /// ดึงสรุปสถิติการเข้างานประจำวัน (ตรงเวลา, สาย, ออกก่อน, ขาดงาน)
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetDailySummary(
        [FromQuery] string? date,
        CancellationToken cancellationToken)
    {
        DateOnly queryDate;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
        {
            queryDate = d;
        }
        else
        {
            queryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        }

        var result = await _service.GetDailySummaryAsync(queryDate, cancellationToken);
        return Ok(ApiResponse<DailyAttendanceSummaryDto>.Ok(result));
    }

    /// <summary>
    /// ลงเวลาเข้างาน (Clock In)
    /// </summary>
    [HttpPost("clock-in")]
    public async Task<IActionResult> ClockIn(
        [FromBody] ClockInRequest request,
        CancellationToken cancellationToken)
    {
        if (request.EmployeeId <= 0)
            return BadRequest(ApiResponse<AttendanceDailyDto>.Fail("กรุณาระบุรหัสพนักงาน (EmployeeId)"));

        var result = await _service.ClockInAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceDailyDto>.Ok(result, "ลงเวลาเข้างานเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ลงเวลาออกงาน (Clock Out)
    /// </summary>
    [HttpPost("clock-out")]
    public async Task<IActionResult> ClockOut(
        [FromBody] ClockOutRequest request,
        CancellationToken cancellationToken)
    {
        if (request.EmployeeId <= 0)
            return BadRequest(ApiResponse<AttendanceDailyDto>.Fail("กรุณาระบุรหัสพนักงาน (EmployeeId)"));

        var result = await _service.ClockOutAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceDailyDto>.Ok(result, "ลงเวลาออกงานเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// สั่งคำนวณเวลาและจัดเตรียมบันทึกเวลาประจำวันอัตโนมัติ
    /// </summary>
    [HttpPost("recalculate")]
    public async Task<IActionResult> RecalculateDaily(
        [FromQuery] string? date,
        CancellationToken cancellationToken)
    {
        DateOnly queryDate;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
        {
            queryDate = d;
        }
        else
        {
            queryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        }

        var count = await _service.CalculateDailyAttendanceForDateAsync(queryDate, cancellationToken);
        return Ok(ApiResponse<int>.Ok(count, $"ประมวลผลเวลาประจำวัน {queryDate:yyyy-MM-dd} เรียบร้อยแล้ว ({count} รายการใหม่)"));
    }

    /// <summary>
    /// ฝ่ายบุคคลแก้ไขข้อมูลบันทึกเวลาเข้า-ออกงาน
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAttendance(
        long id,
        [FromBody] UpdateAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpdateAttendanceAsync(id, request, cancellationToken);
            return Ok(ApiResponse<AttendanceDailyDto>.Ok(result, "บันทึกการแก้ไขเวลาเรียบร้อยแล้ว"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<AttendanceDailyDto>.Fail(ex.Message));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ESS (Employee Self-Service) Endpoints
    // ข้อมูลถูก scope โดย EmployeeId จาก JWT Token อัตโนมัติ
    // ─────────────────────────────────────────────────────────────

    /// <summary>
    /// [ESS] ดูบันทึกเวลาและกะของวันนี้ของตนเอง
    /// </summary>
    [HttpGet("my/today")]
    public async Task<IActionResult> GetMyTodayAttendance(CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<AttendanceDailyDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var result = await _service.GetMyTodayAttendanceAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<AttendanceDailyDto?>.Ok(result, "ดึงข้อมูลบันทึกเวลาวันนี้สำเร็จ"));
    }

    /// <summary>
    /// [ESS] ดูประวัติบันทึกเวลารายเดือนของตนเอง
    /// </summary>
    [HttpGet("my/history")]
    public async Task<IActionResult> GetMyAttendanceHistory(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<List<AttendanceDailyDto>>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok"));
        var targetYear = year ?? nowThai.Year;
        var targetMonth = month ?? nowThai.Month;

        var result = await _service.GetMyAttendanceHistoryAsync(employeeId, targetYear, targetMonth, cancellationToken);
        return Ok(ApiResponse<List<AttendanceDailyDto>>.Ok(result));
    }

    /// <summary>
    /// [ESS] ดูสถิติสรุปการเข้างานประจำเดือนของตนเอง
    /// </summary>
    [HttpGet("my/summary")]
    public async Task<IActionResult> GetMyMonthlySummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<MyAttendanceMonthlySummaryDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok"));
        var targetYear = year ?? nowThai.Year;
        var targetMonth = month ?? nowThai.Month;

        var result = await _service.GetMyMonthlySummaryAsync(employeeId, targetYear, targetMonth, cancellationToken);
        return Ok(ApiResponse<MyAttendanceMonthlySummaryDto>.Ok(result));
    }

    /// <summary>
    /// [ESS] บันทึกเวลาเข้างานของตนเอง (ใช้เวลาปัจจุบัน)
    /// </summary>
    [HttpPost("my/clock-in")]
    public async Task<IActionResult> MyClockIn(CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<AttendanceDailyDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var request = new ClockInRequest { EmployeeId = employeeId };
        var result = await _service.ClockInAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceDailyDto>.Ok(result, "บันทึกเวลาเข้างานเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// [ESS] บันทึกเวลาออกงานของตนเอง (ใช้เวลาปัจจุบัน)
    /// </summary>
    [HttpPost("my/clock-out")]
    public async Task<IActionResult> MyClockOut(CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId <= 0)
            return Unauthorized(ApiResponse<AttendanceDailyDto>.Fail("ไม่สามารถระบุตัวตนผู้ใช้งานได้"));

        var request = new ClockOutRequest { EmployeeId = employeeId };
        var result = await _service.ClockOutAsync(request, cancellationToken);
        return Ok(ApiResponse<AttendanceDailyDto>.Ok(result, "บันทึกเวลาออกงานเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ดึงรายงานสรุปเวลาทำงานรายเดือนของพนักงานทั้งหมด (Monthly Attendance Summary)
    /// </summary>
    [HttpGet("monthly-summary")]
    public async Task<IActionResult> GetMonthlyAttendanceSummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, AttendanceDailyService.ThaiZone);
        var targetYear = year ?? nowThai.Year;
        var targetMonth = month ?? nowThai.Month;

        var result = await _service.GetMonthlyAttendanceSummaryAsync(targetYear, targetMonth, departmentId, cancellationToken);
        return Ok(ApiResponse<MonthlyAttendanceOverviewDto>.Ok(result));
    }

    /// <summary>
    /// ประมวลผลและบันทึกสรุปยอดเวลาทำงานรายเดือน (Process & Lock Monthly Summary for Payroll)
    /// </summary>
    [HttpPost("monthly-summary/process")]
    public async Task<IActionResult> ProcessMonthlyAttendanceSummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, AttendanceDailyService.ThaiZone);
        var targetYear = year ?? nowThai.Year;
        var targetMonth = month ?? nowThai.Month;

        var result = await _service.ProcessMonthlyAttendanceSummaryAsync(targetYear, targetMonth, cancellationToken);
        return Ok(ApiResponse<MonthlyAttendanceOverviewDto>.Ok(result, "ประมวลผลสรุปสถิติเวลาทำงานรายเดือนสำเร็จ"));
    }

    /// <summary>
    /// ส่งออกรายงานสรุปเวลาทำงานรายเดือนเป็นไฟล์ CSV (UTF-8 with BOM)
    /// </summary>
    [HttpGet("monthly-summary/export")]
    public async Task<IActionResult> ExportMonthlyAttendanceCsv(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, AttendanceDailyService.ThaiZone);
        var targetYear = year ?? nowThai.Year;
        var targetMonth = month ?? nowThai.Month;

        var csvBytes = await _service.ExportMonthlyAttendanceCsvAsync(targetYear, targetMonth, departmentId, cancellationToken);
        var fileName = $"monthly_attendance_summary_{targetYear}_{targetMonth:D2}.csv";
        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    // ─── Helper: ดึง EmployeeId จาก JWT Claims ─────────────────
    private long GetCurrentEmployeeId()
    {
        // Claim ที่ JwtTokenService ออกให้จริงคือ "employee_id" (ไม่ใช่ "EmployeeId")
        // และตั้งแต่ .NET 8 เป็นต้นไป ASP.NET Core ไม่ map "sub" -> ClaimTypes.NameIdentifier ให้อัตโนมัติแล้ว (MapInboundClaims default = false)
        // จึงต้องเช็ค "employee_id" เป็นหลักก่อน แล้วค่อย fallback ไปที่ค่าอื่นเผื่อ token รูปแบบเก่า
        var claim = User.FindFirst("employee_id") ?? User.FindFirst("EmployeeId") ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim != null && long.TryParse(claim.Value, out var id))
            return id;
        return 0;
    }
}

