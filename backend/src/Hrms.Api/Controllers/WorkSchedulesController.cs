using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Schedule.Dtos;
using Hrms.Application.Features.Schedule.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการตารางการทำงานหลัก (Work Schedules)
/// สำหรับ Developer 1: Sprint 4
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class WorkSchedulesController : ControllerBase
{
    private readonly IWorkScheduleService _service;

    public WorkSchedulesController(IWorkScheduleService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetSchedules([FromQuery] string? status)
    {
        var result = await _service.GetAllWorkSchedulesAsync(status);
        return Ok(ApiResponse<List<WorkScheduleDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSchedule(long id)
    {
        var result = await _service.GetWorkScheduleByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<WorkScheduleDto?>.Fail("ไม่พบข้อมูลตารางการทำงาน"));
        }
        return Ok(ApiResponse<WorkScheduleDto>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateWorkScheduleRequest request)
    {
        try
        {
            var result = await _service.CreateWorkScheduleAsync(request);
            return StatusCode(201, ApiResponse<WorkScheduleDto>.Ok(result, "เพิ่มตารางการทำงานสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<WorkScheduleDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<WorkScheduleDto?>.Fail(ex.Message));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSchedule(long id, [FromBody] UpdateWorkScheduleRequest request)
    {
        try
        {
            var result = await _service.UpdateWorkScheduleAsync(id, request);
            return Ok(ApiResponse<WorkScheduleDto>.Ok(result, "แก้ไขตารางการทำงานสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<WorkScheduleDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<WorkScheduleDto?>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSchedule(long id)
    {
        var success = await _service.DeleteWorkScheduleAsync(id);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail("ไม่พบข้อมูลตารางการทำงานที่ต้องการลบ"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบตารางการทำงานสำเร็จ"));
    }
}
