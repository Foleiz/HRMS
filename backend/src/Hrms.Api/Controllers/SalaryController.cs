using Hrms.Application.Common.Models;
using Hrms.Application.Features.Payroll.DTOs;
using Hrms.Application.Features.Payroll.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/salary")]
[Authorize]
public class SalaryController : ControllerBase
{
    private readonly ISalaryService _salaryService;

    public SalaryController(ISalaryService salaryService)
    {
        _salaryService = salaryService;
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
}
