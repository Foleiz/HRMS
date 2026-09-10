using Hrms.Application.Common.Models;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Application.Features.MasterData.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// Controller สำหรับจัดการ Master Data ธนาคาร (Reference Feature ต้นแบบ)
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BanksController : ControllerBase
{
    private readonly IBankService _bankService;

    public BanksController(IBankService bankService)
    {
        _bankService = bankService;
    }

    /// <summary>
    /// ดึงรายชื่อธนาคารทั้งหมด
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BankDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var banks = await _bankService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<List<BankDto>>.Ok(banks, "ดึงข้อมูลธนาคารสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลธนาคารตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<BankDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var bank = await _bankService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<BankDto>.Ok(bank));
    }

    /// <summary>
    /// เพิ่มข้อมูลธนาคารใหม่
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<BankDto>>> Create([FromBody] CreateBankDto dto, CancellationToken cancellationToken)
    {
        var created = await _bankService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<BankDto>.Ok(created, "เพิ่มธนาคารสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลธนาคาร
    /// </summary>
    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<BankDto>>> Update(long id, [FromBody] UpdateBankDto dto, CancellationToken cancellationToken)
    {
        var updated = await _bankService.UpdateAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<BankDto>.Ok(updated, "อัปเดตข้อมูลธนาคารสำเร็จ"));
    }

    /// <summary>
    /// ลบข้อมูลธนาคาร
    /// </summary>
    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _bankService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบข้อมูลธนาคารสำเร็จ"));
    }
}
