using Hrms.Application.Features.Auth.Dtos;

namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// อินเทอร์เฟซสำหรับการออก JWT Token พร้อมกำหนด Claims
/// </summary>
public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateToken(UserInfoDto user);
}
