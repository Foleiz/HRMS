using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Dtos;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Hrms.Infrastructure.Security;

/// <summary>
/// ออก JWT Bearer Token พร้อมกำหนด Claims สำหรับ Identity, Roles, Permissions, และ Data Scopes
/// </summary>
public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(UserInfoDto user)
    {
        string secretKey = _configuration["Jwt:SecretKey"] ?? "HRMS_SUPER_SECURE_JWT_SECRET_KEY_FOR_DEVELOPMENT_2026_CHANGE_IN_PRODUCTION!";
        string issuer = _configuration["Jwt:Issuer"] ?? "HrmsApi";
        string audience = _configuration["Jwt:Audience"] ?? "HrmsApp";
        int expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out int mins) ? mins : 480; // 8 ชั่วโมง

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        // token เก็บแค่ตัวตนผู้ใช้ — บทบาท/สิทธิ์/ขอบเขตข้อมูลโหลดจากฐานข้อมูลทุกคำขอ (UserAccessLoader ใน OnTokenValidated)
        // เดิมฝังสิทธิ์ทุกตัวลง token: ผู้ดูแลที่มีสิทธิ์หลายร้อยรายการได้ token ใหญ่จน header เกินเพดาน → 431
        var claims = BuildIdentityClaims(user);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return (tokenHandler.WriteToken(token), expiresAt);
    }

    /// <summary>Claims ตัวตนผู้ใช้ (ไม่มีสิทธิ์) — ใส่ใน token</summary>
    public static List<Claim> BuildIdentityClaims(UserInfoDto user) => new()
    {
        new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new(JwtRegisteredClaimNames.UniqueName, user.Username),
        new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        new("employee_id", user.EmployeeId.ToString()),
    };

    /// <summary>Claims เต็มของผู้ใช้ (ตัวตน + บทบาท + สิทธิ์ + ขอบเขตข้อมูล) — ใช้ตอนโหลดสิทธิ์ล่าสุดในแต่ละคำขอ</summary>
    public static List<Claim> BuildClaims(UserInfoDto user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("employee_id", user.EmployeeId.ToString()),
            new("employee_code", user.EmployeeCode),
            new("full_name", user.FullName),
            new("department_id", user.DepartmentId?.ToString() ?? ""),
            new("division_id", user.DivisionId?.ToString() ?? ""),
            new("team_id", user.TeamId?.ToString() ?? "")
        };

        // เพิ่ม Role Claims
        foreach (var role in user.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // เพิ่ม Permission Claims
        foreach (var perm in user.Permissions)
        {
            claims.Add(new Claim("permission", perm));
        }

        // เพิ่ม Data Scope Claims (เช่น scope:EMP_VIEW=ORGANIZATION)
        foreach (var scope in user.DataScopes)
        {
            claims.Add(new Claim($"scope:{scope.PermissionCode}", scope.DataVisibilityScope));
        }

        return claims;
    }
}
