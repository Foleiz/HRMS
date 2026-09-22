using Hrms.Application.Common.Models;
using Hrms.Application.Features.Organization.Dtos;
using Hrms.Application.Features.Organization.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// Controller สำหรับจัดการบัญชีธนาคารบริษัท สำหรับระบบจ่ายเงินเดือน (Payroll)
/// </summary>
[ApiController]
[Route("api/company-bank-accounts")]
[Route("api/[controller]")]
public class CompanyBankAccountsController : ControllerBase
{
    private readonly ICompanyBankAccountService _service;

    public CompanyBankAccountsController(ICompanyBankAccountService service)
    {
        _service = service;
    }

    /// <summary>
    /// ดึงรายการบัญชีธนาคารบริษัททั้งหมด
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CompanyBankAccountDto>>>> GetAll([FromQuery] long? companyId, CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(companyId, cancellationToken);
        return Ok(ApiResponse<List<CompanyBankAccountDto>>.Ok(result, "ดึงข้อมูลบัญชีธนาคารบริษัทสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลบัญชีธนาคารบริษัทตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<CompanyBankAccountDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<CompanyBankAccountDto>.Ok(result));
    }

    /// <summary>
    /// เพิ่มบัญชีธนาคารบริษัทใหม่
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<CompanyBankAccountDto>>> Create([FromBody] CreateCompanyBankAccountDto dto, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<CompanyBankAccountDto>.Ok(result, "เพิ่มบัญชีธนาคารบริษัทสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลบัญชีธนาคารบริษัท
    /// </summary>
    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<CompanyBankAccountDto>>> Update(long id, [FromBody] UpdateCompanyBankAccountDto dto, CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<CompanyBankAccountDto>.Ok(result, "อัปเดตข้อมูลบัญชีธนาคารสำเร็จ"));
    }

    /// <summary>
    /// กำหนดให้บัญชีนี้เป็นบัญชีจ่ายเงินเดือนหลัก (Primary Payroll Account)
    /// </summary>
    [HttpPut("{id:long}/set-primary")]
    public async Task<ActionResult<ApiResponse<CompanyBankAccountDto>>> SetPrimary(long id, CancellationToken cancellationToken)
    {
        var result = await _service.SetPrimaryAsync(id, cancellationToken);
        return Ok(ApiResponse<CompanyBankAccountDto>.Ok(result, "ตั้งเป็นบัญชีจ่ายเงินเดือนหลักสำเร็จ"));
    }

    /// <summary>
    /// ลบบัญชีธนาคารบริษัท
    /// </summary>
    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบบัญชีธนาคารสำเร็จ"));
    }
}
