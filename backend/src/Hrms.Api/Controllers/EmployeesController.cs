using Hrms.Application.Common.Models;
using Hrms.Application.Features.Employees.DTOs;
using Hrms.Application.Features.Employees.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการข้อมูลพนักงาน (Employee Core & PDPA Security)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    /// <summary>
    /// ดึงรายชื่อพนักงานทั้งหมด (กรองตามสิทธิ์ Data Scope และคำค้นหา)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<List<EmployeeDto>>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.GetAllAsync(search, cancellationToken);
        return Ok(ApiResponse<List<EmployeeDto>>.Ok(result, "ดึงข้อมูลรายชื่อพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลพนักงานตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result, "ดึงข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// เพิ่มข้อมูลพนักงานใหม่ (เข้ารหัสข้อมูลบัตรประชาชนและประกันสังคมตาม PDPA)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Create(
        [FromBody] CreateEmployeeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<EmployeeDto>.Ok(result, "บันทึกข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลพนักงาน
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Update(
        long id,
        [FromBody] UpdateEmployeeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result, "อัปเดตข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ลบข้อมูลพนักงาน
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        await _employeeService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบข้อมูลพนักงานสำเร็จ"));
    }
}
