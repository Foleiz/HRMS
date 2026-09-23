using Hrms.Application.Common.Models;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Application.Features.MasterData.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/document-types")]
[Route("api/[controller]")]
public class DocumentTypesController : ControllerBase
{
    private readonly IDocumentTypeService _service;

    public DocumentTypesController(IDocumentTypeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<DocumentTypeDto>>>> GetAll(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(status, cancellationToken);
        return Ok(ApiResponse<List<DocumentTypeDto>>.Ok(result, "ดึงข้อมูลประเภทเอกสารแนบสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<DocumentTypeDto>>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DocumentTypeDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<DocumentTypeDto>>> Create(
        [FromBody] CreateDocumentTypeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<DocumentTypeDto>.Ok(result, "เพิ่มประเภทเอกสารแนบสำเร็จ"));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<DocumentTypeDto>>> Update(
        long id,
        [FromBody] UpdateDocumentTypeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<DocumentTypeDto>.Ok(result, "อัปเดตประเภทเอกสารแนบสำเร็จ"));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบประเภทเอกสารแนบสำเร็จ"));
    }
}
