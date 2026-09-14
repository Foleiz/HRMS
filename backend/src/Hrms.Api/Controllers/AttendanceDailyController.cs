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
}
