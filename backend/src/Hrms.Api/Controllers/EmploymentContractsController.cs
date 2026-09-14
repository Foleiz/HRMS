using Hrms.Application.Common.Models;
using Hrms.Application.Features.Contracts.DTOs;
using Hrms.Application.Features.Contracts.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการสัญญาจ้างงานและวงจรชีวิตพนักงาน
/// </summary>
[ApiController]
[Route("api/employment-contracts")]
[Authorize]
public class EmploymentContractsController : ControllerBase
{
    private readonly IEmploymentContractService _contractService;

    public EmploymentContractsController(IEmploymentContractService contractService)
    {
        _contractService = contractService;
    }

    /// <summary>
    /// ดึงรายการสัญญาจ้างงานทั้งหมด (พร้อมตัวกรองคำค้นหา, ประเภทสัญญา, สถานะ)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EmploymentContractDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmploymentContractDto>>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? contractType,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.GetAllAsync(search, contractType, status, cancellationToken);
        return Ok(ApiResponse<List<EmploymentContractDto>>.Ok(result, "ดึงรายการสัญญาจ้างงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลสถิติสรุป KPI ของสัญญาจ้างงาน (ทดลองงาน, ประจำ, ใกล้ครบทดลองงาน 7 วัน)
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<ContractSummaryStatsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<ContractSummaryStatsDto>>> GetStats(CancellationToken cancellationToken)
    {
        var stats = await _contractService.GetStatsAsync(cancellationToken);
        return Ok(ApiResponse<ContractSummaryStatsDto>.Ok(stats, "ดึงข้อมูลสถิติสัญญาจ้างงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายละเอียดสัญญาจ้างงานตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmploymentContractDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmploymentContractDto>>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmploymentContractDto>.Ok(result, "ดึงรายละเอียดสัญญาจ้างงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงประวัติสัญญาจ้างงานของพนักงานตาม Employee ID
    /// </summary>
    [HttpGet("/api/employees/{employeeId:long}/contracts")]
    [ProducesResponseType(typeof(ApiResponse<List<EmploymentContractDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmploymentContractDto>>>> GetByEmployeeId(
        long employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.GetByEmployeeIdAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<List<EmploymentContractDto>>.Ok(result, "ดึงประวัติสัญญาจ้างงานพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงไทม์ไลน์ตำแหน่งงานและประวัติการโอนย้าย/เลื่อนขั้นรายบุคคลตาม Employee ID
    /// </summary>
    [HttpGet("/api/employees/{employeeId:long}/career-timeline")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeCareerTimelineDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeCareerTimelineDto>>>> GetCareerTimeline(
        long employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.GetTimelineByEmployeeIdAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<List<EmployeeCareerTimelineDto>>.Ok(result, "ดึงไทม์ไลน์ตำแหน่งงานสำเร็จ"));
    }

    /// <summary>
    /// สร้างสัญญาจ้างงานใหม่
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<EmploymentContractDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<EmploymentContractDto>>> Create(
        [FromBody] CreateEmploymentContractRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            ApiResponse<EmploymentContractDto>.Ok(result, "สร้างสัญญาจ้างงานสำเร็จ"));
    }

    /// <summary>
    /// อัปเดตรายละเอียดสัญญาจ้างงาน
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmploymentContractDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmploymentContractDto>>> Update(
        long id,
        [FromBody] UpdateEmploymentContractRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EmploymentContractDto>.Ok(result, "อัปเดตสัญญาจ้างงานสำเร็จ"));
    }

    /// <summary>
    /// บันทึกสิ้นสุด/บอกเลิกสัญญาจ้างงาน
    /// </summary>
    [HttpPut("{id:long}/terminate")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Terminate(
        long id,
        [FromBody] TerminateContractRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.TerminateAsync(
            id,
            request?.Reason,
            request?.TerminationDate,
            cancellationToken);
        return Ok(ApiResponse<bool>.Ok(result, "บันทึกสิ้นสุดสัญญาจ้างงานสำเร็จ"));
    }

    /// <summary>
    /// ลบสัญญาจ้างงาน
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _contractService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(result, "ลบสัญญาจ้างงานสำเร็จ"));
    }
}

public class TerminateContractRequest
{
    public string? Reason { get; set; }
    public DateOnly? TerminationDate { get; set; }
}
