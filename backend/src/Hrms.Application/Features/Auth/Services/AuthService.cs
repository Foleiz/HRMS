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

    public static readonly Dictionary<string, string> DefaultAccountPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        { "admin", "Admin#2026!Sec" },
        { "pimjai.k", "Pimjai@Hr2026" },
        { "somchai.w", "Somchai@Dept2026" },
        { "worameth.r", "Worameth@Staff26" },
        { "ceo", "Ceo@Executive2026!" },
        { "accounting", "Account@Pay2026" },
        { "finance", "Finance@Money2026" },
        { "approver", "Approver@Flow2026" },
        { "kanya.j", "Kanya@Staff2026" },
        { "Test001", "Test001@User2026" },
        { "Test002", "Test002@User2026" },
    };

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
                        .ThenInclude(rds => rds.Permission)
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

        // Fallback อำนวยความสะดวกช่วง dev: หากกรอกรหัสเฉพาะที่ถูกต้องของบัญชีนั้นๆ จะทำการ update hash ให้อัตโนมัติ
        if (!passwordValid && DefaultAccountPasswords.TryGetValue(user.Username, out var expectedPass) && request.Password == expectedPass)
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
                        .ThenInclude(rds => rds.Permission)
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

        var updatedUsernames = new List<string>();
        foreach (var u in users)
        {
            string passToHash = DefaultAccountPasswords.TryGetValue(u.Username, out var customPass)
                ? customPass
                : defaultPassword;

            u.PasswordHash = _passwordHasher.HashPassword(passToHash);
            u.UpdatedAt = DateTime.UtcNow;
            updatedUsernames.Add($"{u.Username} -> {passToHash}");
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SeedPasswordsResultDto
        {
            UpdatedCount = users.Count,
            DefaultPassword = "แต่ละบัญชีมีรหัสผ่านเฉพาะแยกกัน (Individual Passwords)",
            UsersUpdated = updatedUsernames
        };
    }

    private static UserInfoDto BuildUserInfoDto(Domain.Entities.UserAccount user)
    {
        var roles = user.UserRoles
            .Where(ur => ur.Role != null)
            .Select(ur => ur.Role.RoleCode)
            .Distinct()
            .ToList();

        var permissions = user.UserRoles
            .Where(ur => ur.Role != null)
            .SelectMany(ur => ur.Role.RolePermissions ?? Enumerable.Empty<Domain.Entities.RolePermission>())
            .Where(rp => rp.Permission != null && !string.IsNullOrEmpty(rp.Permission.PermissionCode))
            .Select(rp => rp.Permission.PermissionCode)
            .Distinct()
            .ToList();

        var dataScopes = user.UserRoles
            .Where(ur => ur.Role != null)
            .SelectMany(ur => ur.Role.RoleDataScopes ?? Enumerable.Empty<Domain.Entities.RoleDataScope>())
            .Where(rds => rds != null)
            .Select(rds => new RoleScopeDto
            {
                RoleCode = rds.Role?.RoleCode ?? user.UserRoles.FirstOrDefault(ur => ur.RoleId == rds.RoleId)?.Role?.RoleCode ?? string.Empty,
                PermissionCode = rds.Permission?.PermissionCode ?? string.Empty,
                DataVisibilityScope = rds.DataVisibilityScope ?? "SELF"
            })
            .Where(s => !string.IsNullOrEmpty(s.PermissionCode))
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
