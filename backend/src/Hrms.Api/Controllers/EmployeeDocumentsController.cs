using Hrms.Api.Filters;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.EmployeeDocuments.DTOs;
using Hrms.Application.Features.EmployeeDocuments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// แฟ้มเอกสารพนักงาน (hrms.employee_document)
/// </summary>
[ApiController]
[Authorize]
public class EmployeeDocumentsController : ControllerBase
{
    private readonly IEmployeeDocumentService _service;
    private readonly IDocumentExpiryNotifier _expiryNotifier;

    public EmployeeDocumentsController(IEmployeeDocumentService service, IDocumentExpiryNotifier expiryNotifier)
    {
        _service = service;
        _expiryNotifier = expiryNotifier;
    }

    /// <summary>เอกสารใกล้หมดอายุ / หมดอายุแล้วของพนักงานทุกคน (ฝ่ายบุคคล) — status: EXPIRING_SOON / EXPIRED / ว่าง = ทั้งสอง</summary>
    [HttpGet("api/employee-documents/expiring")]
    [RequirePermission("EMP_DOC_VIEW")]
    public async Task<ActionResult<ApiResponse<List<EmployeeDocumentDto>>>> GetExpiring([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await _service.GetExpiringAsync(status, cancellationToken);
        return Ok(ApiResponse<List<EmployeeDocumentDto>>.Ok(result, "ดึงรายการเอกสารใกล้หมดอายุสำเร็จ"));
    }

    /// <summary>ตรวจและส่งแจ้งเตือนเอกสารใกล้หมดอายุทันที (ปกติระบบตรวจเองทุก 6 ชั่วโมง)</summary>
    [HttpPost("api/employee-documents/expiry-check")]
    [RequirePermission("EMP_DOC_EDIT")]
    public async Task<ActionResult<ApiResponse<DocumentExpiryCheckResult>>> RunExpiryCheck(CancellationToken cancellationToken)
    {
        var result = await _expiryNotifier.RunAsync(cancellationToken);
        return Ok(ApiResponse<DocumentExpiryCheckResult>.Ok(result, "ตรวจเอกสารและส่งแจ้งเตือนเรียบร้อย"));
    }

    /// <summary>เอกสารทั้งหมดของพนักงาน (ฝ่ายบุคคล / เจ้าของ)</summary>
    [HttpGet("api/employees/{employeeId:long}/documents")]
    [SelfOrPermission("employeeId", "EMP_DOC_VIEW")]
    public async Task<ActionResult<ApiResponse<List<EmployeeDocumentDto>>>> GetByEmployee(long employeeId, CancellationToken cancellationToken)
    {
        var result = await _service.GetByEmployeeAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<List<EmployeeDocumentDto>>.Ok(result, "ดึงเอกสารพนักงานสำเร็จ"));
    }

    /// <summary>เอกสารของพนักงานที่ล็อกอินอยู่</summary>
    [HttpGet("api/employee-documents/my")]
    public async Task<ActionResult<ApiResponse<List<EmployeeDocumentDto>>>> GetMy(CancellationToken cancellationToken)
    {
        var result = await _service.GetMyDocumentsAsync(cancellationToken);
        return Ok(ApiResponse<List<EmployeeDocumentDto>>.Ok(result, "ดึงเอกสารของฉันสำเร็จ"));
    }

    /// <summary>ฝ่ายบุคคลเพิ่มเอกสารเข้าแฟ้มพนักงาน</summary>
    [HttpPost("api/employees/{employeeId:long}/documents")]
    [RequirePermission("EMP_DOC_CREATE")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<EmployeeDocumentDto>>> Upload(long employeeId, [FromBody] CreateEmployeeDocumentDto dto, CancellationToken cancellationToken)
    {
        var result = await _service.UploadAsync(employeeId, dto, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<EmployeeDocumentDto>.Ok(result, "เพิ่มเอกสารสำเร็จ"));
    }

    /// <summary>ดาวน์โหลดไฟล์เอกสาร</summary>
    [HttpGet("api/employee-documents/{id:long}/file")]
    public async Task<IActionResult> Download(long id, CancellationToken cancellationToken)
    {
        var file = await _service.GetFileAsync(id, cancellationToken);
        return File(file.Data, file.MimeType, file.FileName);
    }

    /// <summary>ลบเอกสารออกจากแฟ้ม (ฝ่ายบุคคล)</summary>
    [HttpDelete("api/employee-documents/{id:long}")]
    [RequirePermission("EMP_DOC_EDIT")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบเอกสารสำเร็จ"));
    }
}
