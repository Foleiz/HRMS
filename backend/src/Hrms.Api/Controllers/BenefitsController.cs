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
    private readonly IBenefitClaimRequestService _claimRequests;

    public BenefitsController(IBenefitService benefitService, IBenefitClaimRequestService claimRequests)
    {
        _benefitService = benefitService;
        _claimRequests = claimRequests;
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
    /// ดึงภาพรวมยอดสวัสดิการพนักงานทุกคน (HR Overview / Accordion List)
    /// </summary>
    [HttpGet("balances")]
    [RequirePermission("ORG_BENEFIT_VIEW,EMP_PROFILE_VIEW,EMP_VIEW")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeBenefitOverviewDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeBenefitOverviewDto>>>> GetBalances(
        [FromQuery] int? year,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.GetEmployeesBenefitOverviewAsync(year, search, cancellationToken);
        return Ok(ApiResponse<List<EmployeeBenefitOverviewDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงข้อมูลสรุปโควตาและการใช้สิทธิ์สวัสดิการรายบุคคลของพนักงาน
    /// </summary>
    [HttpGet("usage/{employeeId:long}")]
    [SelfOrPermission("employeeId", "EMP_PROFILE_VIEW")]
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
    [SelfOrPermission("employeeId", "EMP_PROFILE_VIEW")]
    [ProducesResponseType(typeof(ApiResponse<List<BenefitClaimDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<BenefitClaimDto>>>> GetClaims(
        long employeeId,
        [FromQuery] int? year,
        [FromQuery] long? benefitItemId,
        CancellationToken cancellationToken)
    {
        var result = await _benefitService.GetEmployeeClaimsAsync(employeeId, year, benefitItemId, cancellationToken);
        return Ok(ApiResponse<List<BenefitClaimDto>>.Ok(result));
    }

    /// <summary>
    /// บันทึกการขอเบิก/ใช้สิทธิ์สวัสดิการของพนักงาน
    /// </summary>
    [HttpPost("claims")]
    // ฝ่ายบุคคลบันทึกให้โดยตรง (อนุมัติทันที) — พนักงานยื่นเองใช้ POST claims/request
    [RequirePermission("ORG_BENEFIT_EDIT,ORG_BENEFIT_CREATE")]
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
    [RequirePermission("ORG_BENEFIT_EDIT")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> DeleteClaim(
        long claimId,
        CancellationToken cancellationToken)
    {
        await _benefitService.DeleteClaimAsync(claimId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ยกเลิกรายการเบิกสวัสดิการสำเร็จ"));
    }

    // ───────────── พนักงานยื่นเบิกเอง + สายการอนุมัติ (BENEFIT_CLAIM) ─────────────

    /// <summary>พนักงานยื่นเบิกสวัสดิการของตนเอง (สถานะรออนุมัติ)</summary>
    [HttpPost("claims/request")]
    public async Task<ActionResult<ApiResponse<BenefitClaimRequestDto>>> SubmitClaimRequest(
        [FromBody] SubmitBenefitClaimRequest request, CancellationToken cancellationToken)
    {
        var result = await _claimRequests.SubmitAsync(request, cancellationToken);
        return Ok(ApiResponse<BenefitClaimRequestDto>.Ok(result, "ยื่นเบิกสวัสดิการเรียบร้อยแล้ว รอการอนุมัติ"));
    }

    /// <summary>คำขอเบิกที่ผู้ใช้มีสิทธิ์พิจารณา (ตามสายการอนุมัติ / ฝ่ายบุคคล)</summary>
    [HttpGet("claim-requests")]
    public async Task<ActionResult<ApiResponse<List<BenefitClaimRequestDto>>>> GetClaimRequests(
        [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await _claimRequests.GetForApprovalAsync(status, cancellationToken);
        return Ok(ApiResponse<List<BenefitClaimRequestDto>>.Ok(result));
    }

    [HttpPut("claim-requests/{id:long}/approve")]
    public async Task<ActionResult<ApiResponse<BenefitClaimRequestDto>>> ApproveClaimRequest(
        long id, [FromBody] ReviewBenefitClaimRequest? body, CancellationToken cancellationToken)
    {
        var result = await _claimRequests.ApproveAsync(id, body?.Comment, cancellationToken);
        return Ok(ApiResponse<BenefitClaimRequestDto>.Ok(result, "อนุมัติคำขอเบิกสวัสดิการสำเร็จ"));
    }

    [HttpPut("claim-requests/{id:long}/reject")]
    public async Task<ActionResult<ApiResponse<BenefitClaimRequestDto>>> RejectClaimRequest(
        long id, [FromBody] ReviewBenefitClaimRequest body, CancellationToken cancellationToken)
    {
        var result = await _claimRequests.RejectAsync(id, body?.Comment ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<BenefitClaimRequestDto>.Ok(result, "ไม่อนุมัติคำขอเบิกสวัสดิการแล้ว"));
    }

    [HttpPost("claim-requests/{id:long}/cancel")]
    public async Task<ActionResult<ApiResponse<object>>> CancelClaimRequest(long id, CancellationToken cancellationToken)
    {
        await _claimRequests.CancelAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ยกเลิกคำขอเบิกสวัสดิการแล้ว"));
    }

    [HttpGet("claim-requests/{id:long}/attachment")]
    public async Task<IActionResult> GetClaimAttachment(long id, CancellationToken cancellationToken)
    {
        var file = await _claimRequests.GetAttachmentAsync(id, cancellationToken);
        return File(file.Data, file.MimeType, file.FileName);
    }
}
