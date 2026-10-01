using System.Reflection;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Hrms.Api.Filters;

/// <summary>
/// แอตทริบิวต์สำหรับอนุญาตกรณีเป็นข้อมูลของตนเอง (Self)
/// หรือหากเป็นข้อมูลของพนักงานคนอื่น ต้องมีสิทธิ์ (Permission) และอยู่ในขอบเขตข้อมูล (Data Scope) ที่ถูกต้อง
/// ป้องกันช่องโหว่ IDOR (Insecure Direct Object Reference)
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true, Inherited = true)]
public class SelfOrPermissionAttribute : TypeFilterAttribute
{
    public SelfOrPermissionAttribute(string paramName, string permissionCode, string? minScope = null)
        : base(typeof(SelfOrPermissionFilter))
    {
        Arguments = new object[] { paramName, permissionCode, minScope ?? string.Empty };
    }
}

public class SelfOrPermissionFilter : IAsyncActionFilter
{
    private readonly string _paramName;
    private readonly string _permissionCode;
    private readonly string? _minScope;
    private readonly ICurrentUserService _currentUser;
    private readonly IDataScopeService _dataScope;

    public SelfOrPermissionFilter(
        string paramName,
        string permissionCode,
        string? minScope,
        ICurrentUserService currentUser,
        IDataScopeService dataScope)
    {
        _paramName = paramName;
        _permissionCode = permissionCode;
        _minScope = minScope;
        _currentUser = currentUser;
        _dataScope = dataScope;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!_currentUser.UserId.HasValue)
        {
            context.Result = new ObjectResult(ApiResponse<object>.Fail("กรุณาเข้าสู่ระบบก่อนดำเนินการ"))
            {
                StatusCode = StatusCodes.Status401Unauthorized
            };
            return;
        }

        // 1. Admin หรือ Super Admin ผ่านได้เสมอ
        if (_currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER"))
        {
            await next();
            return;
        }

        // 2. ดึงค่า Employee ID เป้าหมายจาก Parameter
        long? targetEmployeeId = ExtractTargetEmployeeId(context);

        // หากไม่มีการระบุ employeeId มาใน request (อาจเป็น optional param สำหรับ self-service)
        // ถือว่าเป็นข้อมูลของตนเองและให้ controller ดำเนินการต่อ
        if (!targetEmployeeId.HasValue)
        {
            await next();
            return;
        }

        // 3. หากเป็นข้อมูลของตนเอง อนุญาตทันที (Self Access)
        if (_currentUser.EmployeeId.HasValue && _currentUser.EmployeeId.Value == targetEmployeeId.Value)
        {
            await next();
            return;
        }

        // 4. หากไม่ใช่ของตนเอง ต้องมี Permission ที่กำหนด
        bool hasPerm = _currentUser.HasPermission(_permissionCode)
            || (!_permissionCode.Contains('_') && _currentUser.HasPermission($"{_permissionCode}_VIEW"))
            || (_permissionCode.EndsWith("_VIEW") && _currentUser.HasPermission(_permissionCode[..^5]));

        if (!hasPerm)
        {
            context.Result = new ObjectResult(ApiResponse<object>.Fail($"คุณไม่มีสิทธิ์เข้าถึงข้อมูลของพนักงานท่านนี้ (ต้องการสิทธิ์: {_permissionCode})"))
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        // 5. ตรวจสอบขอบเขตข้อมูลขั้นต่ำ หากระบุ
        if (!string.IsNullOrWhiteSpace(_minScope))
        {
            if (!_dataScope.HasScope(_permissionCode, _minScope))
            {
                context.Result = new ObjectResult(ApiResponse<object>.Fail($"ขอบเขตข้อมูลของคุณไม่เพียงพอสำหรับการเข้าถึงข้อมูลพนักงานท่านนี้ (ต้องการระดับ: {_minScope})"))
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }
        }

        // 6. ตรวจสอบว่าพนักงานเป้าหมายอยู่ใน Data Scope ของผู้ใช้หรือไม่
        bool canAccess = await _dataScope.CanAccessEmployeeAsync(
            targetEmployeeId.Value,
            _permissionCode,
            context.HttpContext.RequestAborted);

        if (!canAccess)
        {
            context.Result = new ObjectResult(ApiResponse<object>.Fail("คุณไม่มีสิทธิ์เข้าถึงข้อมูลของพนักงานท่านนี้ เนื่องจากอยู่นอกขอบเขตสายการบังคับบัญชาหรือฝ่ายที่ได้รับมอบหมาย"))
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }

    private long? ExtractTargetEmployeeId(ActionExecutingContext context)
    {
        // 1. ตรวจสอบใน Action Arguments
        foreach (var kvp in context.ActionArguments)
        {
            if (string.Equals(kvp.Key, _paramName, StringComparison.OrdinalIgnoreCase))
            {
                if (kvp.Value is long l) return l;
                if (kvp.Value is int i) return i;
                if (kvp.Value != null && long.TryParse(kvp.Value.ToString(), out var parsed)) return parsed;
            }
            else if (kvp.Value != null && !kvp.Value.GetType().IsPrimitive && kvp.Value.GetType() != typeof(string))
            {
                // ตรวจสอบใน DTO Object
                var prop = kvp.Value.GetType().GetProperty(_paramName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
                           ?? kvp.Value.GetType().GetProperty("EmployeeId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

                if (prop != null)
                {
                    var propVal = prop.GetValue(kvp.Value);
                    if (propVal is long pl) return pl;
                    if (propVal is int pi) return pi;
                    if (propVal != null && long.TryParse(propVal.ToString(), out var pParsed)) return pParsed;
                }
            }
        }

        // 2. ตรวจสอบใน Route Values
        if (context.RouteData.Values.TryGetValue(_paramName, out var routeVal) && routeVal != null)
        {
            if (long.TryParse(routeVal.ToString(), out var parsedRoute)) return parsedRoute;
        }

        // 3. ตรวจสอบใน Query String
        if (context.HttpContext.Request.Query.TryGetValue(_paramName, out var queryVal) && !string.IsNullOrWhiteSpace(queryVal))
        {
            if (long.TryParse(queryVal.ToString(), out var parsedQuery)) return parsedQuery;
        }

        return null;
    }
}
