using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Schedule.Dtos;
using Hrms.Application.Features.Schedule.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการการมอบหมายกะการทำงานให้พนักงาน (Employee Shift Assignments)
/// และตารางกะรายเดือน (Monthly Roster)
/// สำหรับ Developer 1: Sprint 4
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class EmployeeShiftsController : ControllerBase
{
    private readonly IEmployeeShiftService _service;

    public EmployeeShiftsController(IEmployeeShiftService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAssignments(
        [FromQuery] long? departmentId, 
        [FromQuery] string? search, 
        [FromQuery] string? date)
    {
        DateOnly? parsedDate = null;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
        {
            parsedDate = d;
        }

        var result = await _service.GetAllAssignmentsAsync(departmentId, search, parsedDate);
        return Ok(ApiResponse<List<EmployeeShiftDto>>.Ok(result));
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<IActionResult> GetAssignmentsByEmployee(long employeeId)
    {
        var result = await _service.GetAssignmentsByEmployeeAsync(employeeId);
        return Ok(ApiResponse<List<EmployeeShiftDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssignment(long id)
    {
        var result = await _service.GetAssignmentByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<EmployeeShiftDto?>.Fail("ไม่พบข้อมูลการมอบหมายกะ"));
        }
        return Ok(ApiResponse<EmployeeShiftDto>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> AssignShift([FromBody] AssignEmployeeShiftRequest request)
    {
        try
        {
            var result = await _service.AssignShiftAsync(request);
            return StatusCode(201, ApiResponse<EmployeeShiftDto>.Ok(result, "มอบหมายกะการทำงานสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<EmployeeShiftDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EmployeeShiftDto?>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<EmployeeShiftDto?>.Fail(ex.Message));
        }
    }

    [HttpPost("batch")]
    public async Task<IActionResult> BatchAssignShift([FromBody] BatchAssignEmployeeShiftRequest request)
    {
        try
        {
            var result = await _service.BatchAssignShiftAsync(request);
            var message = $"มอบหมายกะสำเร็จ {result.SuccessCount} รายการ (ไม่สำเร็จ {result.FailedCount} รายการ)";
            return Ok(ApiResponse<BatchAssignResultDto>.Ok(result, message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BatchAssignResultDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<BatchAssignResultDto?>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<BatchAssignResultDto?>.Fail(ex.Message));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAssignment(long id, [FromBody] UpdateEmployeeShiftRequest request)
    {
        try
        {
            var result = await _service.UpdateAssignmentAsync(id, request);
            return Ok(ApiResponse<EmployeeShiftDto>.Ok(result, "แก้ไขการมอบหมายกะสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<EmployeeShiftDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<EmployeeShiftDto?>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<EmployeeShiftDto?>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAssignment(long id)
    {
        var success = await _service.DeleteAssignmentAsync(id);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail("ไม่พบข้อมูลการมอบหมายกะที่ต้องการลบ"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบการมอบหมายกะสำเร็จ"));
    }

    [HttpGet("roster")]
    public async Task<IActionResult> GetMonthlyRoster(
        [FromQuery] int? year, 
        [FromQuery] int? month, 
        [FromQuery] long? departmentId, 
        [FromQuery] string? search)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.Month;

        try
        {
            var result = await _service.GetMonthlyRosterAsync(targetYear, targetMonth, departmentId, search);
            return Ok(ApiResponse<MonthlyRosterResponse>.Ok(result));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<MonthlyRosterResponse?>.Fail(ex.Message));
        }
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetAssignableEmployees([FromQuery] long? departmentId)
    {
        var result = await _service.GetAssignableEmployeesAsync(departmentId);
        return Ok(ApiResponse<List<AssignableEmployeeDto>>.Ok(result));
    }
}
