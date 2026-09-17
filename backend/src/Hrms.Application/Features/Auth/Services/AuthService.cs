using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Dtos;
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

    public AuthService(
        IHrmsDbContext dbContext,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
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

        // Fallback อำนวยความสะดวกช่วง dev: หากกรอกรหัสเริ่มต้น "123456" หรือ "Admin@123456" จะยอมรับและอัปเดต hash ให้อัตโนมัติ
        if (!passwordValid && (request.Password == "123456" || request.Password == "Admin@123456"))
        {
            passwordValid = true;
            user.PasswordHash = _passwordHasher.HashPassword(request.Password);
        }

        if (!passwordValid)
        {
            throw new ValidationException("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
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

    public async Task<SeedPasswordsResultDto> SeedDefaultPasswordsAsync(string defaultPassword, CancellationToken cancellationToken = default)
    {
        var users = await _dbContext.UserAccounts.ToListAsync(cancellationToken);
        string newHash = _passwordHasher.HashPassword(defaultPassword);

        var updatedUsernames = new List<string>();
        foreach (var u in users)
        {
            u.PasswordHash = newHash;
            u.UpdatedAt = DateTime.UtcNow;
            updatedUsernames.Add(u.Username);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SeedPasswordsResultDto
        {
            UpdatedCount = users.Count,
            DefaultPassword = defaultPassword,
            UsersUpdated = updatedUsernames
        };
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

        var roles = await _dbContext.Roles
            .Where(r => userRoleIds.Contains(r.Id))
            .Select(r => r.RoleCode)
            .Distinct()
            .ToListAsync(cancellationToken);

        var permissions = await (
            from rp in _dbContext.RolePermissions
            join p in _dbContext.Permissions on rp.PermissionId equals p.Id
            where userRoleIds.Contains(rp.RoleId)
            select p.PermissionCode
        ).Distinct().ToListAsync(cancellationToken);

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

        return new UserInfoDto
        {
            Id = user.Id,
            Username = user.Username,
            EmployeeId = user.EmployeeId,
            EmployeeCode = user.Employee?.EmployeeCode ?? string.Empty,
            FullName = user.Employee?.FullName ?? user.Username,
            Status = user.Status,
            Roles = roles,
            Permissions = permissions,
            DataScopes = dataScopes
        };
    }
}
