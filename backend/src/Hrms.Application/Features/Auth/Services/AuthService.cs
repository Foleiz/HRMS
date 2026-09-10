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

        // ค้นหาบัญชีผู้ใช้
        var user = await _dbContext.UserAccounts
            .Include(u => u.Employee)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RoleDataScopes)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.Trim().ToLower(), cancellationToken);

        if (user == null)
        {
            throw new ValidationException("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        }

        if (user.Status != "ACTIVE")
        {
            throw new BusinessRuleException($"บัญชีนี้อยู่ในสถานะ {user.Status} ไม่สามารถเข้าสู่ระบบได้");
        }

        // ตรวจสอบรหัสผ่านด้วย BCrypt
        bool passwordValid = false;
        try
        {
            passwordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        }
        catch
        {
            // ป้องกันข้อผิดพลาดกรณี hash เดิมใน db เป็น dummy string
            passwordValid = false;
        }

        // Fallback อำนวยความสะดวกช่วง dev: หากเป็น dummy hash แต่กรอกรหัสเริ่มต้น "Admin@123456" จะทำการ update hash ให้อัตโนมัติ
        if (!passwordValid && user.PasswordHash.Contains("abcdefghijklmnopqrstuvwxy") && request.Password == "Admin@123456")
        {
            passwordValid = true;
            user.PasswordHash = _passwordHasher.HashPassword(request.Password);
        }

        if (!passwordValid)
        {
            throw new ValidationException("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        }

        // อัปเดตเวลาเข้าสู่ระบบล่าสุด
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        // รวบรวม Roles, Permissions และ Data Scopes
        var userInfo = BuildUserInfoDto(user);

        // ออก JWT Token
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
        var user = await _dbContext.UserAccounts
            .Include(u => u.Employee)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RoleDataScopes)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException("UserAccount", userId);
        }

        return BuildUserInfoDto(user);
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

    private static UserInfoDto BuildUserInfoDto(Domain.Entities.UserAccount user)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.RoleCode).Distinct().ToList();

        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.PermissionCode)
            .Distinct()
            .ToList();

        var dataScopes = user.UserRoles
            .SelectMany(ur => ur.Role.RoleDataScopes)
            .Select(rds => new RoleScopeDto
            {
                RoleCode = rds.Role.RoleCode,
                PermissionCode = rds.Permission.PermissionCode,
                DataVisibilityScope = rds.DataVisibilityScope
            })
            .DistinctBy(s => new { s.RoleCode, s.PermissionCode })
            .ToList();

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
