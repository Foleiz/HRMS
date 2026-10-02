using Hrms.Api.Filters;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Application.Features.MasterData.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/benefits")]
[Authorize]
public class BenefitsController : ControllerBase
{
    private readonly IBenefitService _benefitService;

    public BenefitsController(IBenefitService benefitService)
    {
        _benefitService = benefitService;
    }

    /// <summary>
    /// ดึงรายการสิทธิประโยชน์และสวัสดิการขององค์กรทั้งหมด
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<BenefitItemDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<BenefitItemDto>>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.GetAllAsync(category, status, cancellationToken);
        return Ok(ApiResponse<List<BenefitItemDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงรายละเอียดสิทธิประโยชน์ตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<BenefitItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<BenefitItemDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _benefitService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<BenefitItemDto>.Ok(result));
    }

    /// <summary>
    /// สร้างสิทธิประโยชน์/สวัสดิการขององค์กรใหม่
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<BenefitItemDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [RequirePermission("ORG_BENEFIT_CREATE")]
    public async Task<ActionResult<ApiResponse<BenefitItemDto>>> Create(
        [FromBody] CreateBenefitItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<BenefitItemDto>.Ok(result, "สร้างสิทธิประโยชน์/สวัสดิการใหม่สำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลสิทธิประโยชน์/สวัสดิการ
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<BenefitItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [RequirePermission("ORG_BENEFIT_EDIT")]
    public async Task<ActionResult<ApiResponse<BenefitItemDto>>> Update(
        long id,
        [FromBody] UpdateBenefitItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<BenefitItemDto>.Ok(result, "แก้ไขสิทธิประโยชน์/สวัสดิการสำเร็จ"));
    }

    /// <summary>
    /// ลบสิทธิประโยชน์/สวัสดิการออกจากระบบ
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [RequirePermission("ORG_BENEFIT_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _benefitService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบสิทธิประโยชน์สำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลสรุปโควตาและการใช้สิทธิ์สวัสดิการรายบุคคลของพนักงาน
    /// </summary>
    [HttpGet("usage/{employeeId:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeBenefitUsageSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeBenefitUsageSummaryDto>>> GetUsageSummary(
        long employeeId,
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.GetEmployeeUsageSummaryAsync(employeeId, year, cancellationToken);
        return Ok(ApiResponse<EmployeeBenefitUsageSummaryDto>.Ok(result));
    }

    /// <summary>
    /// ดึงประวัติรายการเบิกจ่าย/ใช้สิทธิ์สวัสดิการของพนักงาน
    /// </summary>
    [HttpGet("claims/{employeeId:long}")]
    [ProducesResponseType(typeof(ApiResponse<List<BenefitClaimDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<BenefitClaimDto>>>> GetClaims(
        long employeeId,
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.GetEmployeeClaimsAsync(employeeId, year, cancellationToken);
        return Ok(ApiResponse<List<BenefitClaimDto>>.Ok(result));
    }

    /// <summary>
    /// บันทึกการขอเบิก/ใช้สิทธิ์สวัสดิการของพนักงาน
    /// </summary>
    [HttpPost("claims")]
    [ProducesResponseType(typeof(ApiResponse<BenefitClaimDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<BenefitClaimDto>>> CreateClaim(
        [FromBody] CreateBenefitClaimRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.CreateClaimAsync(request, null, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<BenefitClaimDto>.Ok(result, "บันทึกการใช้สิทธิ์สวัสดิการสำเร็จ"));
    }

    /// <summary>
    /// ยกเลิก/ลบรายการเบิกสวัสดิการ
    /// </summary>
    [HttpDelete("claims/{claimId:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> DeleteClaim(
        long claimId,
        CancellationToken cancellationToken)
    {
        await _benefitService.DeleteClaimAsync(claimId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ยกเลิกรายการเบิกสวัสดิการสำเร็จ"));
    }
}

