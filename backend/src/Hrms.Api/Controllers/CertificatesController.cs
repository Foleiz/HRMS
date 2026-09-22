using Hrms.Application.Common.Models;
using Hrms.Application.Features.Certificates.DTOs;
using Hrms.Application.Features.Certificates.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับระบบยื่นคำขอหนังสือรับรองและลายเซ็นดิจิทัล (Certificate Requests & Digital Signature)
/// </summary>
[ApiController]
[Route("api/certificates")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _certificateService;

    public CertificatesController(ICertificateService certificateService)
    {
        _certificateService = certificateService;
    }

    /// <summary>
    /// ดึงรายการประเภทหนังสือรับรองทั้งหมด
    /// </summary>
    [HttpGet("types")]
    public async Task<ActionResult<ApiResponse<List<CertificateTypeDto>>>> GetTypes(CancellationToken cancellationToken)
    {
        var result = await _certificateService.GetCertificateTypesAsync(cancellationToken);
        return Ok(ApiResponse<List<CertificateTypeDto>>.Ok(result, "ดึงรายการประเภทหนังสือรับรองสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการคำขอหนังสือรับรองของพนักงานที่ล็อกอินอยู่
    /// </summary>
    [HttpGet("my-requests")]
    public async Task<ActionResult<ApiResponse<List<CertificateRequestDto>>>> GetMyRequests(CancellationToken cancellationToken)
    {
        var result = await _certificateService.GetMyRequestsAsync(cancellationToken);
        return Ok(ApiResponse<List<CertificateRequestDto>>.Ok(result, "ดึงรายการคำขอหนังสือรับรองของฉันสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการคำขอหนังสือรับรองทั้งหมด (สำหรับฝ่ายบุคคล / ผู้จัดการ)
    /// </summary>
    [HttpGet("requests")]
    public async Task<ActionResult<ApiResponse<List<CertificateRequestDto>>>> GetAllRequests(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var result = await _certificateService.GetAllRequestsAsync(status, cancellationToken);
        return Ok(ApiResponse<List<CertificateRequestDto>>.Ok(result, "ดึงรายการคำขอหนังสือรับรองสำเร็จ"));
    }

    /// <summary>
    /// ยื่นคำขอหนังสือรับรองใหม่
    /// </summary>
    [HttpPost("requests")]
    public async Task<ActionResult<ApiResponse<CertificateRequestDto>>> CreateRequest(
        [FromBody] CreateCertificateRequestDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _certificateService.CreateRequestAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetMyRequests), null, ApiResponse<CertificateRequestDto>.Ok(result, "ยื่นคำขอหนังสือรับรองสำเร็จ"));
    }

    /// <summary>
    /// ยกเลิกคำขอหนังสือรับรอง
    /// </summary>
    [HttpPost("requests/{id:long}/cancel")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelRequest(
        long id,
        [FromQuery] string? reason,
        CancellationToken cancellationToken)
    {
        var result = await _certificateService.CancelRequestAsync(id, reason, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(result, "ยกเลิกคำขอหนังสือรับรองสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลรายละเอียดเอกสารหนังสือรับรองทางการเพื่อดูตัวอย่างและพิมพ์ (Preview & Print Document)
    /// </summary>
    [HttpGet("requests/{id:long}/document")]
    public async Task<ActionResult<ApiResponse<CertificateDocumentDto>>> GetDocument(
        long id,
        [FromQuery] string? lang,
        CancellationToken cancellationToken)
    {
        var result = await _certificateService.GetCertificateDocumentAsync(id, lang, cancellationToken);
        return Ok(ApiResponse<CertificateDocumentDto>.Ok(result, "ดึงข้อมูลเอกสารหนังสือรับรองสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการลายเซ็นดิจิทัลของผู้มีอำนาจลงนาม
    /// </summary>
    [HttpGet("signatures")]
    public async Task<ActionResult<ApiResponse<List<EmployeeSignatureDto>>>> GetSignatures(CancellationToken cancellationToken)
    {
        var result = await _certificateService.GetActiveSignaturesAsync(cancellationToken);
        return Ok(ApiResponse<List<EmployeeSignatureDto>>.Ok(result, "ดึงข้อมูลลายเซ็นดิจิทัลสำเร็จ"));
    }

    /// <summary>
    /// อัปโหลดหรืออัปเดตลายเซ็นดิจิทัลของผู้มีอำนาจลงนาม
    /// </summary>
    [HttpPost("signatures")]
    public async Task<ActionResult<ApiResponse<EmployeeSignatureDto>>> UploadSignature(
        [FromBody] SignatureUploadDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _certificateService.UploadSignatureAsync(dto, cancellationToken);
        return Ok(ApiResponse<EmployeeSignatureDto>.Ok(result, "บันทึกลายเซ็นดิจิทัลสำเร็จ"));
    }
}
