using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// บริการกลางสำหรับตรวจสอบและบังคับใช้ขอบเขตข้อมูล (Data Scope) ตามมาตรฐานระบบ
/// ลำดับขอบเขต: SELF (0) < TEAM (1) < DEPARTMENT (2) < DIVISION (3) < ORGANIZATION (4)
/// </summary>
public class DataScopeService : IDataScopeService
{
    private static readonly Dictionary<string, int> ScopeHierarchy = new(StringComparer.OrdinalIgnoreCase)
    {
        { "SELF", 0 },
        { "TEAM", 1 },
        { "DEPARTMENT", 2 },
        { "DIVISION", 3 },
        { "ORGANIZATION", 4 }
    };

    private readonly ICurrentUserService _currentUser;
    private readonly IHrmsDbContext _context;

    public DataScopeService(ICurrentUserService currentUser, IHrmsDbContext context)
    {
        _currentUser = currentUser;
        _context = context;
    }

    private bool IsAdmin => _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER");

    public string GetScope(string permissionCode)
    {
        if (IsAdmin) return "ORGANIZATION";
        return _currentUser.GetDataScope(permissionCode);
    }

    public bool HasScope(string permissionCode, string minScope)
    {
        if (IsAdmin) return true;

        string userScope = GetScope(permissionCode);
        int userRank = ScopeHierarchy.TryGetValue(userScope, out int uRank) ? uRank : 0;
        int minRank = ScopeHierarchy.TryGetValue(minScope, out int mRank) ? mRank : 0;

        return userRank >= minRank;
    }

    public async Task<bool> CanAccessEmployeeAsync(long targetEmployeeId, string permissionCode, CancellationToken ct = default)
    {
        if (IsAdmin) return true;

        // หากเป็นข้อมูลของตัวเอง เข้าถึงได้เสมอ
        if (_currentUser.EmployeeId.HasValue && _currentUser.EmployeeId.Value == targetEmployeeId)
        {
            return true;
        }

        string scope = GetScope(permissionCode);
        if (string.Equals(scope, "ORGANIZATION", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(scope, "DIVISION", StringComparison.OrdinalIgnoreCase))
        {
            long? myDivId = _currentUser.DivisionId;
            if (!myDivId.HasValue) return false;

            return await _context.Employees
                .AsNoTracking()
                .AnyAsync(e => e.Id == targetEmployeeId && e.Assignments.Any(a => a.DivisionId == myDivId.Value && a.IsCurrent), ct);
        }

        if (string.Equals(scope, "DEPARTMENT", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(scope, "TEAM", StringComparison.OrdinalIgnoreCase))
        {
            long? myDeptId = _currentUser.DepartmentId;
            if (!myDeptId.HasValue) return false;

            return await _context.Employees
                .AsNoTracking()
                .AnyAsync(e => e.Id == targetEmployeeId && e.Assignments.Any(a => a.DepartmentId == myDeptId.Value && a.IsCurrent), ct);
        }

        // SELF scope แต่ targetEmployeeId ไม่ใช่ตัวเอง
        return false;
    }

    public async Task<List<long>?> GetAccessibleEmployeeIdsAsync(string permissionCode, CancellationToken ct = default)
    {
        if (IsAdmin) return null; // null = ไม่ต้องกรอง เห็นทุกคน

        string scope = GetScope(permissionCode);
        if (string.Equals(scope, "ORGANIZATION", StringComparison.OrdinalIgnoreCase))
        {
            return null; // เห็นทุกคน
        }

        if (string.Equals(scope, "DIVISION", StringComparison.OrdinalIgnoreCase))
        {
            long? myDivId = _currentUser.DivisionId;
            if (!myDivId.HasValue)
            {
                return _currentUser.EmployeeId.HasValue ? new List<long> { _currentUser.EmployeeId.Value } : new List<long>();
            }

            return await _context.Employees
                .AsNoTracking()
                .Where(e => e.Assignments.Any(a => a.DivisionId == myDivId.Value && a.IsCurrent))
                .Select(e => e.Id)
                .ToListAsync(ct);
        }

        if (string.Equals(scope, "DEPARTMENT", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(scope, "TEAM", StringComparison.OrdinalIgnoreCase))
        {
            long? myDeptId = _currentUser.DepartmentId;
            if (!myDeptId.HasValue)
            {
                return _currentUser.EmployeeId.HasValue ? new List<long> { _currentUser.EmployeeId.Value } : new List<long>();
            }

            return await _context.Employees
                .AsNoTracking()
                .Where(e => e.Assignments.Any(a => a.DepartmentId == myDeptId.Value && a.IsCurrent))
                .Select(e => e.Id)
                .ToListAsync(ct);
        }

        // SELF
        return _currentUser.EmployeeId.HasValue
            ? new List<long> { _currentUser.EmployeeId.Value }
            : new List<long>();
    }

    public async Task<long?> ResolveDepartmentFilterAsync(long? requestedDeptId, string permissionCode, CancellationToken ct = default)
    {
        if (IsAdmin) return requestedDeptId;

        string scope = GetScope(permissionCode);
        if (string.Equals(scope, "ORGANIZATION", StringComparison.OrdinalIgnoreCase))
        {
            return requestedDeptId;
        }

        long? myDeptId = _currentUser.DepartmentId;

        if (string.Equals(scope, "DEPARTMENT", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(scope, "TEAM", StringComparison.OrdinalIgnoreCase))
        {
            if (requestedDeptId.HasValue && myDeptId.HasValue && requestedDeptId.Value != myDeptId.Value)
            {
                throw new ForbiddenException("คุณไม่มีสิทธิ์เข้าถึงข้อมูลของแผนกอื่น");
            }
            return myDeptId;
        }

        if (string.Equals(scope, "DIVISION", StringComparison.OrdinalIgnoreCase))
        {
            long? myDivId = _currentUser.DivisionId;
            if (requestedDeptId.HasValue && myDivId.HasValue)
            {
                bool inDivision = await _context.Departments
                    .AsNoTracking()
                    .AnyAsync(d => d.Id == requestedDeptId.Value && d.DivisionId == myDivId.Value, ct);

                if (!inDivision)
                {
                    throw new ForbiddenException("แผนกที่ระบุอยู่นอกฝ่ายที่คุณรับผิดชอบ");
                }
                return requestedDeptId;
            }
            return requestedDeptId;
        }

        return myDeptId;
    }
}
