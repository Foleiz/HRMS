using Hrms.Application.Common.Models;
using Hrms.Application.Features.GeneralRequests.DTOs;
using Hrms.Application.Features.GeneralRequests.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API คำขอเอกสารทั่วไป (General Requests) — ยื่นคำขอทั่วไปถึงฝ่ายบุคคลผ่านสายการอนุมัติ
/// </summary>
[ApiController]
[Route("api/general-requests")]
[Authorize]
public class GeneralRequestsController : ControllerBase
{
    private readonly IGeneralRequestService _service;

    public GeneralRequestsController(IGeneralRequestService service)
    {
        _service = service;
    }

    /// <summary>คำขอของพนักงานที่ล็อกอินอยู่</summary>
    [HttpGet("my")]
    public async Task<ActionResult<ApiResponse<List<GeneralRequestDto>>>> GetMy(CancellationToken cancellationToken)
    {
        var result = await _service.GetMyRequestsAsync(cancellationToken);
        return Ok(ApiResponse<List<GeneralRequestDto>>.Ok(result, "ดึงรายการคำขอของฉันสำเร็จ"));
    }

    /// <summary>คำขอสำหรับผู้อนุมัติ / ฝ่ายบุคคล</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<GeneralRequestDto>>>> GetAll([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await _service.GetAllRequestsAsync(status, cancellationToken);
        return Ok(ApiResponse<List<GeneralRequestDto>>.Ok(result, "ดึงรายการคำขอสำเร็จ"));
    }

    /// <summary>ยื่นคำขอใหม่</summary>
    [HttpPost]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<GeneralRequestDto>>> Create([FromBody] CreateGeneralRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CreateRequestAsync(dto, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<GeneralRequestDto>.Ok(result, "ยื่นคำขอสำเร็จ"));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}/approve")]
    public async Task<ActionResult<ApiResponse<GeneralRequestDto>>> Approve(long id, [FromBody] ApproveGeneralRequestPayload? payload, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ApproveRequestAsync(id, payload?.Comment, cancellationToken);
            return Ok(ApiResponse<GeneralRequestDto>.Ok(result, "อนุมัติคำขอสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id:long}/reject")]
    public async Task<ActionResult<ApiResponse<GeneralRequestDto>>> Reject(long id, [FromBody] RejectGeneralRequestPayload payload, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.RejectRequestAsync(id, payload.Reason, cancellationToken);
            return Ok(ApiResponse<GeneralRequestDto>.Ok(result, "ปฏิเสธคำขอสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<GeneralRequestDto>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<ApiResponse<bool>>> Cancel(long id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CancelRequestAsync(id, cancellationToken);
            return Ok(ApiResponse<bool>.Ok(result, "ยกเลิกคำขอสำเร็จ"));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<bool>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    /// <summary>ดาวน์โหลดไฟล์แนบ (เจ้าของคำขอ / ฝ่ายบุคคล / ผู้อนุมัติในสาย)</summary>
    [HttpGet("{id:long}/attachment")]
    public async Task<IActionResult> Attachment(long id, CancellationToken cancellationToken)
    {
        try
        {
            var file = await _service.GetAttachmentAsync(id, cancellationToken);
            return File(file.Data, file.MimeType, file.FileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<bool>.Fail(ex.Message));
        }
    }
}
