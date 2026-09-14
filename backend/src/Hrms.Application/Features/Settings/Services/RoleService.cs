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

    // ระบบงาน 7 โมดูลมาตรฐานตาม Mockup
    private static readonly List<(string Code, string Name, string Prefix)> StandardModules = new()
    {
        ("EMPLOYEE", "พนักงาน / จัดการประวัติพนักงาน", "EMP"),
        ("ATTENDANCE", "การเข้างาน / บันทึกเวลา", "TIME"),
        ("LEAVE", "การจัดการวันลา", "LEAVE"),
        ("PAYROLL", "การจัดการเงินเดือน / รายได้", "PAYROLL"),
        ("ORGANIZATION", "โครงสร้างองค์กร", "ORG"),
        ("SETTINGS", "ตั้งค่า", "SETTINGS"),
        ("REPORT", "รายงาน", "REPORT")
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

        var scopeMap = role.RoleDataScopes
            .ToDictionary(rds => rds.Permission.PermissionCode, rds => rds.DataVisibilityScope);

        var moduleDtos = new List<ModulePermissionScopeDto>();

        foreach (var (modCode, modName, prefix) in StandardModules)
        {
            var viewCode = $"{prefix}_VIEW";
            var createCode = $"{prefix}_CREATE";
            var editCode = $"{prefix}_EDIT";
            var approveCode = $"{prefix}_APPROVE";

            bool canView = grantedPermCodes.Contains(viewCode);
            bool canCreate = grantedPermCodes.Contains(createCode);
            bool canEdit = grantedPermCodes.Contains(editCode);
            bool canApprove = grantedPermCodes.Contains(approveCode);

            string dataScope = "SELF";
            if (scopeMap.TryGetValue(viewCode, out var sc))
            {
                dataScope = sc;
            }
            else if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER")
            {
                dataScope = "ORGANIZATION";
            }

            moduleDtos.Add(new ModulePermissionScopeDto
            {
                ModuleCode = modCode,
                ModuleName = modName,
                DataScope = dataScope,
                CanView = canView,
                CanCreate = canCreate,
                CanEdit = canEdit,
                CanApprove = canApprove
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

        // Lockout protection: Cannot revoke basic access for super admins
        if (role.RoleCode is "ADMIN" or "SYSTEM_SUPER" && request.Modules.All(m => !m.CanView))
        {
            throw new BusinessRuleException("ไม่อนุญาตให้ยกเลิกสิทธิ์ทั้งหมดของบทบาทผู้ดูแลระบบสูงสุด (Lockout Protection)");
        }

        var allPermissions = await _dbContext.Permissions.ToListAsync(cancellationToken);
        var permMap = allPermissions.ToDictionary(p => p.PermissionCode, p => p.Id);

        // Delete existing role_permission and role_data_scope for standard modules
        var prefixList = StandardModules.Select(m => m.Prefix).ToList();
        var relevantPermIds = allPermissions
            .Where(p => prefixList.Any(pref => p.PermissionCode.StartsWith(pref + "_")))
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

        // Re-add based on request
        foreach (var mod in request.Modules)
        {
            var match = StandardModules.FirstOrDefault(m => m.Code == mod.ModuleCode);
            if (match == default) continue;

            string pref = match.Prefix;
            var viewCode = $"{pref}_VIEW";
            var createCode = $"{pref}_CREATE";
            var editCode = $"{pref}_EDIT";
            var approveCode = $"{pref}_APPROVE";

            // Hierarchy Rule: If cannot view, cannot create/edit/approve
            bool canView = mod.CanView;
            bool canCreate = canView && mod.CanCreate;
            bool canEdit = canView && mod.CanEdit;
            bool canApprove = canView && mod.CanApprove;

            void AddPerm(string code)
            {
                if (permMap.TryGetValue(code, out var pId))
                {
                    _dbContext.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = pId });
                }
            }

            if (canView) AddPerm(viewCode);
            if (canCreate) AddPerm(createCode);
            if (canEdit) AddPerm(editCode);
            if (canApprove) AddPerm(approveCode);

            // Scope applies to View permission
            if (permMap.TryGetValue(viewCode, out var viewPermId))
            {
                var validScope = mod.DataScope is "SELF" or "TEAM" or "DEPARTMENT" or "DIVISION" or "ORGANIZATION"
                    ? mod.DataScope
                    : "SELF";

                _dbContext.RoleDataScopes.Add(new RoleDataScope
                {
                    RoleId = role.Id,
                    PermissionId = viewPermId,
                    DataVisibilityScope = validScope
                });
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
