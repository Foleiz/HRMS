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
            string? sub = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub") ?? User?.FindFirstValue("nameid");
            return long.TryParse(sub, out long id) ? id : null;
        }
    }

    public string? Username => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("unique_name");

    public long? EmployeeId
    {
        get
        {
            string? empId = User?.FindFirstValue("employee_id") ?? User?.FindFirstValue("employeeId");
            return long.TryParse(empId, out long id) ? id : null;
        }
    }

    public List<string> Roles => (User?.FindAll(ClaimTypes.Role) ?? Enumerable.Empty<Claim>())
        .Concat(User?.FindAll("role") ?? Enumerable.Empty<Claim>())
        .Select(c => c.Value)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();


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

    public string? IpAddress
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context == null) return null;

            string? ip = null;

            // ตรวจสอบ X-Forwarded-For จาก Load Balancer / Reverse Proxy
            if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded) && !string.IsNullOrWhiteSpace(forwarded))
            {
                ip = forwarded.ToString().Split(',')[0].Trim();
            }
            else if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
            {
                ip = realIp.ToString().Trim();
            }
            else
            {
                ip = context.Connection.RemoteIpAddress?.ToString();
            }

            if (string.IsNullOrWhiteSpace(ip)) return null;

            // ตัด Port ออกหากมี (เช่น 127.0.0.1:51234)
            if (ip.Contains(':') && !ip.Contains("::") && ip.IndexOf(':') == ip.LastIndexOf(':'))
            {
                ip = ip.Split(':')[0];
            }

            return ip;
        }
    }

    public string? UserAgent
    {
        get
        {
            var ua = _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
            return string.IsNullOrWhiteSpace(ua) ? null : ua;
        }
    }
}
