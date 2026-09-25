using Hrms.Application.Common.Models;
using Hrms.Application.Features.Payroll.DTOs;
using Hrms.Application.Features.Payroll.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/salary")]
[Authorize]
public class SalaryController : ControllerBase
{
    private readonly ISalaryService _salaryService;
    private readonly IPayslipService _payslipService;

    public SalaryController(ISalaryService salaryService, IPayslipService payslipService)
    {
        _salaryService = salaryService;
        _payslipService = payslipService;
    }

    #region Salary Structures

    /// <summary>
    /// ดึงรายการโครงสร้างกรอบอัตราเงินเดือนทั้งหมด
    /// </summary>
    [HttpGet("structures")]
    [ProducesResponseType(typeof(ApiResponse<List<SalaryStructureDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SalaryStructureDto>>>> GetAllStructures(
        [FromQuery] long? positionId,
        [FromQuery] long? levelId,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetAllStructuresAsync(positionId, levelId, cancellationToken);
        return Ok(ApiResponse<List<SalaryStructureDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงรายละเอียดโครงสร้างกรอบเงินเดือนตาม ID
    /// </summary>
    [HttpGet("structures/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<SalaryStructureDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<SalaryStructureDto>>> GetStructureById(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetStructureByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<SalaryStructureDto>.Ok(result));
    }

    /// <summary>
    /// สร้างโครงสร้างกรอบเงินเดือนใหม่
    /// </summary>
    [HttpPost("structures")]
    [ProducesResponseType(typeof(ApiResponse<SalaryStructureDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<SalaryStructureDto>>> CreateStructure(
        [FromBody] CreateSalaryStructureRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.CreateStructureAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetStructureById), new { id = result.Id }, ApiResponse<SalaryStructureDto>.Ok(result, "สร้างโครงสร้างเงินเดือนสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขโครงสร้างกรอบเงินเดือน
    /// </summary>
    [HttpPut("structures/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<SalaryStructureDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<SalaryStructureDto>>> UpdateStructure(
        long id,
        [FromBody] UpdateSalaryStructureRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.UpdateStructureAsync(id, request, cancellationToken);
        return Ok(ApiResponse<SalaryStructureDto>.Ok(result, "แก้ไขโครงสร้างเงินเดือนสำเร็จ"));
    }

    /// <summary>
    /// ลบโครงสร้างกรอบเงินเดือน
    /// </summary>
    [HttpDelete("structures/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> DeleteStructure(
        long id,
        CancellationToken cancellationToken)
    {
        await _salaryService.DeleteStructureAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบโครงสร้างเงินเดือนสำเร็จ"));
    }

    #endregion

    #region Tax Brackets

    /// <summary>
    /// ดึงรายการขั้นบันไดภาษีเงินได้บุคคลธรรมดา
    /// </summary>
    [HttpGet("tax-brackets")]
    [ProducesResponseType(typeof(ApiResponse<List<TaxBracketDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<TaxBracketDto>>>> GetTaxBrackets(CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetTaxBracketsAsync(cancellationToken);
        return Ok(ApiResponse<List<TaxBracketDto>>.Ok(result));
    }

    /// <summary>
    /// อัปเดตขั้นบันไดภาษีเงินได้บุคคลธรรมดา
    /// </summary>
    [HttpPut("tax-brackets/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<TaxBracketDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<TaxBracketDto>>> UpdateTaxBracket(
        long id,
        [FromBody] UpdateTaxBracketRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.UpdateTaxBracketAsync(id, request, cancellationToken);
        return Ok(ApiResponse<TaxBracketDto>.Ok(result, "อัปเดตขั้นบันไดภาษีสำเร็จ"));
    }

    /// <summary>
    /// บันทึกโครงสร้างขั้นบันไดภาษีเงินได้บุคคลธรรมดาแบบชุด (Batch Update) พร้อมตรวจสอบความต่อเนื่อง
    /// </summary>
    [HttpPost("tax-brackets/batch-update")]
    [ProducesResponseType(typeof(ApiResponse<List<TaxBracketDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<List<TaxBracketDto>>>> BatchUpdateTaxBrackets(
        [FromBody] BatchUpdateTaxBracketsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.BatchUpdateTaxBracketsAsync(request, cancellationToken);
        return Ok(ApiResponse<List<TaxBracketDto>>.Ok(result, "อัปเดตโครงสร้างอัตราภาษีสำเร็จ"));
    }

    /// <summary>
    /// รีเซ็ตขั้นบันไดภาษีเป็นค่ามาตรฐานตามประมวลรัษฎากร (8 ขั้น)
    /// </summary>
    [HttpPost("tax-brackets/reset-defaults")]
    [ProducesResponseType(typeof(ApiResponse<List<TaxBracketDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<TaxBracketDto>>>> ResetTaxBracketsToDefault(
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.ResetTaxBracketsToDefaultAsync(cancellationToken);
        return Ok(ApiResponse<List<TaxBracketDto>>.Ok(result, "รีเซ็ตขั้นบันไดภาษีเป็นค่ามาตรฐานสรรพากร (8 ขั้น) สำเร็จ"));
    }

    #endregion

    #region Social Security Rates

    /// <summary>
    /// ดึงรายการอัตราเงินสมทบกองทุนประกันสังคม
    /// </summary>
    [HttpGet("social-security")]
    [ProducesResponseType(typeof(ApiResponse<List<SocialSecurityRateDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SocialSecurityRateDto>>>> GetSocialSecurityRates(CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetSocialSecurityRatesAsync(cancellationToken);
        return Ok(ApiResponse<List<SocialSecurityRateDto>>.Ok(result));
    }

    /// <summary>
    /// อัปเดตอัตราเงินสมทบกองทุนประกันสังคม
    /// </summary>
    [HttpPut("social-security/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<SocialSecurityRateDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<SocialSecurityRateDto>>> UpdateSocialSecurityRate(
        long id,
        [FromBody] UpdateSocialSecurityRateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.UpdateSocialSecurityRateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<SocialSecurityRateDto>.Ok(result, "อัปเดตอัตราประกันสังคมสำเร็จ"));
    }

    #endregion

    #region Employee Salaries

    /// <summary>
    /// ดึงภาพรวมฐานเงินเดือนพนักงานทุกคน พร้อมโครงสร้างอ้างอิง
    /// </summary>
    [HttpGet("employees/overview")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeSalaryOverviewDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeSalaryOverviewDto>>>> GetEmployeeSalariesOverview(
        [FromQuery] string? search,
        [FromQuery] long? departmentId,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetEmployeeSalariesOverviewAsync(search, departmentId, cancellationToken);
        return Ok(ApiResponse<List<EmployeeSalaryOverviewDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงประวัติเงินเดือนของพนักงานรายบุคคล
    /// </summary>
    [HttpGet("employees/{employeeId:long}/history")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeSalaryDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<List<EmployeeSalaryDto>>>> GetEmployeeSalaryHistory(
        long employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetEmployeeSalaryHistoryAsync(employeeId, cancellationToken);
        return Ok(ApiResponse<List<EmployeeSalaryDto>>.Ok(result));
    }

    /// <summary>
    /// บันทึกปรับฐานเงินเดือนพนักงาน
    /// </summary>
    [HttpPost("employees/{employeeId:long}/adjust")]
    [ProducesResponseType(typeof(ApiResponse<EmployeeSalaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<EmployeeSalaryDto>>> AdjustEmployeeSalary(
        long employeeId,
        [FromBody] AdjustEmployeeSalaryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.AdjustEmployeeSalaryAsync(employeeId, request, cancellationToken);
        return Ok(ApiResponse<EmployeeSalaryDto>.Ok(result, "ปรับฐานเงินเดือนพนักงานสำเร็จ"));
    }

    #endregion

    #region Overview & Payroll Items

    /// <summary>
    /// ดึงข้อมูลภาพรวมแดชบอร์ดระบบเงินเดือน
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(ApiResponse<PayrollOverviewDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollOverviewDto>>> GetOverview(CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetPayrollOverviewAsync(cancellationToken);
        return Ok(ApiResponse<PayrollOverviewDto>.Ok(result));
    }

    /// <summary>
    /// ดึงรายการประเภทรายได้และรายหักสำหรับคำนวณเงินเดือน
    /// </summary>
    [HttpGet("items")]
    [ProducesResponseType(typeof(ApiResponse<List<PayrollItemDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<PayrollItemDto>>>> GetPayrollItems(
        [FromQuery] string? itemType,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetPayrollItemsAsync(itemType, cancellationToken);
        return Ok(ApiResponse<List<PayrollItemDto>>.Ok(result));
    }

    /// <summary>
    /// สร้างรายการประเภทรายได้หรือรายหักใหม่
    /// </summary>
    [HttpPost("items")]
    [ProducesResponseType(typeof(ApiResponse<PayrollItemDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<PayrollItemDto>>> CreatePayrollItem(
        [FromBody] CreatePayrollItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.CreatePayrollItemAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetPayrollItems), new { itemType = result.ItemType }, ApiResponse<PayrollItemDto>.Ok(result, "เพิ่มรายการสำเร็จ"));
    }

    /// <summary>
    /// แก้ไขข้อมูลรายการประเภทรายได้หรือรายหัก
    /// </summary>
    [HttpPut("items/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<PayrollItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollItemDto>>> UpdatePayrollItem(
        long id,
        [FromBody] UpdatePayrollItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.UpdatePayrollItemAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PayrollItemDto>.Ok(result, "แก้ไขรายการสำเร็จ"));
    }

    /// <summary>
    /// ลบรายการประเภทรายได้หรือรายหัก
    /// </summary>
    [HttpDelete("items/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> DeletePayrollItem(
        long id,
        CancellationToken cancellationToken)
    {
        await _salaryService.DeletePayrollItemAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null!, "ลบรายการสำเร็จ"));
    }

    #endregion

    #region Payroll Processing (Tab 4)

    /// <summary>
    /// ดึงรายการรอบเงินเดือนทั้งหมด
    /// </summary>
    [HttpGet("periods")]
    [ProducesResponseType(typeof(ApiResponse<List<PayrollPeriodDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<PayrollPeriodDto>>>> GetPayrollPeriods(CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetPayrollPeriodsAsync(cancellationToken);
        return Ok(ApiResponse<List<PayrollPeriodDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงข้อมูลรอบเงินเดือนตาม ID
    /// </summary>
    [HttpGet("periods/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> GetPayrollPeriodById(long id, CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetPayrollPeriodByIdAsync(id, cancellationToken);
        if (result == null)
            return NotFound(ApiResponse<object>.Fail("ไม่พบข้อมูลรอบเงินเดือน"));
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result));
    }

    /// <summary>
    /// ดึงรายการคำนวณเงินเดือนของพนักงานในรอบนั้นๆ
    /// </summary>
    [HttpGet("periods/{id:long}/payrolls")]
    [ProducesResponseType(typeof(ApiResponse<List<PayrollRecordDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<PayrollRecordDto>>>> GetPayrollsByPeriod(long id, CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetPayrollsByPeriodIdAsync(id, cancellationToken);
        return Ok(ApiResponse<List<PayrollRecordDto>>.Ok(result));
    }

    /// <summary>
    /// ดึงรายละเอียดรายได้/รายหักของพนักงาน (payroll_detail)
    /// </summary>
    [HttpGet("payrolls/{id:long}/details")]
    [ProducesResponseType(typeof(ApiResponse<List<PayrollDetailItemDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<PayrollDetailItemDto>>>> GetPayrollDetails(long id, CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetPayrollDetailsAsync(id, cancellationToken);
        return Ok(ApiResponse<List<PayrollDetailItemDto>>.Ok(result));
    }

    /// <summary>
    /// สร้างรอบเงินเดือนใหม่
    /// </summary>
    [HttpPost("periods")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> CreatePayrollPeriod(
        [FromBody] CreatePayrollPeriodRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.CreatePayrollPeriodAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetPayrollPeriodById), new { id = result.Id }, ApiResponse<PayrollPeriodDto>.Ok(result, "สร้างรอบเงินเดือนใหม่สำเร็จ"));
    }

    /// <summary>
    /// ประมวลผลคำนวณเงินเดือนของพนักงานทุกคนในรอบ
    /// </summary>
    [HttpPost("periods/{id:long}/calculate")]
    [ProducesResponseType(typeof(ApiResponse<List<PayrollRecordDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<PayrollRecordDto>>>> CalculatePayroll(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.CalculatePayrollForPeriodAsync(id, cancellationToken);
        return Ok(ApiResponse<List<PayrollRecordDto>>.Ok(result, "ประมวลผลคำนวณเงินเดือนสำเร็จ"));
    }

    /// <summary>
    /// อัปเดตสถานะของรอบเงินเดือน (ส่งอนุมัติ, บันทึกว่าจ่ายแล้ว, ปิดรอบ)
    /// </summary>
    [HttpPut("periods/{id:long}/status")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> UpdatePayrollPeriodStatus(
        long id,
        [FromBody] UpdatePeriodStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.UpdatePayrollPeriodStatusAsync(id, request.Status, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "อัปเดตสถานะรอบเงินเดือนสำเร็จ"));
    }

    /// <summary>
    /// ดึงข้อมูลสรุปการโอนเงินธนาคารประจำรอบ
    /// </summary>
    [HttpGet("periods/{id:long}/bank-transfer")]
    [ProducesResponseType(typeof(ApiResponse<BankTransferSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<BankTransferSummaryDto>>> GetBankTransferSummary(
        long id,
        [FromQuery] string? bankCode,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetBankTransferSummaryAsync(id, bankCode, cancellationToken);
        return Ok(ApiResponse<BankTransferSummaryDto>.Ok(result, "ดึงข้อมูลการโอนเงินธนาคารสำเร็จ"));
    }

    /// <summary>
    /// ดาวน์โหลดไฟล์โอนเงินธนาคาร (Text/CSV Format)
    /// </summary>
    [HttpGet("periods/{id:long}/bank-transfer-file")]
    public async Task<IActionResult> GenerateBankTransferFile(
        long id,
        [FromQuery] string bankCode = "004",
        CancellationToken cancellationToken = default)
    {
        var bytes = await _salaryService.GenerateBankTransferFileAsync(id, bankCode, cancellationToken);
        var filename = $"BankTransfer_Period_{id}_{bankCode}_{DateTime.Now:yyyyMMdd}.csv";
        return File(bytes, "text/csv", filename);
    }

    /// <summary>
    /// ดึงข้อมูลสรุปภาษี ภ.ง.ด.1 และ ประกันสังคม สปส. 1-10
    /// </summary>
    [HttpGet("periods/{id:long}/tax-sso-summary")]
    [ProducesResponseType(typeof(ApiResponse<TaxSsoSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<TaxSsoSummaryDto>>> GetTaxSsoSummary(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetTaxSsoSummaryAsync(id, cancellationToken);
        return Ok(ApiResponse<TaxSsoSummaryDto>.Ok(result, "ดึงข้อมูลสรุปภาษีและประกันสังคมสำเร็จ"));
    }

    /// <summary>
    /// ดึงรายการคำนวณโบนัสพนักงาน
    /// </summary>
    [HttpGet("bonuses")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeBonusDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeBonusDto>>>> GetEmployeeBonuses(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetEmployeeBonusesAsync(year, cancellationToken);
        return Ok(ApiResponse<List<EmployeeBonusDto>>.Ok(result, "ดึงข้อมูลโบนัสพนักงานสำเร็จ"));
    }

    /// <summary>
    /// สั่งคำนวณโบนัสประจำปี
    /// </summary>
    [HttpPost("bonuses/calculate")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeBonusDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeBonusDto>>>> CalculateEmployeeBonuses(
        [FromBody] CalculateBonusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.CalculateEmployeeBonusesAsync(request, cancellationToken);
        return Ok(ApiResponse<List<EmployeeBonusDto>>.Ok(result, "คำนวณโบนัสประจำปีสำเร็จ"));
    }

    /// <summary>
    /// บันทึกการจัดสรรโบนัสพนักงาน (กำหนดเองรายบุคคล หรือแบบตัวคูณ)
    /// </summary>
    [HttpPost("bonuses/save")]
    [ProducesResponseType(typeof(ApiResponse<List<EmployeeBonusDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<EmployeeBonusDto>>>> SaveEmployeeBonuses(
        [FromBody] SaveEmployeeBonusesRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.SaveEmployeeBonusesAsync(request, cancellationToken);
        return Ok(ApiResponse<List<EmployeeBonusDto>>.Ok(result, "บันทึกการจัดสรรโบนัสพนักงานสำเร็จ"));
    }

    #endregion

    #region Payment Workflow

    /// <summary>ตั้งค่าวิธีการจ่ายเงิน (BANK_BATCH / DIRECT_TRANSFER)</summary>
    [HttpPut("periods/{id:long}/payment-method")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> SetPaymentMethod(
        long id,
        [FromBody] SetPaymentMethodRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.SetPaymentMethodAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "ตั้งค่าวิธีการจ่ายเงินสำเร็จ"));
    }

    /// <summary>ดึงรายการโอนเงินพนักงานพร้อมสถานะ</summary>
    [HttpGet("periods/{id:long}/transfer-list")]
    [ProducesResponseType(typeof(ApiResponse<PayrollTransferListDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollTransferListDto>>> GetTransferList(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.GetTransferListAsync(id, cancellationToken);
        return Ok(ApiResponse<PayrollTransferListDto>.Ok(result));
    }

    /// <summary>Mark พนักงานรายบุคคลว่าโอนเงินแล้ว พร้อมแนบ Slip (DIRECT_TRANSFER)</summary>
    [HttpPost("periods/{periodId:long}/payrolls/{payrollId:long}/mark-transferred")]
    [ProducesResponseType(typeof(ApiResponse<PayrollTransferItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<PayrollTransferItemDto>>> MarkTransferred(
        long periodId,
        long payrollId,
        [FromBody] MarkTransferredRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.MarkTransferredAsync(periodId, payrollId, request, cancellationToken);
        return Ok(ApiResponse<PayrollTransferItemDto>.Ok(result, "บันทึกการโอนเงินสำเร็จ"));
    }

    /// <summary>CEO Confirm การจ่ายเงินทั้งหมด (DIRECT_TRANSFER) — เฉพาะ CEO เท่านั้น</summary>
    [HttpPost("periods/{id:long}/confirm-payment")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> ConfirmPayment(
        long id,
        [FromBody] ConfirmPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId == null)
            return Forbid();

        var result = await _salaryService.ConfirmPaymentAsync(id, request, employeeId.Value, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "Confirm การจ่ายเงินสำเร็จ รอบเงินเดือนเปลี่ยนเป็น PAID"));
    }

    /// <summary>ดาวน์โหลด Slip ของพนักงานรายบุคคล</summary>
    [HttpGet("payrolls/{payrollId:long}/slip")]
    public async Task<IActionResult> DownloadSlip(
        long payrollId,
        CancellationToken cancellationToken)
    {
        var slip = await _salaryService.GetPayrollSlipAsync(payrollId, cancellationToken);
        return File(slip.Data, slip.ContentType, slip.FileName);
    }

    /// <summary>สร้างไฟล์ธนาคาร และ Mark Period ว่าส่งไฟล์แล้ว (BANK_BATCH)</summary>
    [HttpPost("periods/{id:long}/generate-bank-file")]
    public async Task<IActionResult> GenerateBankFile(
        long id,
        [FromQuery] string? bankCode,
        CancellationToken cancellationToken)
    {
        var bytes = await _salaryService.GenerateAndMarkBankFileAsync(id, bankCode, cancellationToken);
        var filename = $"BankTransfer_Period_{id}_{bankCode ?? "ALL"}_{DateTime.Now:yyyyMMdd}.csv";
        return File(bytes, "text/csv", filename);
    }

    /// <summary>CEO Confirm ว่าธนาคารโอนเงินแล้ว (BANK_BATCH) — เฉพาะ CEO เท่านั้น</summary>
    [HttpPost("periods/{id:long}/confirm-bank-transfer")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> ConfirmBankTransfer(
        long id,
        [FromBody] ConfirmPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        if (employeeId == null)
            return Forbid();

        var result = await _salaryService.ConfirmBankTransferAsync(id, request, employeeId.Value, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "Confirm Bank Transfer สำเร็จ รอบเงินเดือนเปลี่ยนเป็น PAID"));
    }

    /// <summary>HR ส่งเรื่องให้ฝ่ายการเงิน/บัญชี ตรวจสอบ</summary>
    [HttpPost("periods/{id:long}/submit-to-finance")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> SubmitToFinance(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _salaryService.SubmitToFinanceAsync(id, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "ส่งเรื่องให้ฝ่ายการเงิน/บัญชีเรียบร้อยแล้ว"));
    }

    /// <summary>ฝ่ายการเงิน/บัญชี ตรวจสอบตัวเลขเรียบร้อยแล้ว ส่งเรื่องให้ผู้อนุมัติ</summary>
    [HttpPost("periods/{id:long}/verify-finance")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> VerifyByFinance(
        long id,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        var result = await _salaryService.VerifyByFinanceAsync(id, employeeId ?? 1, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "ฝ่ายการเงินตรวจสอบเรียบร้อยแล้ว ส่งเรื่องให้ผู้อนุมัติ"));
    }

    /// <summary>ฝ่ายการเงินอัปโหลดสลิป/ใบเสร็จโอนเงินรวมของธนาคาร และเปลี่ยนสถานะเป็น PAID</summary>
    [HttpPost("periods/{id:long}/upload-bank-receipt")]
    [ProducesResponseType(typeof(ApiResponse<PayrollPeriodDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PayrollPeriodDto>>> UploadBankReceipt(
        long id,
        [FromBody] UploadBankReceiptRequest request,
        CancellationToken cancellationToken)
    {
        var employeeId = GetCurrentEmployeeId();
        var result = await _salaryService.UploadBankReceiptAndMarkPaidAsync(id, request, employeeId ?? 1, cancellationToken);
        return Ok(ApiResponse<PayrollPeriodDto>.Ok(result, "บันทึกสลิปโอนเงินธนาคารและยืนยันรอบเงินเดือนสำเร็จ"));
    }

    /// <summary>ดาวน์โหลดสลิป/ใบเสร็จโอนเงินรวมของธนาคาร (สำหรับฝ่ายการเงิน)</summary>
    [HttpGet("periods/{id:long}/bank-receipt")]
    public async Task<IActionResult> DownloadBankReceipt(
        long id,
        CancellationToken cancellationToken)
    {
        var receipt = await _salaryService.GetBankReceiptAsync(id, cancellationToken);
        return File(receipt.Data, receipt.ContentType, receipt.FileName);
    }

    /// <summary>สร้างหรือดาวน์โหลดสลิปเงินเดือน E-Payslip PDF (พร้อมเข้ารหัสผ่าน) ของพนักงาน</summary>
    [HttpGet("payrolls/{id:long}/payslip-pdf")]
    public async Task<IActionResult> DownloadEmployeePayslip(
        long id,
        CancellationToken cancellationToken)
    {
        var (fileBytes, fileName) = await _payslipService.GetPayslipPdfAsync(id, cancellationToken);
        return File(fileBytes, "application/pdf", fileName);
    }

    #endregion

    // ===== HELPER: ดึง Employee ID ของ User ที่ Login อยู่ =====
    private long? GetCurrentEmployeeId()
    {
        var claim = User.FindFirst("employee_id") ?? User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && long.TryParse(claim.Value, out var id))
            return id;
        return null;
    }
}
