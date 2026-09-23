using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Settings.Services;

public class RoleService : IRoleService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    private record ModuleDefinition(
        string Code,
        string Name,
        string Prefix,
        string CategoryCode,
        string CategoryName,
        string ParentPermissionPrefix);

    // รายการระบบงานและเมนูย่อยมาตรฐาน 22 เมนูย่อย ครอบคลุม 7 หมวดหมู่หลัก
    private static readonly List<ModuleDefinition> StandardModules = new()
    {
        // 1. ข้อมูลพนักงาน (EMPLOYEE)
        new("EMP_PROFILE", "ทะเบียนประวัติพนักงาน", "EMP_PROFILE", "EMPLOYEE", "ข้อมูลพนักงาน", "EMP"),
        new("EMP_CONTRACT", "สัญญาจ้างงาน", "EMP_CONTRACT", "EMPLOYEE", "ข้อมูลพนักงาน", "EMP"),
        new("EMP_TRANSFER", "การโอนย้าย / ปรับตำแหน่ง", "EMP_TRANSFER", "EMPLOYEE", "ข้อมูลพนักงาน", "EMP"),
        new("EMP_TYPE", "ประเภทพนักงาน", "EMP_TYPE", "EMPLOYEE", "ข้อมูลพนักงาน", "EMP"),

        // 2. การเข้างาน / บันทึกเวลา (ATTENDANCE)
        new("TIME_DAILY", "ตรวจบันทึกเวลาประจำวัน", "TIME_DAILY", "ATTENDANCE", "การเข้างาน / บันทึกเวลา", "TIME"),
        new("TIME_SCHEDULE", "ตารางกะและการจัดกะการทำงาน", "TIME_SCHEDULE", "ATTENDANCE", "การเข้างาน / บันทึกเวลา", "TIME"),
        new("TIME_IMPORT", "นำเข้าเวลาสแกนนิ้ว / ไฟล์เวลา", "TIME_IMPORT", "ATTENDANCE", "การเข้างาน / บันทึกเวลา", "TIME"),

        // 3. การจัดการวันลา (LEAVE)
        new("LEAVE_BALANCE", "สิทธิ์วันลาคงเหลือ & ธุรกรรมวันลา", "LEAVE_BALANCE", "LEAVE", "การจัดการวันลา", "LEAVE"),
        new("LEAVE_TYPE", "ประเภทการลา", "LEAVE_TYPE", "LEAVE", "การจัดการวันลา", "LEAVE"),
        new("LEAVE_POLICY", "นโยบายและเงื่อนไขการลา", "LEAVE_POLICY", "LEAVE", "การจัดการวันลา", "LEAVE"),

        // 4. การจัดการเงินเดือน / รายได้ (PAYROLL)
        new("PAYROLL_CALC", "ประมวลผลเงินเดือน / ปิดงวด", "PAYROLL_CALC", "PAYROLL", "การจัดการเงินเดือน / รายได้", "PAYROLL"),
        new("PAYROLL_SLIP", "สลิปเงินเดือนพนักงาน (Payslip)", "PAYROLL_SLIP", "PAYROLL", "การจัดการเงินเดือน / รายได้", "PAYROLL"),
        new("PAYROLL_TAX", "สรุปภาษีและประกันสังคม", "PAYROLL_TAX", "PAYROLL", "การจัดการเงินเดือน / รายได้", "PAYROLL"),

        // 5. โครงสร้างองค์กร (ORGANIZATION)
        new("ORG_STRUCT", "ฝ่ายและแผนก", "ORG_STRUCT", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        new("ORG_POS", "ตำแหน่งและระดับงาน", "ORG_POS", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        new("ORG_BENEFIT", "สวัสดิการพนักงาน", "ORG_BENEFIT", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        new("ORG_COMP", "ข้อมูลบริษัทและสาขา", "ORG_COMP", "ORGANIZATION", "โครงสร้างองค์กร", "ORG"),

        // 6. การตั้งค่าระบบ (SETTINGS)
        new("SETTINGS_USERS", "บัญชีผู้ใช้งาน", "SETTINGS_USERS", "SETTINGS", "การตั้งค่าระบบ", "SETTINGS"),
        new("SETTINGS_ROLES", "บทบาทและสิทธิ์", "SETTINGS_ROLES", "SETTINGS", "การตั้งค่าระบบ", "SETTINGS"),
        new("SETTINGS_AUDIT", "บันทึกการใช้งานระบบ (Audit Log)", "SETTINGS_AUDIT", "SETTINGS", "การตั้งค่าระบบ", "SETTINGS"),

        // 7. รายงาน (REPORT)
        new("REPORT_ATT", "รายงานการลงเวลาและวันลา", "REPORT_ATT", "REPORT", "รายงาน", "REPORT"),
        new("REPORT_HEADCOUNT", "รายงานกำลังพลและอัตราการลาออก", "REPORT_HEADCOUNT", "REPORT", "รายงาน", "REPORT")
    };

    public RoleService(IHrmsDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<List<RoleSummaryDto>> GetAllRolesAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _dbContext.Roles
            .Include(r => r.UserRoles)
            .AsNoTracking()
            .OrderBy(r => r.Id)
            .ToListAsync(cancellationToken);

        return roles.Select(r => new RoleSummaryDto
        {
            Id = r.Id,
            RoleCode = r.RoleCode,
            RoleName = r.RoleName,
            Description = r.Description,
            Status = r.Status,
            UserCount = r.UserRoles.Count,
            IsSystemDefault = r.RoleCode is "ADMIN" or "SYSTEM_SUPER",
            LastModifiedAt = DateTime.UtcNow.AddHours(-2) // Mockup reference display
        }).ToList();
    }

    public async Task<RoleDetailDto> GetRoleMatrixAsync(long roleId, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.RoleDataScopes)
                .ThenInclude(rds => rds.Permission)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        var grantedPermCodes = role.RolePermissions
            .Select(rp => rp.Permission.PermissionCode)
            .ToHashSet();

        var activeScopes = role.RoleDataScopes
            .Select(rds => (rds.Permission.PermissionCode, rds.DataVisibilityScope))
            .ToHashSet();

        var moduleDtos = new List<ModulePermissionScopeDto>();

        foreach (var mod in StandardModules)
        {
            var viewCode = $"{mod.Prefix}_VIEW";
            var createCode = $"{mod.Prefix}_CREATE";
            var editCode = $"{mod.Prefix}_EDIT";
            var approveCode = $"{mod.Prefix}_APPROVE";

            bool canView = grantedPermCodes.Contains(viewCode) ||
                           (grantedPermCodes.Contains($"{mod.ParentPermissionPrefix}_VIEW") && !grantedPermCodes.Any(p => p.StartsWith(mod.Prefix + "_")));
            bool canCreate = grantedPermCodes.Contains(createCode) ||
                             (grantedPermCodes.Contains($"{mod.ParentPermissionPrefix}_CREATE") && !grantedPermCodes.Any(p => p.StartsWith(mod.Prefix + "_")));
            bool canEdit = grantedPermCodes.Contains(editCode) ||
                           (grantedPermCodes.Contains($"{mod.ParentPermissionPrefix}_EDIT") && !grantedPermCodes.Any(p => p.StartsWith(mod.Prefix + "_")));
            bool canApprove = grantedPermCodes.Contains(approveCode) ||
                              (grantedPermCodes.Contains($"{mod.ParentPermissionPrefix}_APPROVE") && !grantedPermCodes.Any(p => p.StartsWith(mod.Prefix + "_")));

            bool HasScope(string permCode, string scopeName) => activeScopes.Contains((permCode, scopeName));

            var selfPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "SELF"),
                Create = HasScope(createCode, "SELF"),
                Edit = HasScope(editCode, "SELF"),
                Approve = HasScope(approveCode, "SELF")
            };

            var teamPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "TEAM"),
                Create = HasScope(createCode, "TEAM"),
                Edit = HasScope(editCode, "TEAM"),
                Approve = HasScope(approveCode, "TEAM")
            };

            var deptPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "DEPARTMENT"),
                Create = HasScope(createCode, "DEPARTMENT"),
                Edit = HasScope(editCode, "DEPARTMENT"),
                Approve = HasScope(approveCode, "DEPARTMENT")
            };

            var divPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "DIVISION"),
                Create = HasScope(createCode, "DIVISION"),
                Edit = HasScope(editCode, "DIVISION"),
                Approve = HasScope(approveCode, "DIVISION")
            };

            var orgPerms = new ScopeActionPermissionsDto
            {
                View = HasScope(viewCode, "ORGANIZATION"),
                Create = HasScope(createCode, "ORGANIZATION"),
                Edit = HasScope(editCode, "ORGANIZATION"),
                Approve = HasScope(approveCode, "ORGANIZATION")
            };

            // Legacy Fallback: หากใน role_data_scope ยังไม่มีบันทึกเลยแต่มีสิทธิ์ใน role_permission
            if (!selfPerms.View && !teamPerms.View && !deptPerms.View && !divPerms.View && !orgPerms.View && canView)
            {
                if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.View = true;
                else selfPerms.View = true;
            }
            if (!selfPerms.Create && !teamPerms.Create && !deptPerms.Create && !divPerms.Create && !orgPerms.Create && canCreate)
            {
                if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.Create = true;
                else selfPerms.Create = true;
            }
            if (!selfPerms.Edit && !teamPerms.Edit && !deptPerms.Edit && !divPerms.Edit && !orgPerms.Edit && canEdit)
            {
                if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.Edit = true;
                else selfPerms.Edit = true;
            }
            if (!selfPerms.Approve && !teamPerms.Approve && !deptPerms.Approve && !divPerms.Approve && !orgPerms.Approve && canApprove)
            {
                if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER") orgPerms.Approve = true;
                else selfPerms.Approve = true;
            }

            moduleDtos.Add(new ModulePermissionScopeDto
            {
                ModuleCode = mod.Code,
                ModuleName = mod.Name,
                GroupName = mod.CategoryName,
                CategoryCode = mod.CategoryCode,
                CategoryName = mod.CategoryName,
                Self = selfPerms,
                Team = teamPerms,
                Department = deptPerms,
                Division = divPerms,
                Organization = orgPerms,
                CanView = selfPerms.View || teamPerms.View || deptPerms.View || divPerms.View || orgPerms.View,
                CanCreate = selfPerms.Create || teamPerms.Create || deptPerms.Create || divPerms.Create || orgPerms.Create,
                CanEdit = selfPerms.Edit || teamPerms.Edit || deptPerms.Edit || divPerms.Edit || orgPerms.Edit,
                CanApprove = selfPerms.Approve || teamPerms.Approve || deptPerms.Approve || divPerms.Approve || orgPerms.Approve,
                DataScope = orgPerms.View ? "ORGANIZATION" : divPerms.View ? "DIVISION" : deptPerms.View ? "DEPARTMENT" : teamPerms.View ? "TEAM" : "SELF"
            });
        }

        return new RoleDetailDto
        {
            Id = role.Id,
            RoleCode = role.RoleCode,
            RoleName = role.RoleName,
            Description = role.Description,
            Status = role.Status,
            IsSystemDefault = role.RoleCode is "ADMIN" or "SYSTEM_SUPER",
            LastModifiedAt = DateTime.UtcNow.AddHours(-2),
            Modules = moduleDtos
        };
    }

    public async Task<RoleSummaryDto> CreateRoleAsync(CreateRoleRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RoleCode) || string.IsNullOrWhiteSpace(request.RoleName))
        {
            throw new ValidationException("กรุณากรอกรหัสบทบาทและชื่อบทบาท");
        }

        var code = request.RoleCode.Trim().ToUpperInvariant();
        var exists = await _dbContext.Roles.AnyAsync(r => r.RoleCode == code, cancellationToken);
        if (exists)
        {
            throw new BusinessRuleException($"รหัสบทบาท '{code}' มีอยู่ในระบบแล้ว");
        }

        var role = new Role
        {
            RoleCode = code,
            RoleName = request.RoleName.Trim(),
            Description = request.Description?.Trim(),
            Status = "ACTIVE"
        };

        _dbContext.Roles.Add(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "INSERT", "ROLE", role.Id, "RoleCode",
            null, role.RoleCode, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return new RoleSummaryDto
        {
            Id = role.Id,
            RoleCode = role.RoleCode,
            RoleName = role.RoleName,
            Description = role.Description,
            Status = role.Status,
            UserCount = 0,
            IsSystemDefault = false,
            LastModifiedAt = DateTime.UtcNow
        };
    }

    public async Task<RoleSummaryDto> UpdateRoleAsync(long roleId, UpdateRoleRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        var oldName = role.RoleName;
        role.RoleName = request.RoleName.Trim();
        role.Description = request.Description?.Trim();
        role.Status = request.Status;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "UPDATE", "ROLE", role.Id, "RoleName",
            oldName, role.RoleName, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return new RoleSummaryDto
        {
            Id = role.Id,
            RoleCode = role.RoleCode,
            RoleName = role.RoleName,
            Description = role.Description,
            Status = role.Status,
            UserCount = role.UserRoles.Count,
            IsSystemDefault = role.RoleCode is "ADMIN" or "SYSTEM_SUPER",
            LastModifiedAt = DateTime.UtcNow
        };
    }

    public async Task<RoleDetailDto> UpdateRoleMatrixAsync(long roleId, UpdateRoleMatrixRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleDataScopes)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        // Lockout protection: Cannot revoke all access for super admins
        bool hasAnyPermission = request.Modules.Any(m =>
            (m.Self != null && (m.Self.View || m.Self.Create || m.Self.Edit || m.Self.Approve)) ||
            (m.Team != null && (m.Team.View || m.Team.Create || m.Team.Edit || m.Team.Approve)) ||
            (m.Department != null && (m.Department.View || m.Department.Create || m.Department.Edit || m.Department.Approve)) ||
            (m.Division != null && (m.Division.View || m.Division.Create || m.Division.Edit || m.Division.Approve)) ||
            (m.Organization != null && (m.Organization.View || m.Organization.Create || m.Organization.Edit || m.Organization.Approve)) ||
            m.CanView);

        if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER" && !hasAnyPermission)
        {
            throw new BusinessRuleException("ไม่อนุญาตให้ยกเลิกสิทธิ์ทั้งหมดของบทบาทผู้ดูแลระบบสูงสุด (Lockout Protection)");
        }

        var allPermissions = await _dbContext.Permissions.ToListAsync(cancellationToken);
        var permMap = allPermissions.ToDictionary(p => p.PermissionCode, p => p.Id);

        // Delete existing role_permission and role_data_scope for standard sub-modules and parent modules
        var prefixList = StandardModules.Select(m => m.Prefix).Distinct().ToList();
        var parentPrefixList = StandardModules.Select(m => m.ParentPermissionPrefix).Distinct().ToList();
        prefixList.AddRange(parentPrefixList);

        var relevantPermIds = allPermissions
            .Where(p => prefixList.Any(pref => p.PermissionCode.StartsWith(pref + "_") || p.PermissionCode == pref))
            .Select(p => p.Id)
            .ToHashSet();

        var toRemovePerms = role.RolePermissions.Where(rp => relevantPermIds.Contains(rp.PermissionId)).ToList();
        foreach (var rp in toRemovePerms)
        {
            _dbContext.RolePermissions.Remove(rp);
        }

        var toRemoveScopes = role.RoleDataScopes.Where(rds => relevantPermIds.Contains(rds.PermissionId)).ToList();
        foreach (var rds in toRemoveScopes)
        {
            _dbContext.RoleDataScopes.Remove(rds);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var addedPermIds = new HashSet<long>();
        void AddPerm(string code)
        {
            if (permMap.TryGetValue(code, out var pId) && addedPermIds.Add(pId))
            {
                _dbContext.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = pId });
            }
        }

        var addedScopes = new HashSet<(long PermId, string Scope)>();
        void AddDataScope(string permCode, string scopeVal)
        {
            if (permMap.TryGetValue(permCode, out var permId) && addedScopes.Add((permId, scopeVal)))
            {
                _dbContext.RoleDataScopes.Add(new RoleDataScope
                {
                    RoleId = role.Id,
                    PermissionId = permId,
                    DataVisibilityScope = scopeVal
                });
            }
        }

        // Re-add based on independent checkboxes across 5 scopes
        foreach (var mod in request.Modules)
        {
            var match = StandardModules.FirstOrDefault(m => m.Code == mod.ModuleCode);
            if (match == default) continue;

            string pref = match.Prefix;
            var viewCode = $"{pref}_VIEW";
            var createCode = $"{pref}_CREATE";
            var editCode = $"{pref}_EDIT";
            var approveCode = $"{pref}_APPROVE";

            var scopeList = new (string ScopeName, ScopeActionPermissionsDto? Perms)[]
            {
                ("SELF", mod.Self),
                ("TEAM", mod.Team),
                ("DEPARTMENT", mod.Department),
                ("DIVISION", mod.Division),
                ("ORGANIZATION", mod.Organization)
            };

            foreach (var (scopeName, perms) in scopeList)
            {
                if (perms == null) continue;

                if (perms.View)
                {
                    AddPerm(viewCode);
                    AddDataScope(viewCode, scopeName);
                }
                if (perms.Create)
                {
                    AddPerm(createCode);
                    AddDataScope(createCode, scopeName);
                }
                if (perms.Edit)
                {
                    AddPerm(editCode);
                    AddDataScope(editCode, scopeName);
                }
                if (perms.Approve)
                {
                    AddPerm(approveCode);
                    AddDataScope(approveCode, scopeName);
                }
            }
        }

        // หากมีการเปิดสิทธิ์ดูในโมดูลย่อยใดๆ ให้ผูกสิทธิ์ VIEW ของโมดูลแม่ไว้อัตโนมัติเพื่อความเข้ากันได้ (Backward Compatibility)
        foreach (var parentPref in parentPrefixList)
        {
            var hasAnyChildView = request.Modules.Any(m => {
                var match = StandardModules.FirstOrDefault(sm => sm.Code == m.ModuleCode);
                if (match == null || match.ParentPermissionPrefix != parentPref) return false;
                return (m.Self?.View == true) || (m.Team?.View == true) || (m.Department?.View == true) || (m.Division?.View == true) || (m.Organization?.View == true) || m.CanView;
            });

            if (hasAnyChildView)
            {
                AddPerm($"{parentPref}_VIEW");
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "UPDATE", "ROLE_PERMISSIONS", role.Id, "PermissionMatrix",
            null, $"Updated matrix with {request.Modules.Count} modules", currentUserId, ipAddress, cancellationToken: cancellationToken);

        return await GetRoleMatrixAsync(role.Id, cancellationToken);
    }

    public async Task<bool> DeleteRoleAsync(long roleId, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _dbContext.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
        {
            throw new NotFoundException("Role", roleId);
        }

        if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER")
        {
            throw new BusinessRuleException("ไม่สามารถลบบทบาทมาตรฐานของระบบ (System Default Role) ได้");
        }

        if (role.UserRoles.Any())
        {
            throw new BusinessRuleException($"ไม่สามารถลบบทบาทนี้ได้เนื่องจากยังมีผู้ใช้งานจำนวน {role.UserRoles.Count} คนผูกอยู่");
        }

        _dbContext.Roles.Remove(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "DELETE", "ROLE", role.Id, "Role",
            role.RoleCode, null, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return true;
    }
}
