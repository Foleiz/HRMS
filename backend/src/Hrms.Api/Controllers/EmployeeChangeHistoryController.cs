using Hrms.Api.Filters;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Employees.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>ประวัติการเปลี่ยนแปลงข้อมูลพนักงาน</summary>
[ApiController]
[Authorize]
public class EmployeeChangeHistoryController : ControllerBase
{
    private readonly IEmployeeChangeHistoryService _service;

    public EmployeeChangeHistoryController(IEmployeeChangeHistoryService service)
    {
        _service = service;
    }

    [HttpGet("api/employees/{employeeId:long}/change-history")]
    [SelfOrPermission("employeeId", "EMP_HISTORY_VIEW")]
    public async Task<ActionResult<ApiResponse<List<EmployeeChangeHistoryEntry>>>> Get(long employeeId, [FromQuery] int limit = 300, CancellationToken cancellationToken = default)
    {
        var result = await _service.GetAsync(employeeId, limit, cancellationToken);
        return Ok(ApiResponse<List<EmployeeChangeHistoryEntry>>.Ok(result, "ดึงประวัติการเปลี่ยนแปลงสำเร็จ"));
    }
}
