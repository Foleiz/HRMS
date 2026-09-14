using Hrms.Application.Common.Models;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Application.Features.MasterData.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/employee-types")]
[Authorize]
public class EmployeeTypesController : ControllerBase
{
    private readonly IEmployeeTypeService _employeeTypeService;

    public EmployeeTypesController(IEmployeeTypeService employeeTypeService)
    {
        _employeeTypeService = employeeTypeService;
    }

    /// <summary>
    /// ดึงรายการประเภทพนักงาน / สัญญาจ้างทั้งหมด พร้อมฟิลเตอร์ค้นหา
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeTypeDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeTypeDto>>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _employeeTypeService.GetAllAsync(search, status, cancellationToken);
        return Ok(ApiResponse<List<EmployeeTypeDto>>.Ok(result));
    }

    /// <summary>
    /// สรุปสถิติประเภทสัญญาจ้าง / การจ้างงานสำหรับแสดงบน KPI Cards
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTypeStatsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<EmployeeTypeStatsDto>>> GetStats(CancellationToken cancellationToken)
    {
        var result = await _employeeTypeService.GetStatsAsync(cancellationToken);
        return Ok(ApiResponse<EmployeeTypeStatsDto>.Ok(result));
    }

    /// <summary>
    /// ดึงรายละเอียดประเภทพนักงาน / สัญญาจ้างตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTypeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeTypeDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _employeeTypeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeTypeDto>.Ok(result));
    }

    /// <summary>
    /// สร้างประเภทพนักงาน / สัญญาจ้างใหม่
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTypeDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<EmployeeTypeDto>>> Create(
        [FromBody] CreateEmployeeTypeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeTypeService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<EmployeeTypeDto>.Ok(result, "สร้างประเภทสัญญาจ้างสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลประเภทพนักงาน / สัญญาจ้าง
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeTypeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeTypeDto>>> Update(
        long id,
        [FromBody] UpdateEmployeeTypeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeTypeService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EmployeeTypeDto>.Ok(result, "อัปเดตประเภทสัญญาจ้างสำเร็จ"));
    }

    /// <summary>
    /// ลบหรือปิดการใช้งานประเภทพนักงาน / สัญญาจ้าง
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _employeeTypeService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบหรือปิดการใช้งานประเภทสัญญาจ้างสำเร็จ"));
    }
}
