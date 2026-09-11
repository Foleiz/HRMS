using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Shift.Dtos;
using Hrms.Application.Features.Shift.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการกะการทำงาน (Work Shifts) และเงื่อนไขกะข้ามวัน / Grace Periods
/// สำหรับ Developer 1: Sprint 3
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ShiftsController : ControllerBase
{
    private readonly IShiftService _shiftService;

    public ShiftsController(IShiftService shiftService)
    {
        _shiftService = shiftService;
    }

    [HttpGet]
    public async Task<IActionResult> GetShifts([FromQuery] string? status)
    {
        var result = await _shiftService.GetAllShiftsAsync(status);
        return Ok(ApiResponse<List<ShiftDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetShift(long id)
    {
        var result = await _shiftService.GetShiftByIdAsync(id);
        if (result == null)
        {
            return NotFound(ApiResponse<ShiftDto?>.Fail("ไม่พบข้อมูลกะการทำงาน"));
        }
        return Ok(ApiResponse<ShiftDto>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> CreateShift([FromBody] CreateShiftRequest request)
    {
        try
        {
            var result = await _shiftService.CreateShiftAsync(request);
            return StatusCode(201, ApiResponse<ShiftDto>.Ok(result, "เพิ่มกะการทำงานสำเร็จ"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ShiftDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ShiftDto?>.Fail(ex.Message));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateShift(long id, [FromBody] UpdateShiftRequest request)
    {
        try
        {
            var result = await _shiftService.UpdateShiftAsync(id, request);
            return Ok(ApiResponse<ShiftDto>.Ok(result, "แก้ไขข้อมูลกะการทำงานสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ShiftDto?>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ShiftDto?>.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ShiftDto?>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteShift(long id)
    {
        var success = await _shiftService.DeleteShiftAsync(id);
        if (!success)
        {
            return NotFound(ApiResponse<bool>.Fail("ไม่พบกะการทำงานที่ต้องการลบ"));
        }
        return Ok(ApiResponse<bool>.Ok(true, "ลบกะการทำงานสำเร็จ"));
    }
}
