using System.Security.Claims;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Application.Features.Attendance.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API สำหรับนำเข้าไฟล์บันทึกเวลาสแกนนิ้ว / Excel / CSV (Biometric & Excel Batch Import)
/// สำหรับ Developer 1: Sprint 6
/// </summary>
[ApiController]
[Route("api/attendance/import")]
public class AttendanceImportController : ControllerBase
{
    private readonly IAttendanceImportService _importService;

    public AttendanceImportController(IAttendanceImportService importService)
    {
        _importService = importService;
    }

    /// <summary>
    /// อัปโหลดไฟล์บันทึกเวลา (.xlsx, .xls, .csv) พร้อมระบุแหล่งที่มาและอุปกรณ์
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadFile(
        [FromForm] IFormFile file,
        [FromForm] string? source,
        [FromForm] string? deviceName,
        [FromForm] bool allowDuplicate = false,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<AttendanceImportResultDto>.Fail("กรุณาเลือกไฟล์ที่ต้องการนำเข้า"));
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls" && ext != ".csv")
        {
            return BadRequest(ApiResponse<AttendanceImportResultDto>.Fail("ระบบรองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv เท่านั้น"));
        }

        long? userId = null;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (long.TryParse(userIdClaim, out var parsedId))
        {
            userId = parsedId;
        }

        using var stream = file.OpenReadStream();
        var result = await _importService.ImportFileAsync(
            stream, 
            file.FileName, 
            source, 
            deviceName, 
            allowDuplicate, 
            userId, 
            cancellationToken);

        if (result.IsDuplicate)
        {
            return Ok(new ApiResponse<AttendanceImportResultDto>
            {
                Success = false,
                Message = result.Errors.FirstOrDefault()?.ErrorMessage ?? "ตรวจพบไฟล์ซ้ำในระบบ",
                Data = result
            });
        }

        string message = result.Status switch
        {
            "IMPORTED" => $"นำเข้าข้อมูลสำเร็จครบถ้วน ({result.SuccessRecords} รายการ)",
            "PARTIAL" => $"นำเข้าข้อมูลสำเร็จบางส่วน (สำเร็จ {result.SuccessRecords} รายการ, ข้อผิดพลาด {result.FailedRecords} รายการ)",
            "FAILED" => $"การนำเข้าล้มเหลว ไม่พบรายการที่ถูกต้อง (ข้อผิดพลาด {result.FailedRecords} รายการ)",
            _ => "ประมวลผลการนำเข้าเรียบร้อย"
        };

        return Ok(ApiResponse<AttendanceImportResultDto>.Ok(result, message));
    }

    /// <summary>
    /// ดึงรายการประวัติการนำเข้าไฟล์ย้อนหลัง (Batch History)
    /// </summary>
    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches(
        [FromQuery] AttendanceImportBatchFilterQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _importService.GetBatchesAsync(query, cancellationToken);
        return Ok(ApiResponse<PagedImportBatchResult>.Ok(result));
    }

    /// <summary>
    /// ดึงรายละเอียดของชุดการนำเข้า (Batch Detail)
    /// </summary>
    [HttpGet("batches/{id}")]
    public async Task<IActionResult> GetBatchById(long id, CancellationToken cancellationToken)
    {
        var result = await _importService.GetBatchByIdAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<AttendanceImportBatchDto>.Fail($"ไม่พบข้อมูลชุดการนำเข้า ID: {id}"));
        }
        return Ok(ApiResponse<AttendanceImportBatchDto>.Ok(result));
    }

    /// <summary>
    /// ดึงรายการข้อผิดพลาดรายแถวของชุดการนำเข้า (Batch Error Logs)
    /// </summary>
    [HttpGet("batches/{id}/errors")]
    public async Task<IActionResult> GetBatchErrors(
        long id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _importService.GetBatchErrorsAsync(id, page, pageSize, cancellationToken);
        return Ok(ApiResponse<PagedImportErrorResult>.Ok(result));
    }

    /// <summary>
    /// ดาวน์โหลดไฟล์แม่แบบตัวอย่าง (Template) สำหรับนำเข้าเวลา
    /// </summary>
    [HttpGet("template")]
    public async Task<IActionResult> DownloadTemplate(
        [FromQuery] string format = "xlsx",
        CancellationToken cancellationToken = default)
    {
        var (content, contentType, fileName) = await _importService.GenerateTemplateAsync(format, cancellationToken);
        return File(content, contentType, fileName);
    }
}
