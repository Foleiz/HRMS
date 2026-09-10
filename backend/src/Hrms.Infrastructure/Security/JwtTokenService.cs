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

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("employee_id", user.EmployeeId.ToString()),
            new("employee_code", user.EmployeeCode),
            new("full_name", user.FullName)
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
}
