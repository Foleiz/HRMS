using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.WorkCalendar.Dtos;
using Hrms.Application.Features.WorkCalendar.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการวันทำงานประจำสัปดาห์ (Work Week) และวันหยุดประจำปี (Company Holidays)
/// สำหรับ Developer 1: Sprint 2
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class WorkCalendarController : ControllerBase
{
    private readonly IWorkCalendarService _workCalendarService;

    public WorkCalendarController(IWorkCalendarService workCalendarService)
    {
        _workCalendarService = workCalendarService;
    }

    #region Work Week
    [HttpGet("work-week")]
    public async Task<IActionResult> GetWorkWeek([FromQuery] long? companyId)
    {
        var result = await _workCalendarService.GetWorkWeekAsync(companyId);
        return Ok(ApiResponse<List<WorkWeekDto>>.Ok(result));
    }

    [HttpPut("work-week")]
    public async Task<IActionResult> UpdateWorkWeek([FromBody] UpdateWorkWeekRequest request, [FromQuery] long? companyId)
    {
        var result = await _workCalendarService.UpdateWorkWeekAsync(request, companyId);
        return Ok(ApiResponse<List<WorkWeekDto>>.Ok(result, "บันทึกการตั้งค่าวันทำงานสำเร็จ"));
    }
    #endregion

    #region Holidays
    [HttpGet("holidays")]
    public async Task<IActionResult> GetHolidays([FromQuery] int? year, [FromQuery] long? companyId)
    {
        var list = await _workCalendarService.GetHolidaysAsync(year, companyId);
        return Ok(ApiResponse<List<HolidayDto>>.Ok(list));
    }

    [HttpGet("holidays/{id}")]
    public async Task<IActionResult> GetHoliday(long id)
    {
        var result = await _workCalendarService.GetHolidayByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<HolidayDto?>.Fail("ไม่พบข้อมูลวันหยุด"));
        }
        return Ok(ApiResponse<HolidayDto>.Ok(result));
    }

    [HttpPost("holidays")]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
    {
        try
        {
            var result = await _workCalendarService.CreateHolidayAsync(request);
            return StatusCode(201, ApiResponse<HolidayDto>.Ok(result, "เพิ่มวันหยุดสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<HolidayDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<HolidayDto?>.Fail(ex.Message));
        }
    }

    [HttpPut("holidays/{id}")]
    public async Task<IActionResult> UpdateHoliday(long id, [FromBody] UpdateHolidayRequest request)
    {
        try
        {
            var result = await _workCalendarService.UpdateHolidayAsync(id, request);
            return Ok(ApiResponse<HolidayDto>.Ok(result, "แก้ไขข้อมูลวันหยุดสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<HolidayDto?>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<HolidayDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<HolidayDto?>.Fail(ex.Message));
        }
    }

    [HttpDelete("holidays/{id}")]
    public async Task<IActionResult> DeleteHoliday(long id)
    {
        var success = await _workCalendarService.DeleteHolidayAsync(id);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail("ไม่พบข้อมูลวันหยุดที่ต้องการลบ"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบข้อมูลวันหยุดสำเร็จ"));
    }
    #endregion
}
