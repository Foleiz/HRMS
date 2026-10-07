using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Hrms.Api.Filters;

/// <summary>
/// แอตทริบิวต์สำหรับตรวจสอบสิทธิ์การเข้าถึง (Permission-based Authorization)
/// พร้อมรองรับการตรวจสอบระดับขอบเขตข้อมูลขั้นต่ำ (Min Scope: SELF, TEAM, DEPARTMENT, DIVISION, ORGANIZATION)
/// ผู้ใช้งานระดับ ADMIN หรือ SYSTEM_SUPER จะได้รับสิทธิ์ผ่านโดยอัตโนมัติ (Bypass)
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class RequirePermissionAttribute : TypeFilterAttribute
{
    public RequirePermissionAttribute(string permissionCode, string? minScope = null)
        : base(typeof(RequirePermissionFilter))
    {
        Arguments = new object[] { permissionCode, minScope ?? string.Empty };
    }
}

public class RequirePermissionFilter : IAsyncActionFilter
{
    private readonly string _permissionCode;
    private readonly string? _minScope;
    private readonly ICurrentUserService _currentUser;
    private readonly IDataScopeService _dataScope;

    public RequirePermissionFilter(
        string permissionCode,
        string? minScope,
        ICurrentUserService currentUser,
        IDataScopeService dataScope)
    {
        _permissionCode = permissionCode;
        _minScope = minScope;
        _currentUser = currentUser;
        _dataScope = dataScope;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 1. ตรวจสอบว่าเข้าสู่ระบบหรือไม่
        if (!_currentUser.UserId.HasValue)
        {
            context.Result = new ObjectResult(ApiResponse<object>.Fail("กรุณาเข้าสู่ระบบก่อนดำเนินการ"))
            {
                StatusCode = StatusCodes.Status401Unauthorized
            };
            return;
        }

        // 2. Admin และ Super Admin ผ่านได้เสมอ
        if (_currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER"))
        {
            await next();
            return;
        }

        // 3. ตรวจสอบสิทธิ์ฟังก์ชัน (Permission Code รองรับหลายสิทธิ์คั่นด้วยเครื่องหมายจุลภาคหรือไปป์)
        var codes = _permissionCode.Split(new[] { ',', '|' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var matchedCodes = codes.Where(c =>
            _currentUser.HasPermission(c)
            || (!c.Contains('_') && _currentUser.HasPermission($"{c}_VIEW"))
            || (c.EndsWith("_VIEW") && _currentUser.HasPermission(c[..^5]))
        ).ToList();

        if (matchedCodes.Count == 0)
        {
            var isPrivileged = _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER");
            var errorMsg = isPrivileged
                ? $"คุณไม่มีสิทธิ์ในการดำเนินการนี้ (ต้องการสิทธิ์: {_permissionCode})"
                : "คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน";
            context.Result = new ObjectResult(ApiResponse<object>.Fail(errorMsg))
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        // 4. ตรวจสอบขอบเขตข้อมูลขั้นต่ำ หากระบุไว้ (ต้องมีอย่างน้อยหนึ่งสิทธิ์ที่ตรงกับขอบเขตขั้นต่ำ)
        if (!string.IsNullOrWhiteSpace(_minScope))
        {
            bool hasScope = matchedCodes.Any(c => _dataScope.HasScope(c, _minScope));
            if (!hasScope)
            {
                var isPrivileged = _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER");
                var errorMsg = isPrivileged
                    ? $"ขอบเขตข้อมูลของคุณไม่เพียงพอสำหรับการดำเนินการนี้ (ต้องการระดับ: {_minScope})"
                    : "ขอบเขตข้อมูลของคุณไม่เพียงพอสำหรับการดำเนินการนี้ กรุณาติดต่อผู้ดูแลระบบ";
                context.Result = new ObjectResult(ApiResponse<object>.Fail(errorMsg))
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }
        }

        await next();
    }
}
