using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Commission.DTOs;
using Hrms.Application.Features.Commission.Services;
using Hrms.Application.Features.Payroll;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/salary/commission")]
[Route("api/commission")]
[Authorize]
public class CommissionController : ControllerBase
{
    private readonly ICommissionService _commissionService;
    private readonly ICurrentUserService _currentUser;

    public CommissionController(ICommissionService commissionService, ICurrentUserService currentUser)
    {
        _commissionService = commissionService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// ดึงรายการค่าคอมมิชชั่นของงวด (ปี, เดือน)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<CommissionPeriodSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CommissionPeriodSummaryDto>>> GetCommissionPeriod(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.Today.Year;
        var m = month ?? DateTime.Today.Month;
        var result = await _commissionService.GetCommissionPeriodAsync(y, m, cancellationToken);
        return Ok(ApiResponse<CommissionPeriodSummaryDto>.Ok(result, "ดึงข้อมูลค่าคอมมิชชั่นสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการสรุปภาพรวมงวดค่าคอมมิชชั่นรายเดือนทั้งหมดของปี (Monthly Periods Overview)
    /// </summary>
    [HttpGet("periods")]
    [ProducesResponseType(typeof(ApiResponse<List<CommissionMonthlyPeriodDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<CommissionMonthlyPeriodDto>>>> GetMonthlyPeriods(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.Today.Year;
        var result = await _commissionService.GetMonthlyPeriodsAsync(y, cancellationToken);
        return Ok(ApiResponse<List<CommissionMonthlyPeriodDto>>.Ok(result, "ดึงรายการงวดค่าคอมมิชชั่นสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการย่อยทั้งหมดในรอบเดือนนั้น (รวมทุกไฟล์ที่นำเข้าและรายการที่บันทึกเพิ่ม)
    /// </summary>
    [HttpGet("periods/all-entries")]
    [ProducesResponseType(typeof(ApiResponse<List<CommissionBatchEntryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<CommissionBatchEntryDto>>>> GetPeriodAllEntries(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.Today.Year;
        var m = month ?? DateTime.Today.Month;
        var result = await _commissionService.GetPeriodAllEntriesAsync(y, m, cancellationToken);
        return Ok(ApiResponse<List<CommissionBatchEntryDto>>.Ok(result, "ดึงรายการทั้งหมดในงวดสำเร็จ"));
    }

    /// <summary>
    /// พรีวิวไฟล์ค่าคอมมิชชั่น ตรวจจับรูปแบบอัตโนมัติ (ทั้งเดือน / วันเดียว / ช่วงวัน) และคำนวณผลกระทบก่อนนำเข้าจริง
    /// </summary>
    [HttpPost("preview")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<CommissionPreviewResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CommissionPreviewResultDto>>> PreviewCommissionFile(
        [FromForm] int? year,
        [FromForm] int? month,
        [FromForm] decimal? defaultRate,
        [FromQuery(Name = "year")] int? yearQuery,
        [FromQuery(Name = "month")] int? monthQuery,
        [FromQuery(Name = "defaultRate")] decimal? defaultRateQuery,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "พรีวิวค่าคอมมิชชั่น");

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("กรุณาเลือกไฟล์ที่ต้องการนำเข้า"));
        }

        var y = year ?? yearQuery ?? DateTime.Today.Year;
        var m = month ?? monthQuery ?? DateTime.Today.Month;
        var rate = defaultRate ?? defaultRateQuery ?? 3.00m;

        using var stream = file.OpenReadStream();
        var result = await _commissionService.PreviewCommissionFileAsync(y, m, rate, stream, file.FileName, cancellationToken);
        return Ok(ApiResponse<CommissionPreviewResultDto>.Ok(result, "ตรวจสอบไฟล์ค่าคอมมิชชั่นสำเร็จ"));
    }

    /// <summary>
    /// นำเข้าไฟล์ Excel / CSV ค่าคอมมิชชั่น (ตรวจจับรูปแบบและทับข้อมูลเดิมในช่วงวันที่ซ้ำให้อัตโนมัติ)
    /// </summary>
    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<ImportCommissionResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<ImportCommissionResultDto>>> ImportCommissionFile(
        [FromForm] int? year,
        [FromForm] int? month,
        [FromForm] decimal? defaultRate,
        [FromQuery(Name = "year")] int? yearQuery,
        [FromQuery(Name = "month")] int? monthQuery,
        [FromQuery(Name = "defaultRate")] decimal? defaultRateQuery,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "นำเข้าค่าคอมมิชชั่น");

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("กรุณาเลือกไฟล์ที่ต้องการนำเข้า"));
        }

        var y = year ?? yearQuery ?? DateTime.Today.Year;
        var m = month ?? monthQuery ?? DateTime.Today.Month;
        var rate = defaultRate ?? defaultRateQuery ?? 3.00m;
        var userId = _currentUser.UserId;

        using var stream = file.OpenReadStream();
        var result = await _commissionService.ImportCommissionFileAsync(y, m, rate, stream, file.FileName, userId, cancellationToken);
        var msg = $"นำเข้าค่าคอมมิชชั่น ({result.DetectedTypeLabel}) สำเร็จ {result.TotalImported} รายการ (แทนที่รายการเดิม {result.ReplacedCount} รายการ)";
        return Ok(ApiResponse<ImportCommissionResultDto>.Ok(result, msg));
    }

    /// <summary>
    /// ดึงประวัติการนำเข้าไฟล์ค่าคอมมิชชั่น (Batches)
    /// </summary>
    [HttpGet("batches")]
    [ProducesResponseType(typeof(ApiResponse<PagedCommissionBatchResult>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedCommissionBatchResult>>> GetBatches(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "ดูประวัตินำเข้าค่าคอมมิชชั่น");
        var result = await _commissionService.GetCommissionBatchesAsync(page, pageSize, cancellationToken);
        return Ok(ApiResponse<PagedCommissionBatchResult>.Ok(result, "ดึงประวัติการนำเข้าสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการข้อมูลค่าคอมมิชชั่นที่นำเข้าในชุด Batch (Batch Records)
    /// </summary>
    [HttpGet("batches/{batchId:long}/records")]
    [ProducesResponseType(typeof(ApiResponse<List<CommissionBatchEntryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<CommissionBatchEntryDto>>>> GetBatchRecords(
        long batchId,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "ดูรายการในชุดนำเข้าค่าคอมมิชชั่น");
        var result = await _commissionService.GetBatchRecordsAsync(batchId, cancellationToken);
        return Ok(ApiResponse<List<CommissionBatchEntryDto>>.Ok(result, "ดึงรายการในชุดนำเข้าสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการค่าคอมมิชชั่นย่อยทั้งหมดของพนักงานในรอบเดือน (รวมทุกไฟล์ที่นำเข้าและรายการที่บันทึกเพิ่ม)
    /// </summary>
    [HttpGet("employees/{employeeId:long}/entries")]
    [ProducesResponseType(typeof(ApiResponse<List<CommissionBatchEntryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<CommissionBatchEntryDto>>>> GetEmployeePeriodEntries(
        long employeeId,
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "ดูรายการค่าคอมมิชชั่นย่อยของพนักงาน");
        var y = year > 0 ? year : DateTime.Today.Year;
        var m = month > 0 ? month : DateTime.Today.Month;
        var result = await _commissionService.GetEmployeePeriodEntriesAsync(employeeId, y, m, cancellationToken);
        return Ok(ApiResponse<List<CommissionBatchEntryDto>>.Ok(result, "ดึงรายการค่าคอมมิชชั่นย่อยสำเร็จ"));
    }

    /// <summary>
    /// ยกเลิกชุดการนำเข้า (Revert Batch) และกู้คืนรายการก่อนหน้า
    /// </summary>
    [HttpPost("batches/{batchId:long}/revert")]
    [ProducesResponseType(typeof(ApiResponse<RevertCommissionBatchResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<RevertCommissionBatchResultDto>>> RevertBatch(
        long batchId,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "ยกเลิกชุดการนำเข้าค่าคอมมิชชั่น");
        var userId = _currentUser.UserId;
        var result = await _commissionService.RevertCommissionBatchAsync(batchId, userId, cancellationToken);
        return Ok(ApiResponse<RevertCommissionBatchResultDto>.Ok(result, result.Message));
    }

    /// <summary>
    /// แก้ไขตัวเลขค่าคอมมิชชั่นของพนักงานรายบุคคล
    /// </summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<CommissionRecordDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CommissionRecordDto>>> UpdateCommissionRecord(
        long id,
        [FromBody] UpdateCommissionItemRequest request,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "แก้ไขค่าคอมมิชชั่น");
        var result = await _commissionService.UpdateCommissionRecordAsync(id, request, cancellationToken);
        return Ok(ApiResponse<CommissionRecordDto>.Ok(result, "อัปเดตข้อมูลค่าคอมมิชชั่นสำเร็จ"));
    }

    /// <summary>
    /// เพิ่มข้อมูลค่าคอมมิชชั่นด้วยตนเอง
    /// </summary>
    [HttpPost("manual")]
    [ProducesResponseType(typeof(ApiResponse<CommissionRecordDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CommissionRecordDto>>> AddManualCommissionRecord(
        [FromBody] AddManualCommissionRequest request,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "เพิ่มค่าคอมมิชชั่น");
        var result = await _commissionService.AddManualCommissionRecordAsync(request, cancellationToken);
        return Ok(ApiResponse<CommissionRecordDto>.Ok(result, "เพิ่มรายการค่าคอมมิชชั่นสำเร็จ"));
    }

    /// <summary>
    /// ลบรายการค่าคอมมิชชั่นของพนักงาน
    /// </summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> DeleteCommissionRecord(
        long id,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "ลบค่าคอมมิชชั่น");
        await _commissionService.DeleteCommissionRecordAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "ลบรายการค่าคอมมิชชั่นสำเร็จ"));
    }

    /// <summary>
    /// ยืนยันยอดค่าคอมมิชชั่นทั้งงวด
    /// </summary>
    [HttpPost("confirm")]
    [ProducesResponseType(typeof(ApiResponse<CommissionPeriodSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CommissionPeriodSummaryDto>>> ConfirmCommissionPeriod(
        [FromBody] ConfirmCommissionRequest request,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "ยืนยันค่าคอมมิชชั่น");
        long empId = _currentUser.EmployeeId ?? 0;
        var result = await _commissionService.ConfirmCommissionPeriodAsync(request.Year, request.Month, empId, cancellationToken);
        return Ok(ApiResponse<CommissionPeriodSummaryDto>.Ok(result, "ยืนยันยอดค่าคอมมิชชั่นประจำงวดเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ล้างข้อมูลค่าคอมมิชชั่นทั้งงวด (Reset)
    /// </summary>
    [HttpPost("reset")]
    [ProducesResponseType(typeof(ApiResponse<CommissionPeriodSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CommissionPeriodSummaryDto>>> ResetCommissionPeriod(
        [FromBody] ConfirmCommissionRequest request,
        CancellationToken cancellationToken)
    {
        PayrollAccess.Ensure(PayrollAccess.CanManage(_currentUser, "PAYROLL_MANAGE"), "รีเซ็ตค่าคอมมิชชั่น");
        var result = await _commissionService.ResetCommissionPeriodAsync(request.Year, request.Month, cancellationToken);
        return Ok(ApiResponse<CommissionPeriodSummaryDto>.Ok(result, "รีเซ็ตข้อมูลค่าคอมมิชชั่นประจำงวดเรียบร้อยแล้ว"));
    }

    /// <summary>
    /// ดาวน์โหลดไฟล์เทมเพลต Excel สำหรับกรอกยอดขาย
    /// </summary>
    [HttpGet("template")]
    public async Task<IActionResult> DownloadTemplate(CancellationToken cancellationToken)
    {
        var bytes = await _commissionService.GenerateExcelTemplateAsync(cancellationToken);
        var fileName = $"Commission_Template_{DateTime.Today:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
