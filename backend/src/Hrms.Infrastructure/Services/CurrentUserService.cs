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

    public long? DepartmentId
    {
        get
        {
            string? deptId = User?.FindFirstValue("department_id");
            return long.TryParse(deptId, out long id) && id > 0 ? id : null;
        }
    }

    public long? DivisionId
    {
        get
        {
            string? divId = User?.FindFirstValue("division_id");
            return long.TryParse(divId, out long id) && id > 0 ? id : null;
        }
    }

    public long? TeamId
    {
        get
        {
            string? teamId = User?.FindFirstValue("team_id");
            return long.TryParse(teamId, out long id) && id > 0 ? id : null;
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
        // ยกเว้นเฉพาะการจัดการบทบาทและสิทธิ์ (SETTINGS_ROLES) สำหรับ ADMIN / SYSTEM_SUPER เพื่อป้องกัน Lockout
        if ((HasRole("ADMIN") || HasRole("SYSTEM_SUPER")) &&
            permission.StartsWith("SETTINGS_ROLES", StringComparison.OrdinalIgnoreCase))
            return true;

        var perms = User?.FindAll("permission").Select(p => p.Value).ToList();
        if (perms == null || perms.Count == 0) return false;

        if (perms.Any(p => string.Equals(p, permission, StringComparison.OrdinalIgnoreCase)))
            return true;

        // สิทธิ์ *_EDIT จากตาราง Matrix ครอบคลุม *_APPROVE ของโมดูลเดียวกัน
        if (permission.EndsWith("_APPROVE", StringComparison.OrdinalIgnoreCase))
        {
            var editEquivalent = $"{permission[..^8]}_EDIT";
            if (perms.Any(p => string.Equals(p, editEquivalent, StringComparison.OrdinalIgnoreCase)))
                return true;
        }

        // สิทธิ์ *_EXPORT ให้ใช้ *_VIEW ของโมดูลเดียวกัน
        if (permission.EndsWith("_EXPORT", StringComparison.OrdinalIgnoreCase))
        {
            var viewEquivalent = $"{permission[..^7]}_VIEW";
            if (perms.Any(p => string.Equals(p, viewEquivalent, StringComparison.OrdinalIgnoreCase)))
                return true;
        }

        // Alias mapping สำหรับพนักงาน (EMP_* <-> EMP_PROFILE_*)
        if (string.Equals(permission, "EMP_VIEW", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "EMP_PROFILE_VIEW", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (string.Equals(permission, "EMP_PROFILE_VIEW", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "EMP_VIEW", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (string.Equals(permission, "EMP_CREATE", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "EMP_PROFILE_CREATE", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (string.Equals(permission, "EMP_EDIT", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "EMP_PROFILE_EDIT", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (string.Equals(permission, "EMP_DELETE", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "EMP_PROFILE_DELETE", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (string.Equals(permission, "EMP_MANAGE", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "EMP_PROFILE_EDIT", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(p, "EMP_PROFILE_CREATE", StringComparison.OrdinalIgnoreCase)))
            return true;

        // Alias สำหรับรายงานและเงินเดือนภาพรวม
        if ((string.Equals(permission, "REPORT_VIEW", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(permission, "REPORT_EXPORT", StringComparison.OrdinalIgnoreCase)) &&
            perms.Any(p => p.StartsWith("REPORT_", StringComparison.OrdinalIgnoreCase) && p.EndsWith("_VIEW", StringComparison.OrdinalIgnoreCase)))
            return true;

        if ((string.Equals(permission, "PAYROLL_VIEW", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(permission, "PAYROLL_EXPORT", StringComparison.OrdinalIgnoreCase)) &&
            perms.Any(p => p.StartsWith("PAYROLL_", StringComparison.OrdinalIgnoreCase) && p.EndsWith("_VIEW", StringComparison.OrdinalIgnoreCase)))
            return true;

        if (string.Equals(permission, "PAYROLL_TAX_MANAGE", StringComparison.OrdinalIgnoreCase) &&
            perms.Any(p => string.Equals(p, "PAYROLL_TAX_EDIT", StringComparison.OrdinalIgnoreCase)))
            return true;

        return false;
    }

    private static readonly Dictionary<string, int> ScopeHierarchy = new(StringComparer.OrdinalIgnoreCase)
    {
        { "SELF", 0 },
        { "TEAM", 1 },
        { "DEPARTMENT", 2 },
        { "DIVISION", 3 },
        { "ORGANIZATION", 4 }
    };

    public string GetDataScope(string permission)
    {
        var permsToCheck = new List<string> { permission };
        if (permission.EndsWith("_APPROVE", StringComparison.OrdinalIgnoreCase))
        {
            var prefix = permission[..^8];
            permsToCheck.Add($"{prefix}_EDIT");
            permsToCheck.Add($"{prefix}_VIEW");
        }
        else if (permission.EndsWith("_EDIT", StringComparison.OrdinalIgnoreCase))
        {
            var prefix = permission[..^5];
            permsToCheck.Add($"{prefix}_VIEW");
        }
        else if (permission.EndsWith("_CREATE", StringComparison.OrdinalIgnoreCase))
        {
            var prefix = permission[..^7];
            permsToCheck.Add($"{prefix}_VIEW");
        }

        if (string.Equals(permission, "EMP_VIEW", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(permission, "EMP_PROFILE_VIEW", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("EMP_PROFILE_VIEW");
            permsToCheck.Add("EMP_VIEW");
        }
        else if (string.Equals(permission, "EMP_EDIT", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "EMP_MANAGE", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "EMP_PROFILE_EDIT", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("EMP_PROFILE_EDIT");
            permsToCheck.Add("EMP_PROFILE_VIEW");
            permsToCheck.Add("EMP_EDIT");
            permsToCheck.Add("EMP_MANAGE");
        }
        else if (string.Equals(permission, "TIME_DAILY_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "ATTENDANCE_DAILY_VIEW", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("TIME_DAILY_VIEW");
            permsToCheck.Add("ATTENDANCE_DAILY_VIEW");
        }
        else if (string.Equals(permission, "LEAVE_REQUEST_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "APPROVAL_LEAVE_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "APPROVAL_LEAVE", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("APPROVAL_LEAVE_VIEW");
            permsToCheck.Add("LEAVE_REQUEST_VIEW");
        }
        else if (string.Equals(permission, "LEAVE_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "LEAVE_BALANCE_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "LEAVE_BALANCE", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("LEAVE_BALANCE_VIEW");
            permsToCheck.Add("LEAVE_VIEW");
        }
        else if (string.Equals(permission, "BENEFIT_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "BENEFIT_BALANCE_VIEW", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("BENEFIT_VIEW");
            permsToCheck.Add("BENEFIT_BALANCE_VIEW");
        }
        else if (string.Equals(permission, "ORG_CHART_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "ORG_CHART", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("ORG_CHART_VIEW");
            permsToCheck.Add("ORG_CHART");
        }
        else if (string.Equals(permission, "REPORT_HEADCOUNT_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "REPORT_HEADCOUNT", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("REPORT_HEADCOUNT_VIEW");
            permsToCheck.Add("REPORT_HEADCOUNT");
        }
        else if (string.Equals(permission, "REPORT_ATT_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "REPORT_ATT", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("REPORT_ATT_VIEW");
            permsToCheck.Add("REPORT_ATT");
        }
        else if (string.Equals(permission, "REPORT_LEAVE_VIEW", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(permission, "REPORT_LEAVE", StringComparison.OrdinalIgnoreCase))
        {
            permsToCheck.Add("REPORT_LEAVE_VIEW");
            permsToCheck.Add("REPORT_LEAVE");
        }
        else if (permission.StartsWith("PAYROLL", StringComparison.OrdinalIgnoreCase) ||
                 permission.StartsWith("APPROVAL_PAYROLL", StringComparison.OrdinalIgnoreCase))
        {
            return "ORGANIZATION";
        }

        var scopes = new List<string>();
        foreach (var perm in permsToCheck)
        {
            var found = User?.FindAll($"scope:{perm}").Select(c => c.Value);
            if (found != null)
            {
                scopes.AddRange(found);
            }
        }

        if (scopes.Count == 0)
        {
            if (HasRole("ADMIN") || HasRole("SYSTEM_SUPER"))
                return "ORGANIZATION";
            return "SELF";
        }

        // เลือก scope ที่มีลำดับสูงสุด (กว้างสุด)
        return scopes
            .OrderByDescending(s => ScopeHierarchy.TryGetValue(s, out int rank) ? rank : -1)
            .First();
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
