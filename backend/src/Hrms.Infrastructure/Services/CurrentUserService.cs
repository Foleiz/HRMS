using System.Security.Claims;
using Hrms.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// ดึงข้อมูลตัวตนและสิทธิ์ของผู้ใช้งานปัจจุบันจาก Claims ใน HttpContext (JWT Token)
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public long? UserId
    {
        get
        {
            string? sub = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub");
            return long.TryParse(sub, out long id) ? id : null;
        }
    }

    public string? Username => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("unique_name");

    public long? EmployeeId
    {
        get
        {
            string? empId = User?.FindFirstValue("employee_id");
            return long.TryParse(empId, out long id) ? id : null;
        }
    }

    public List<string> Roles => User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool HasRole(string role)
    {
        return Roles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
    }

    public bool HasPermission(string permission)
    {
        // หากเป็น ADMIN ถือว่ามีสิทธิ์ทุกอย่าง (Superuser)
        if (HasRole("ADMIN")) return true;

        return User?.FindAll("permission").Any(p => string.Equals(p.Value, permission, StringComparison.OrdinalIgnoreCase)) ?? false;
    }

    public string GetDataScope(string permission)
    {
        // หากเป็น ADMIN ให้ Scope สูงสุดคือทั้งบริษัท
        if (HasRole("ADMIN")) return "ORGANIZATION";

        string? scope = User?.FindFirstValue($"scope:{permission}");
        return scope ?? "SELF";
    }
}
