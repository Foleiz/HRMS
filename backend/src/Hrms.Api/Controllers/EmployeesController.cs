using Hrms.Application.Common.Models;
using Hrms.Application.Features.Employees.DTOs;
using Hrms.Application.Features.Employees.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// API Controller สำหรับจัดการข้อมูลพนักงาน (Employee Core & PDPA Security)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    /// <summary>
    /// ดึงรายชื่อพนักงานทั้งหมด (กรองตามสิทธิ์ Data Scope และคำค้นหา)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<List<EmployeeDto>>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.GetAllAsync(search, cancellationToken);
        return Ok(ApiResponse<List<EmployeeDto>>.Ok(result, "ดึงข้อมูลรายชื่อพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงรหัสพนักงานลำดับถัดไปที่ระบบสร้างให้อัตโนมัติ (เช่น EMP0001, EMP0011)
    /// </summary>
    [HttpGet("next-code")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<string>>> GetNextCode(CancellationToken cancellationToken)
    {
        var nextCode = await _employeeService.GetNextEmployeeCodeAsync(cancellationToken);
        return Ok(ApiResponse<string>.Ok(nextCode, "ดึงรหัสพนักงานลำดับถัดไปสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลพนักงานตาม ID
    /// </summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> GetById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result, "ดึงข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// เพิ่มข้อมูลพนักงานใหม่ (เข้ารหัสข้อมูลบัตรประชาชนและประกันสังคมตาม PDPA)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Create(
        [FromBody] CreateEmployeeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<EmployeeDto>.Ok(result, "บันทึกข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลพนักงาน
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Update(
        long id,
        [FromBody] UpdateEmployeeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result, "อัปเดตข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ลบข้อมูลพนักงาน
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        long id,
        CancellationToken cancellationToken)
    {
        await _employeeService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบข้อมูลพนักงานสำเร็จ"));
    }

    /// <summary>
    /// เปลี่ยนสถานะการจ้างงานพนักงาน (Quick Update — ไม่ต้องส่งข้อมูลอื่น)
    /// status ที่รองรับ: ACTIVE, INACTIVE
    /// </summary>
    [HttpPatch("{id:long}/status")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> UpdateStatus(
        long id,
        [FromBody] UpdateEmployeeStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _employeeService.UpdateStatusAsync(id, request.Status, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result, "อัปเดตสถานะพนักงานสำเร็จ"));
    }

    /// <summary>
    /// ดึงรูปภาพโปรไฟล์ของพนักงานโดยตรงจากฐานข้อมูล PostgreSQL (ส่งคืนเป็น Binary Stream)
    /// </summary>
    [HttpGet("{id:long}/avatar")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvatar(
        long id,
        CancellationToken cancellationToken)
    {
        var avatar = await _employeeService.GetAvatarAsync(id, cancellationToken);
        if (avatar == null)
        {
            return NotFound();
        }

        return File(avatar.Value.ImageData, avatar.Value.MimeType);
    }

    /// <summary>
    /// อัปโหลดรูปภาพโปรไฟล์พนักงานและจัดเก็บลงในฐานข้อมูล PostgreSQL
    /// </summary>
    [HttpPost("{id:long}/avatar")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<string>>> UploadAvatar(
        long id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<string>.Fail("กรุณาเลือกไฟล์รูปภาพที่ต้องการอัปโหลด"));
        }

        using var stream = file.OpenReadStream();
        var avatarUrl = await _employeeService.UploadAvatarAsync(
            id,
            stream,
            file.ContentType,
            file.Length,
            cancellationToken);

        return Ok(ApiResponse<string>.Ok(avatarUrl, "อัปโหลดรูปโปรไฟล์สำเร็จ"));
    }

    /// <summary>
    /// ลบรูปภาพโปรไฟล์ของพนักงาน
    /// </summary>
    [HttpDelete("{id:long}/avatar")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteAvatar(
        long id,
        CancellationToken cancellationToken)
    {
        var success = await _employeeService.DeleteAvatarAsync(id, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(success, "ลบรูปโปรไฟล์สำเร็จ"));
    }

    /// <summary>
    /// ดึงไฟล์ภาพลายเซ็นพนักงาน (ส่งคืนเป็น Binary Stream)
    /// </summary>
    [HttpGet("{id:long}/signature")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSignature(
        long id,
        CancellationToken cancellationToken)
    {
        var sig = await _employeeService.GetSignatureAsync(id, cancellationToken);
        if (sig == null)
        {
            return NotFound();
        }

        return File(sig.Value.SignatureData, sig.Value.MimeType);
    }

    /// <summary>
    /// อัปโหลดไฟล์ภาพลายเซ็นพนักงาน (PNG/JPG ขนาดไม่เกิน 2MB)
    /// </summary>
    [HttpPost("{id:long}/signature")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<string>>> UploadSignature(
        long id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("กรุณาเลือกไฟล์ภาพลายเซ็นที่ต้องการอัปโหลด"));
        }

        using var stream = file.OpenReadStream();
        var sigUrl = await _employeeService.UploadSignatureAsync(
            id,
            stream,
            file.FileName,
            file.ContentType,
            file.Length,
            cancellationToken);

        return Ok(ApiResponse<string>.Ok(sigUrl, "อัปโหลดภาพลายเซ็นเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ลบภาพลายเซ็นพนักงาน
    /// </summary>
    [HttpDelete("{id:long}/signature")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSignature(
        long id,
        CancellationToken cancellationToken)
    {
        var success = await _employeeService.DeleteSignatureAsync(id, cancellationToken);
        return Ok(ApiResponse<bool>.Ok(success, "ลบภาพลายเซ็นเรียบร้อยแล้ว"));
    }
}
