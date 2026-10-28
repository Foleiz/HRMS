using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Employees.Services;
using Hrms.Application.Features.Leave.Services;
using Hrms.Application.Features.Shift.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// รหัสแนะนำ (ระบบแนะนำ แก้ได้) — หน้าฟอร์มดึงไปใส่ช่องรหัสตอนเพิ่มข้อมูล ผู้ใช้พิมพ์แก้เองได้
/// ถ้าส่งรหัสว่างตอนบันทึก ระบบยังสร้างให้อัตโนมัติเหมือนเดิม
/// </summary>
[ApiController]
[Route("api/codes")]
[Authorize]
public class CodesController : ControllerBase
{
    private readonly IHrmsDbContext _db;
    private readonly IEmployeeService _employees;
    private readonly ILeaveTypeService _leaveTypes;
    private readonly IShiftService _shifts;

    public CodesController(IHrmsDbContext db, IEmployeeService employees, ILeaveTypeService leaveTypes, IShiftService shifts)
    {
        _db = db;
        _employees = employees;
        _leaveTypes = leaveTypes;
        _shifts = shifts;
    }

    /// <param name="type">employee | division | department | team | position | level | employee-type | leave-type | shift | certificate-type | gender</param>
    [HttpGet("next")]
    public async Task<ActionResult<ApiResponse<string>>> GetNext([FromQuery] string type, CancellationToken cancellationToken)
    {
        string? code = (type ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "employee" => await _employees.GetNextEmployeeCodeAsync(cancellationToken),
            "division" => await CodeGenerator.NextAsync(_db.Divisions.Select(d => d.DivisionCode), "DIV", 3, cancellationToken),
            "department" => await CodeGenerator.NextAsync(_db.Departments.Select(d => d.DepartmentCode), "DEP", 3, cancellationToken),
            "team" => await CodeGenerator.NextAsync(_db.Teams.Select(t => t.TeamCode), "TEAM", 3, cancellationToken),
            "position" => await CodeGenerator.NextAsync(_db.Positions.Select(p => p.PositionCode), "POS", 3, cancellationToken),
            "level" => await CodeGenerator.NextAsync(_db.EmployeeLevels.Select(l => l.LevelCode), "LVL", 2, cancellationToken),
            "employee-type" => await CodeGenerator.NextAsync(_db.EmployeeTypes.Select(t => t.TypeCode), "ET", 3, cancellationToken),
            "leave-type" => await _leaveTypes.GetNextLeaveCodeAsync(cancellationToken),
            "shift" => await _shifts.GetNextShiftCodeAsync(),
            "certificate-type" => await CodeGenerator.NextAsync(_db.CertificateTypes.Select(c => c.CertificateCode), "CERT_", 3, cancellationToken),
            "gender" => await CodeGenerator.NextAsync(_db.GenderTypes.Select(g => g.GenderCode), "G", 2, cancellationToken),
            _ => null
        };

        if (code == null)
            return BadRequest(ApiResponse<string>.Fail($"ไม่รู้จักประเภทรหัส '{type}'"));
        return Ok(ApiResponse<string>.Ok(code));
    }
}
