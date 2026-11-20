using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

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
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public AuthService(
        IHrmsDbContext dbContext,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ICurrentUserService currentUserService,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _currentUserService = currentUserService;
        _emailService = emailService;
        _configuration = configuration;
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

    public async Task<ForgotPasswordResponseDto> ForgotPasswordAsync(ForgotPasswordRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.EmailOrUsername))
        {
            throw new ValidationException("กรุณากรอกอีเมลองค์กรหรือชื่อผู้ใช้งาน");
        }

        var input = request.EmailOrUsername.Trim().ToLower();

        // ค้นหาจาก username หรือ อีเมล (personal_email / organization_email)
        var user = await _dbContext.UserAccounts
            .Include(u => u.Employee)
                .ThenInclude(e => e.Contact)
            .FirstOrDefaultAsync(u => 
                u.Username.ToLower() == input ||
                (u.Employee != null && u.Employee.Contact != null && (
                    (u.Employee.Contact.PersonalEmail != null && u.Employee.Contact.PersonalEmail.ToLower() == input) ||
                    (u.Employee.Contact.OrganizationEmail != null && u.Employee.Contact.OrganizationEmail.ToLower() == input)
                )), cancellationToken);

        if (user == null || user.Status != "ACTIVE")
        {
            throw new ValidationException("ไม่พบบัญชีผู้ใช้งานที่ตรงกับข้อมูลดังกล่าว หรือบัญชีถูกระงับการใช้งาน");
        }

        // หาอีเมลที่จะใช้ส่ง
        string? targetEmail = null;
        if (user.Employee?.Contact != null)
        {
            if (!string.IsNullOrWhiteSpace(user.Employee.Contact.OrganizationEmail) && user.Employee.Contact.OrganizationEmail.ToLower() == input)
            {
                targetEmail = user.Employee.Contact.OrganizationEmail;
            }
            else if (!string.IsNullOrWhiteSpace(user.Employee.Contact.PersonalEmail) && user.Employee.Contact.PersonalEmail.ToLower() == input)
            {
                targetEmail = user.Employee.Contact.PersonalEmail;
            }
            else
            {
                targetEmail = !string.IsNullOrWhiteSpace(user.Employee.Contact.OrganizationEmail)
                    ? user.Employee.Contact.OrganizationEmail
                    : user.Employee.Contact.PersonalEmail;
            }
        }

        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            throw new ValidationException("บัญชีผู้ใช้นี้ยังไม่ได้ระบุอีเมลในระบบ โปรดติดต่อฝ่ายทรัพยากรบุคคล (HR)");
        }

        // ยกเลิก token เดิมที่ยังไม่หมดอายุของ user คนนี้
        var activeTokens = await _dbContext.PasswordResetTokens
            .Where(t => t.UserAccountId == user.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(cancellationToken);
        foreach (var oldToken in activeTokens)
        {
            oldToken.IsUsed = true;
        }

        // สร้าง Token แบบสุ่มความปลอดภัยสูง (Cryptographic 32-byte hex)
        var rawToken = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)).ToLower();

        // สร้างรหัสยืนยัน OTP 6 หลัก (100000 - 999999)
        var otpCode = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");

        var resetToken = new PasswordResetToken
        {
            UserAccountId = user.Id,
            Token = rawToken,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.PasswordResetTokens.Add(resetToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // กำหนด URL รีเซ็ต (ตรวจสอบจาก ClientOrigin ที่เรียกมา หรือ Fallback ไปที่ Configuration Smtp:FrontendUrl)
        var frontendUrl = !string.IsNullOrWhiteSpace(request.ClientOrigin)
            ? request.ClientOrigin.TrimEnd('/')
            : (_configuration["Smtp:FrontendUrl"]?.TrimEnd('/') ?? "http://localhost:4001");
        var resetUrl = $"{frontendUrl}/reset-password?token={rawToken}";

        var recipientName = user.Employee?.FullName ?? user.Username;

        // ส่งอีเมลไปยังปลายทางพร้อม OTP
        await _emailService.SendPasswordResetEmailAsync(targetEmail, recipientName, resetUrl, otpCode, cancellationToken);

        string maskedEmail = targetEmail;
        var parts = targetEmail.Split('@');
        if (parts.Length == 2 && parts[0].Length > 2)
        {
            maskedEmail = $"{parts[0][..2]}***@{parts[1]}";
        }

        return new ForgotPasswordResponseDto
        {
            Success = true,
            MaskedEmail = maskedEmail,
            EmailOrUsername = input
        };
    }

    public async Task<ValidateResetTokenResponseDto> ValidateResetTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return new ValidateResetTokenResponseDto { IsValid = false, ErrorMessage = "ไม่พบรหัสโทเค็น" };
        }

        var resetToken = await _dbContext.PasswordResetTokens
            .Include(t => t.UserAccount)
                .ThenInclude(u => u.Employee)
                    .ThenInclude(e => e.Contact)
            .FirstOrDefaultAsync(t => t.Token == token.Trim(), cancellationToken);

        if (resetToken == null)
        {
            return new ValidateResetTokenResponseDto { IsValid = false, ErrorMessage = "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว" };
        }

        if (resetToken.IsUsed)
        {
            return new ValidateResetTokenResponseDto { IsValid = false, ErrorMessage = "ลิงก์รีเซ็ตรหัสผ่านนี้ถูกใช้งานไปแล้ว กรุณาส่งคำขอใหม่อีกครั้ง" };
        }

        if (resetToken.ExpiresAt < DateTime.UtcNow)
        {
            return new ValidateResetTokenResponseDto { IsValid = false, ErrorMessage = "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว (อายุการใช้งาน 15 นาที) กรุณาส่งคำขอใหม่อีกครั้ง" };
        }

        string? email = resetToken.UserAccount?.Employee?.Contact?.PersonalEmail 
            ?? resetToken.UserAccount?.Employee?.Contact?.OrganizationEmail;
        string? masked = null;
        if (!string.IsNullOrWhiteSpace(email))
        {
            var parts = email.Split('@');
            if (parts.Length == 2 && parts[0].Length > 2)
            {
                masked = $"{parts[0][..2]}***@{parts[1]}";
            }
            else
            {
                masked = email;
            }
        }

        return new ValidateResetTokenResponseDto
        {
            IsValid = true,
            Username = resetToken.UserAccount?.Username,
            MaskedEmail = masked
        };
    }

    public async Task<ValidateOtpResponseDto> ValidateOtpAsync(ValidateOtpRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.OtpCode) || request.OtpCode.Trim().Length < 6)
        {
            return new ValidateOtpResponseDto { IsValid = false, ErrorMessage = "กรุณาระบุรหัส OTP 6 หลัก" };
        }

        var otpInput = request.OtpCode.Trim();
        var emailInput = request.EmailOrUsername?.Trim().ToLower() ?? string.Empty;

        var query = _dbContext.PasswordResetTokens
            .Include(t => t.UserAccount)
                .ThenInclude(u => u.Employee)
                    .ThenInclude(e => e.Contact)
            .Where(t => t.OtpCode == otpInput && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

        if (!string.IsNullOrWhiteSpace(emailInput))
        {
            query = query.Where(t =>
                t.UserAccount.Username.ToLower() == emailInput ||
                (t.UserAccount.Employee != null && t.UserAccount.Employee.Contact != null && (
                    (t.UserAccount.Employee.Contact.PersonalEmail != null && t.UserAccount.Employee.Contact.PersonalEmail.ToLower() == emailInput) ||
                    (t.UserAccount.Employee.Contact.OrganizationEmail != null && t.UserAccount.Employee.Contact.OrganizationEmail.ToLower() == emailInput)
                )));
        }

        var resetToken = await query.OrderByDescending(t => t.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        if (resetToken == null)
        {
            return new ValidateOtpResponseDto { IsValid = false, ErrorMessage = "รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว (โปรดขอรหัสใหม่)" };
        }

        return new ValidateOtpResponseDto
        {
            IsValid = true,
            ResetToken = resetToken.Token
        };
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequestDto request, CancellationToken cancellationToken = default)
    {
        var tokenInput = request.Token?.Trim() ?? string.Empty;
        var otpInput = request.OtpCode?.Trim() ?? string.Empty;
        var emailInput = request.EmailOrUsername?.Trim().ToLower() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(tokenInput) && string.IsNullOrWhiteSpace(otpInput))
        {
            throw new ValidationException("กรุณาระบุรหัสยืนยัน OTP หรือโทเค็นสำหรับตั้งรหัสผ่านใหม่");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            throw new ValidationException("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            throw new ValidationException("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
        }

        PasswordResetToken? resetToken = null;

        // 1. ตรวจสอบจาก Token (32-byte hex) หากส่งมา
        if (!string.IsNullOrWhiteSpace(tokenInput) && tokenInput.Length > 10)
        {
            resetToken = await _dbContext.PasswordResetTokens
                .Include(t => t.UserAccount)
                .FirstOrDefaultAsync(t => t.Token == tokenInput, cancellationToken);
        }

        // 2. ตรวจสอบจาก OtpCode (หรือ Token ที่เป็นเลข 6 หลัก)
        var codeToMatch = !string.IsNullOrWhiteSpace(otpInput) ? otpInput : (tokenInput.Length == 6 ? tokenInput : null);
        if (resetToken == null && !string.IsNullOrWhiteSpace(codeToMatch))
        {
            var query = _dbContext.PasswordResetTokens
                .Include(t => t.UserAccount)
                    .ThenInclude(u => u.Employee)
                        .ThenInclude(e => e.Contact)
                .Where(t => t.OtpCode == codeToMatch && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

            if (!string.IsNullOrWhiteSpace(emailInput))
            {
                query = query.Where(t => 
                    t.UserAccount.Username.ToLower() == emailInput ||
                    (t.UserAccount.Employee != null && t.UserAccount.Employee.Contact != null && (
                        (t.UserAccount.Employee.Contact.PersonalEmail != null && t.UserAccount.Employee.Contact.PersonalEmail.ToLower() == emailInput) ||
                        (t.UserAccount.Employee.Contact.OrganizationEmail != null && t.UserAccount.Employee.Contact.OrganizationEmail.ToLower() == emailInput)
                    )));
            }

            resetToken = await query.OrderByDescending(t => t.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        }

        if (resetToken == null || resetToken.IsUsed || resetToken.ExpiresAt < DateTime.UtcNow)
        {
            throw new ValidationException("รหัส OTP หรือลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หมดอายุ หรือถูกใช้งานไปแล้ว");
        }

        var user = resetToken.UserAccount;
        if (user == null || user.Status != "ACTIVE")
        {
            throw new ValidationException("ไม่พบบัญชีผู้ใช้งาน หรือบัญชีถูกระงับการใช้งาน");
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        resetToken.IsUsed = true;

        var auditLog = new AuditLog
        {
            Action = "RESET_PASSWORD",
            EntityType = "USER_ACCOUNT",
            EntityId = user.Id,
            FieldName = "รีเซ็ตรหัสผ่านผ่านอีเมลสำเร็จ",
            OldValue = null,
            NewValue = JsonSerializer.Serialize(new { username = user.Username, resetAt = DateTime.UtcNow }),
            UserId = user.Id,
            IpAddress = _currentUserService.IpAddress,
            UserAgent = _currentUserService.UserAgent,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
