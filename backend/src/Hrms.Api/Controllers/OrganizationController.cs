using Hrms.Application.Common.Models;
using Hrms.Application.Features.Organization.Dtos;
using Hrms.Application.Features.Organization.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับจัดการโครงสร้างองค์กร (Company, Division, Department, Position, Level)
/// สำหรับ Developer 1: Sprint 1
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OrganizationController : ControllerBase
{
    private readonly IOrganizationService _orgService;

    public OrganizationController(IOrganizationService orgService)
    {
        _orgService = orgService;
    }

    #region Summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var result = await _orgService.GetSummaryAsync(cancellationToken);
        return Ok(ApiResponse<OrganizationSummaryDto>.Ok(result));
    }
    #endregion

    #region Company
    [HttpGet("company")]
    public async Task<IActionResult> GetCompany(CancellationToken cancellationToken)
    {
        var result = await _orgService.GetCompanyProfileAsync(cancellationToken);
        return Ok(ApiResponse<CompanyDto?>.Ok(result));
    }

    [HttpPut("company")]
    public async Task<IActionResult> UpdateCompany([FromBody] UpdateCompanyDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.UpdateCompanyProfileAsync(request, cancellationToken);
        return Ok(ApiResponse<CompanyDto>.Ok(result, "บันทึกข้อมูลบริษัทสำเร็จ"));
    }
    #endregion

    #region Divisions
    [HttpGet("divisions")]
    public async Task<IActionResult> GetDivisions(CancellationToken cancellationToken)
    {
        var list = await _orgService.GetAllDivisionsAsync(cancellationToken);
        return Ok(ApiResponse<List<DivisionDto>>.Ok(list));
    }

    [HttpGet("divisions/{id}")]
    public async Task<IActionResult> GetDivision(long id, CancellationToken cancellationToken)
    {
        var result = await _orgService.GetDivisionByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DivisionDto>.Ok(result));
    }

    [HttpPost("divisions")]
    public async Task<IActionResult> CreateDivision([FromBody] CreateDivisionDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.CreateDivisionAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<DivisionDto>.Ok(result, "เพิ่มข้อมูลฝ่ายสำเร็จ"));
    }

    [HttpPut("divisions/{id}")]
    public async Task<IActionResult> UpdateDivision(long id, [FromBody] UpdateDivisionDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.UpdateDivisionAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DivisionDto>.Ok(result, "แก้ไขข้อมูลฝ่ายสำเร็จ"));
    }

    [HttpDelete("divisions/{id}")]
    public async Task<IActionResult> DeleteDivision(long id, CancellationToken cancellationToken)
    {
        await _orgService.DeleteDivisionAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "ลบข้อมูลฝ่ายสำเร็จ"));
    }
    #endregion

    #region Departments
    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments([FromQuery] long? divisionId, CancellationToken cancellationToken)
    {
        var list = await _orgService.GetAllDepartmentsAsync(divisionId, cancellationToken);
        return Ok(ApiResponse<List<DepartmentDto>>.Ok(list));
    }

    [HttpGet("departments/{id}")]
    public async Task<IActionResult> GetDepartment(long id, CancellationToken cancellationToken)
    {
        var result = await _orgService.GetDepartmentByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DepartmentDto>.Ok(result));
    }

    [HttpPost("departments")]
    public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.CreateDepartmentAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<DepartmentDto>.Ok(result, "เพิ่มข้อมูลแผนกสำเร็จ"));
    }

    [HttpPut("departments/{id}")]
    public async Task<IActionResult> UpdateDepartment(long id, [FromBody] UpdateDepartmentDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.UpdateDepartmentAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DepartmentDto>.Ok(result, "แก้ไขข้อมูลแผนกสำเร็จ"));
    }

    [HttpDelete("departments/{id}")]
    public async Task<IActionResult> DeleteDepartment(long id, CancellationToken cancellationToken)
    {
        await _orgService.DeleteDepartmentAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "ลบข้อมูลแผนกสำเร็จ"));
    }
    #endregion

    #region Positions
    [HttpGet("positions")]
    public async Task<IActionResult> GetPositions([FromQuery] long? departmentId, CancellationToken cancellationToken)
    {
        var list = await _orgService.GetAllPositionsAsync(departmentId, cancellationToken);
        return Ok(ApiResponse<List<PositionDto>>.Ok(list));
    }

    [HttpGet("positions/{id}")]
    public async Task<IActionResult> GetPosition(long id, CancellationToken cancellationToken)
    {
        var result = await _orgService.GetPositionByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<PositionDto>.Ok(result));
    }

    [HttpPost("positions")]
    public async Task<IActionResult> CreatePosition([FromBody] CreatePositionDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.CreatePositionAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<PositionDto>.Ok(result, "เพิ่มข้อมูลตำแหน่งสำเร็จ"));
    }

    [HttpPut("positions/{id}")]
    public async Task<IActionResult> UpdatePosition(long id, [FromBody] UpdatePositionDto request, CancellationToken cancellationToken)
    {
        var result = await _orgService.UpdatePositionAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PositionDto>.Ok(result, "แก้ไขข้อมูลตำแหน่งสำเร็จ"));
    }

    [HttpDelete("positions/{id}")]
    public async Task<IActionResult> DeletePosition(long id, CancellationToken cancellationToken)
    {
        await _orgService.DeletePositionAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "ลบข้อมูลตำแหน่งสำเร็จ"));
    }
    #endregion

    #region Employee Levels
    [HttpGet("levels")]
    public async Task<IActionResult> GetLevels(CancellationToken cancellationToken)
    {
        var list = await _orgService.GetAllEmployeeLevelsAsync(cancellationToken);
        return Ok(ApiResponse<List<EmployeeLevelDto>>.Ok(list));
    }
    #endregion
}
