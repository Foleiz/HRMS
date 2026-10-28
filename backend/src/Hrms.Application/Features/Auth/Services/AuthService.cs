using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Auth.Services;

/// <summary>
/// Service จัดการการตรวจสอบสิทธิ์ เข้าสู่ระบบ และดึงข้อมูลสิทธิ์ผู้ใช้งาน
/// </summary>
public class AuthService : IAuthService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ICurrentUserService _currentUserService;

    public AuthService(
        IHrmsDbContext dbContext,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _currentUserService = currentUserService;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ValidationException("กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน");
        }

        var targetUsername = request.Username.Trim().ToLower();

        // 1. ค้นหาบัญชีผู้ใช้
        var user = await _dbContext.UserAccounts
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == targetUsername, cancellationToken);

        // รองรับชื่อผู้ใช้ ceo ให้ชี้ไปยังบัญชีผู้บริหารสูงสุด (job)
        if (user == null && targetUsername == "ceo")
        {
            user = await _dbContext.UserAccounts
                .Include(u => u.Employee)
                .FirstOrDefaultAsync(u => u.Username.ToLower() == "job", cancellationToken);
        }

        if (user == null)
        {
            throw new ValidationException("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        }

        if (user.Status != "ACTIVE")
        {
            throw new BusinessRuleException($"บัญชีนี้อยู่ในสถานะ {user.Status} ไม่สามารถเข้าสู่ระบบได้");
        }

        // 2. ตรวจสอบรหัสผ่านด้วย BCrypt
        bool passwordValid = false;
        try
        {
            passwordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        }
        catch
        {
            passwordValid = false;
        }

        if (!passwordValid)
        {
            var failLog = new AuditLog
            {
                Action = "LOGIN",
                EntityType = "AUTH",
                EntityId = user.Id,
                FieldName = "เข้าสู่ระบบไม่สำเร็จ",
                OldValue = null,
                NewValue = JsonSerializer.Serialize(new { status = "FAILED", username = user.Username }),
                UserId = user.Id,
                IpAddress = _currentUserService.IpAddress,
                UserAgent = _currentUserService.UserAgent,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.AuditLogs.Add(failLog);
            await _dbContext.SaveChangesAsync(cancellationToken);

            throw new ValidationException("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        var loginLog = new AuditLog
        {
            Action = "LOGIN",
            EntityType = "AUTH",
            EntityId = user.Id,
            FieldName = "เข้าสู่ระบบ",
            OldValue = null,
            NewValue = JsonSerializer.Serialize(new { username = user.Username }),
            UserId = user.Id,
            IpAddress = _currentUserService.IpAddress,
            UserAgent = _currentUserService.UserAgent,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.AuditLogs.Add(loginLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        // 3. โหลดสิทธิ์และโปรไฟล์แบบแยกคิวรีที่รวดเร็ว
        var userInfo = await BuildUserInfoDtoAsync(user.Id, cancellationToken);

        // 4. ออก JWT Token
        var (token, expiresAt) = _tokenService.GenerateToken(userInfo);

        return new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = userInfo
        };
    }

    public async Task<UserInfoDto> GetCurrentUserProfileAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await BuildUserInfoDtoAsync(userId, cancellationToken);
    }

    public async Task<bool> ChangePasswordAsync(long userId, ChangePasswordRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new ValidationException("กรุณากรอกรหัสผ่านปัจจุบัน");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ValidationException("กรุณากรอกรหัสผ่านใหม่");
        }

        if (request.NewPassword.Length < PasswordPolicy.MinLength)
        {
            throw new ValidationException(PasswordPolicy.TooShortMessage);
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            throw new ValidationException("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
        }

        var user = await _dbContext.UserAccounts.FindAsync(new object[] { userId }, cancellationToken)
            ?? throw new NotFoundException("UserAccount", userId);

        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            throw new ValidationException("รหัสผ่านปัจจุบันไม่ถูกต้อง");
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<UserInfoDto> BuildUserInfoDtoAsync(long userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.UserAccounts
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("UserAccount", userId);

        var userRoleIds = await _dbContext.UserRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync(cancellationToken);

        var roleEntities = await _dbContext.Roles
            .Where(r => userRoleIds.Contains(r.Id))
            .Select(r => new { r.RoleCode, r.RoleName })
            .Distinct()
            .ToListAsync(cancellationToken);

        var roles = roleEntities.Select(r => r.RoleCode).ToList();
        var roleNames = roleEntities
            .Select(r => !string.IsNullOrWhiteSpace(r.RoleName) ? r.RoleName : r.RoleCode)
            .ToList();

        var permissions = await (
            from rp in _dbContext.RolePermissions
            join p in _dbContext.Permissions on rp.PermissionId equals p.Id
            where userRoleIds.Contains(rp.RoleId)
            select p.PermissionCode
        ).Distinct().ToListAsync(cancellationToken);

        // หน้าตั้งค่าบทบาทและสิทธิ์ (RolesTab) ใช้ปุ่ม 3 การกระทำ (ดูข้อมูล / สร้าง / แก้ไข)
        // ดังนั้นสิทธิ์ระดับ *_EDIT จึงครอบคลุมการอนุมัติ (*_APPROVE) ในโมดูลเดียวกันโดยอัตโนมัติ
        var derivedApprovePerms = permissions
            .Where(c => c.EndsWith("_EDIT", StringComparison.OrdinalIgnoreCase))
            .Select(c => $"{c[..^5]}_APPROVE")
            .Where(ap => !permissions.Contains(ap, StringComparer.OrdinalIgnoreCase))
            .ToList();
        if (derivedApprovePerms.Count > 0)
        {
            permissions.AddRange(derivedApprovePerms);
        }

        var dataScopes = await (
            from rds in _dbContext.RoleDataScopes
            join r in _dbContext.Roles on rds.RoleId equals r.Id
            join p in _dbContext.Permissions on rds.PermissionId equals p.Id
            where userRoleIds.Contains(rds.RoleId)
            select new RoleScopeDto
            {
                RoleCode = r.RoleCode,
                PermissionCode = p.PermissionCode,
                DataVisibilityScope = rds.DataVisibilityScope ?? "SELF"
            }
        ).Distinct().ToListAsync(cancellationToken);

        var derivedApproveScopes = dataScopes
            .Where(s => s.PermissionCode.EndsWith("_EDIT", StringComparison.OrdinalIgnoreCase))
            .Select(s => new RoleScopeDto
            {
                RoleCode = s.RoleCode,
                PermissionCode = $"{s.PermissionCode[..^5]}_APPROVE",
                DataVisibilityScope = s.DataVisibilityScope
            })
            .Where(ds => !dataScopes.Any(existing =>
                string.Equals(existing.RoleCode, ds.RoleCode, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(existing.PermissionCode, ds.PermissionCode, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(existing.DataVisibilityScope, ds.DataVisibilityScope, StringComparison.OrdinalIgnoreCase)))
            .ToList();
        if (derivedApproveScopes.Count > 0)
        {
            dataScopes.AddRange(derivedApproveScopes);
        }

        // ยุบรวม DataScope ซ้ำของแต่ละ PermissionCode ให้เหลือเฉพาะระดับที่กว้างที่สุด (ORGANIZATION > DIVISION > DEPARTMENT > TEAM > SELF)
        // เพื่อให้ทั้ง Frontend (getDataScope) และ Backend ได้รับ Scope สูงสุดที่ผู้ใช้มีสิทธิ์เสมอ และลดขนาด Payload
        static int GetScopeRank(string? scope) => (scope ?? "SELF").ToUpperInvariant() switch
        {
            "ORGANIZATION" => 5,
            "DIVISION" => 4,
            "DEPARTMENT" => 3,
            "TEAM" => 2,
            "SELF" => 1,
            _ => 0
        };

        dataScopes = dataScopes
            .GroupBy(s => s.PermissionCode, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderByDescending(s => GetScopeRank(s.DataVisibilityScope)).First())
            .ToList();

        // ดึงแผนก ฝ่าย และทีมปัจจุบันของพนักงาน เพื่อใช้จำกัดขอบเขตการมองเห็นข้อมูล (Data Scoping)
        long? departmentId = null;
        long? divisionId = null;
        long? teamId = null;
        if (user.EmployeeId > 0)
        {
            var currentAssignment = await _dbContext.EmployeeAssignments
                .Where(a => a.EmployeeId == user.EmployeeId && a.IsCurrent)
                .OrderByDescending(a => a.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            if (currentAssignment != null)
            {
                departmentId = currentAssignment.DepartmentId > 0 ? currentAssignment.DepartmentId : null;
                divisionId = currentAssignment.DivisionId > 0 ? currentAssignment.DivisionId : null;
                teamId = currentAssignment.TeamId > 0 ? currentAssignment.TeamId : null;
            }
        }

        return new UserInfoDto
        {
            Id = user.Id,
            Username = user.Username,
            EmployeeId = user.EmployeeId,
            EmployeeCode = user.Employee?.EmployeeCode ?? string.Empty,
            FullName = user.Employee?.FullName ?? user.Username,
            Status = user.Status,
            Roles = roles,
            RoleNames = roleNames,
            Permissions = permissions,
            DataScopes = dataScopes,
            DepartmentId = departmentId,
            DivisionId = divisionId,
            TeamId = teamId
        };
    }
}
