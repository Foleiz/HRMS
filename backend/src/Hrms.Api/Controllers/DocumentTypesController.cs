using Hrms.Api.Filters;
using Microsoft.AspNetCore.Authorization;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Application.Features.MasterData.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/document-types")]
[Route("api/[controller]")]
[Authorize]
public class DocumentTypesController : ControllerBase
{
    private readonly IDocumentTypeService _service;
    private readonly Hrms.Application.Common.Interfaces.ICurrentUserService _currentUser;

    public DocumentTypesController(IDocumentTypeService service, Hrms.Application.Common.Interfaces.ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<DocumentTypeDto>>>> GetAll(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(status) && !_currentUser.HasRole("ADMIN") && !_currentUser.HasRole("SYSTEM_SUPER") && !_currentUser.HasPermission("MASTER_DATA_VIEW"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<DocumentTypeDto>>.Fail("คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้"));
        }

        var result = await _service.GetAllAsync(status, cancellationToken);
        return Ok(ApiResponse<List<DocumentTypeDto>>.Ok(result, "ดึงข้อมูลประเภทเอกสารแนบสำเร็จ"));
    }

    [HttpGet("{id:long}")]
    [RequirePermission("MASTER_DATA_VIEW")]
    public async Task<ActionResult<ApiResponse<DocumentTypeDto>>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DocumentTypeDto>.Ok(result));
    }

    [HttpPost]
    [RequirePermission("MASTER_DATA_CREATE")]
    public async Task<ActionResult<ApiResponse<DocumentTypeDto>>> Create(
        [FromBody] CreateDocumentTypeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<DocumentTypeDto>.Ok(result, "เพิ่มประเภทเอกสารแนบสำเร็จ"));
    }

    [HttpPut("{id:long}")]
    [RequirePermission("MASTER_DATA_EDIT")]
    public async Task<ActionResult<ApiResponse<DocumentTypeDto>>> Update(
        long id,
        [FromBody] UpdateDocumentTypeDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(id, dto, cancellationToken);
        return Ok(ApiResponse<DocumentTypeDto>.Ok(result, "อัปเดตประเภทเอกสารแนบสำเร็จ"));
    }

    [HttpDelete("{id:long}")]
    [RequirePermission("MASTER_DATA_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบประเภทเอกสารแนบสำเร็จ"));
    }
}
