using Hrms.Application.Common.Models;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Application.Features.MasterData.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LookupsController : ControllerBase
{
    private readonly ILookupMasterService _service;

    public LookupsController(ILookupMasterService service)
    {
        _service = service;
    }

    // ==========================================
    // Nationalities
    // ==========================================
    [HttpGet("nationalities")]
    public async Task<ActionResult<ApiResponse<List<NationalityDto>>>> GetAllNationalities(CancellationToken cancellationToken)
    {
        var result = await _service.GetAllNationalitiesAsync(cancellationToken);
        return Ok(ApiResponse<List<NationalityDto>>.Ok(result, "ดึงข้อมูลสัญชาติสำเร็จ"));
    }

    [HttpGet("nationalities/{id:long}")]
    public async Task<ActionResult<ApiResponse<NationalityDto>>> GetNationalityById(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetNationalityByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<NationalityDto>.Ok(result));
    }

    [HttpPost("nationalities")]
    public async Task<ActionResult<ApiResponse<NationalityDto>>> CreateNationality(
        [FromBody] CreateNationalityDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateNationalityAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetNationalityById), new { id = result.Id }, ApiResponse<NationalityDto>.Ok(result, "เพิ่มสัญชาติสำเร็จ"));
    }

    [HttpPut("nationalities/{id:long}")]
    public async Task<ActionResult<ApiResponse<NationalityDto>>> UpdateNationality(
        long id,
        [FromBody] UpdateNationalityDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateNationalityAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<NationalityDto>.Ok(result, "อัปเดตสัญชาติสำเร็จ"));
    }

    [HttpDelete("nationalities/{id:long}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteNationality(long id, CancellationToken cancellationToken)
    {
        await _service.DeleteNationalityAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบสัญชาติสำเร็จ"));
    }

    // ==========================================
    // Religions
    // ==========================================
    [HttpGet("religions")]
    public async Task<ActionResult<ApiResponse<List<ReligionDto>>>> GetAllReligions(CancellationToken cancellationToken)
    {
        var result = await _service.GetAllReligionsAsync(cancellationToken);
        return Ok(ApiResponse<List<ReligionDto>>.Ok(result, "ดึงข้อมูลศาสนาสำเร็จ"));
    }

    [HttpGet("religions/{id:long}")]
    public async Task<ActionResult<ApiResponse<ReligionDto>>> GetReligionById(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetReligionByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<ReligionDto>.Ok(result));
    }

    [HttpPost("religions")]
    public async Task<ActionResult<ApiResponse<ReligionDto>>> CreateReligion(
        [FromBody] CreateReligionDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateReligionAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetReligionById), new { id = result.Id }, ApiResponse<ReligionDto>.Ok(result, "เพิ่มศาสนาสำเร็จ"));
    }

    [HttpPut("religions/{id:long}")]
    public async Task<ActionResult<ApiResponse<ReligionDto>>> UpdateReligion(
        long id,
        [FromBody] UpdateReligionDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateReligionAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<ReligionDto>.Ok(result, "อัปเดตศาสนาสำเร็จ"));
    }

    [HttpDelete("religions/{id:long}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteReligion(long id, CancellationToken cancellationToken)
    {
        await _service.DeleteReligionAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบศาสนาสำเร็จ"));
    }

    // ==========================================
    // Marital Statuses
    // ==========================================
    [HttpGet("marital-statuses")]
    public async Task<ActionResult<ApiResponse<List<MaritalStatusTypeDto>>>> GetAllMaritalStatuses(CancellationToken cancellationToken)
    {
        var result = await _service.GetAllMaritalStatusesAsync(cancellationToken);
        return Ok(ApiResponse<List<MaritalStatusTypeDto>>.Ok(result, "ดึงข้อมูลสถานภาพสมรสสำเร็จ"));
    }

    [HttpGet("marital-statuses/{id:long}")]
    public async Task<ActionResult<ApiResponse<MaritalStatusTypeDto>>> GetMaritalStatusById(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetMaritalStatusByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<MaritalStatusTypeDto>.Ok(result));
    }

    [HttpPost("marital-statuses")]
    public async Task<ActionResult<ApiResponse<MaritalStatusTypeDto>>> CreateMaritalStatus(
        [FromBody] CreateMaritalStatusTypeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateMaritalStatusAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetMaritalStatusById), new { id = result.Id }, ApiResponse<MaritalStatusTypeDto>.Ok(result, "เพิ่มสถานภาพสมรสสำเร็จ"));
    }

    [HttpPut("marital-statuses/{id:long}")]
    public async Task<ActionResult<ApiResponse<MaritalStatusTypeDto>>> UpdateMaritalStatus(
        long id,
        [FromBody] UpdateMaritalStatusTypeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateMaritalStatusAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<MaritalStatusTypeDto>.Ok(result, "อัปเดตสถานภาพสมรสสำเร็จ"));
    }

    [HttpDelete("marital-statuses/{id:long}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMaritalStatus(long id, CancellationToken cancellationToken)
    {
        await _service.DeleteMaritalStatusAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบสถานภาพสมรสสำเร็จ"));
    }
}
