using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Settings.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Settings.Services;

public class UserService : IUserService
{
    private readonly IHrmsDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogService _auditLogService;

    public UserService(
        IHrmsDbContext dbContext,
        IPasswordHasher passwordHasher,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
    }

    public async Task<PagedResult<UserAccountDto>> GetUsersAsync(UserQueryFilter filter, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.UserAccounts
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Contact)
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(ea => ea.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(ea => ea.Position)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .AsQueryable();

        if (filter.RoleId.HasValue)
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.RoleId == filter.RoleId.Value));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ทั้งหมด")
        {
            query = query.Where(u => u.Status == filter.Status.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(u =>
                u.Username.ToLower().Contains(s) ||
                (u.Employee != null && (
                    u.Employee.EmployeeCode.ToLower().Contains(s) ||
                    u.Employee.FirstName.ToLower().Contains(s) ||
                    u.Employee.LastName.ToLower().Contains(s) ||
                    (u.Employee.Contact != null && u.Employee.Contact.OrganizationEmail != null && u.Employee.Contact.OrganizationEmail.ToLower().Contains(s))
                ))
            );
        }

        var totalCount = await query.CountAsync(cancellationToken);

        int page = filter.Page > 0 ? filter.Page : 1;
        int pageSize = filter.PageSize > 0 ? filter.PageSize : 10;

        var items = await query
            .OrderBy(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToDto).ToList();

        return new PagedResult<UserAccountDto>(dtos, totalCount, page, pageSize);
    }

    public async Task<UserAccountDto> GetUserByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.UserAccounts
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Contact)
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(ea => ea.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(ea => ea.Position)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException("UserAccount", id);
        }

        return MapToDto(user);
    }

    public async Task<UserAccountDto> CreateUserAsync(CreateUserRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationException("กรุณากรอกชื่อผู้ใช้งาน");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ValidationException("กรุณากรอกรหัสผ่าน");
        }

        if (request.EmployeeId <= 0)
        {
            throw new ValidationException("กรุณาเลือกพนักงาน");
        }

        var username = request.Username.Trim().ToLowerInvariant();
        var usernameExists = await _dbContext.UserAccounts.AnyAsync(u => u.Username.ToLower() == username, cancellationToken);
        if (usernameExists)
        {
            throw new BusinessRuleException($"ชื่อผู้ใช้งาน '{request.Username}' มีอยู่ในระบบแล้ว");
        }

        var empExists = await _dbContext.Employees.AnyAsync(e => e.Id == request.EmployeeId, cancellationToken);
        if (!empExists)
        {
            throw new NotFoundException("Employee", request.EmployeeId);
        }

        var empAccountExists = await _dbContext.UserAccounts.AnyAsync(u => u.EmployeeId == request.EmployeeId, cancellationToken);
        if (empAccountExists)
        {
            throw new BusinessRuleException("พนักงานท่านนี้มีบัญชีผู้ใช้งานในระบบอยู่แล้ว");
        }

        var user = new UserAccount
        {
            EmployeeId = request.EmployeeId,
            Username = request.Username.Trim(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.UserAccounts.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Add Roles
        if (request.RoleIds != null && request.RoleIds.Any())
        {
            foreach (var rId in request.RoleIds.Distinct())
            {
                _dbContext.UserRoles.Add(new UserRole
                {
                    UserId = user.Id,
                    RoleId = rId
                });
            }
        }

        // Update corporate email if provided
        if (!string.IsNullOrWhiteSpace(request.CorporateEmail))
        {
            var contact = await _dbContext.EmployeeContacts.FirstOrDefaultAsync(c => c.EmployeeId == request.EmployeeId, cancellationToken);
            if (contact != null)
            {
                contact.OrganizationEmail = request.CorporateEmail.Trim();
            }
            else
            {
                _dbContext.EmployeeContacts.Add(new EmployeeContact
                {
                    EmployeeId = request.EmployeeId,
                    OrganizationEmail = request.CorporateEmail.Trim()
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "INSERT", "USER_ACCOUNT", user.Id, "Username",
            null, user.Username, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return await GetUserByIdAsync(user.Id, cancellationToken);
    }

    public async Task<UserAccountDto> UpdateUserAsync(long id, UpdateUserRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.UserAccounts
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException("UserAccount", id);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var oldStatus = user.Status;
            user.Status = request.Status.Trim().ToUpperInvariant();
            if (oldStatus != user.Status)
            {
                await _auditLogService.LogAsync(
                    "UPDATE", "USER_ACCOUNT", user.Id, "Status",
                    oldStatus, user.Status, currentUserId, ipAddress, cancellationToken: cancellationToken);
            }
        }

        user.UpdatedAt = DateTime.UtcNow;

        // Update Roles
        if (request.RoleIds != null)
        {
            _dbContext.UserRoles.RemoveRange(user.UserRoles);
            foreach (var rId in request.RoleIds.Distinct())
            {
                _dbContext.UserRoles.Add(new UserRole
                {
                    UserId = user.Id,
                    RoleId = rId
                });
            }

            await _auditLogService.LogAsync(
                "UPDATE", "USER_ACCOUNT", user.Id, "Roles",
                null, $"Assigned {request.RoleIds.Count} roles", currentUserId, ipAddress, cancellationToken: cancellationToken);
        }

        // Update corporate email
        if (request.CorporateEmail != null)
        {
            var contact = await _dbContext.EmployeeContacts.FirstOrDefaultAsync(c => c.EmployeeId == user.EmployeeId, cancellationToken);
            if (contact != null)
            {
                var oldEmail = contact.OrganizationEmail;
                contact.OrganizationEmail = request.CorporateEmail.Trim();
                if (oldEmail != contact.OrganizationEmail)
                {
                    await _auditLogService.LogAsync(
                        "UPDATE", "EMPLOYEE_CONTACT", user.EmployeeId, "OrganizationEmail",
                        oldEmail, contact.OrganizationEmail, currentUserId, ipAddress, cancellationToken: cancellationToken);
                }
            }
            else
            {
                _dbContext.EmployeeContacts.Add(new EmployeeContact
                {
                    EmployeeId = user.EmployeeId,
                    OrganizationEmail = request.CorporateEmail.Trim()
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetUserByIdAsync(user.Id, cancellationToken);
    }

    public async Task<bool> ResetPasswordAsync(long id, ResetPasswordRequestDto request, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ValidationException("กรุณากรอกรหัสผ่านใหม่");
        }

        var user = await _dbContext.UserAccounts.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException("UserAccount", id);
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "UPDATE", "USER_ACCOUNT", user.Id, "Password",
            "***", "***", currentUserId, ipAddress, cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> ToggleStatusAsync(long id, string newStatus, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.UserAccounts.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException("UserAccount", id);
        }

        var old = user.Status;
        user.Status = newStatus.Trim().ToUpperInvariant();
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "UPDATE", "USER_ACCOUNT", user.Id, "Status",
            old, user.Status, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> DeleteUserAsync(long id, long? currentUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.UserAccounts.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException("UserAccount", id);
        }

        if (user.Username.ToLower() == "admin")
        {
            throw new BusinessRuleException("ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบสูงสุด (admin)");
        }

        // 1. ปลดการผูก AuditLogs ของผู้ใช้รายนี้เป็น null เพื่อเก็บประวัติ Audit Trail ไว้ตามมาตรฐาน PDPA
        var auditLogs = await _dbContext.AuditLogs.Where(a => a.UserId == id).ToListAsync(cancellationToken);
        foreach (var log in auditLogs)
        {
            log.UserId = null;
        }

        // 2. ปลดการผูก AttendanceImportBatches (ถ้ามี)
        var importBatches = await _dbContext.AttendanceImportBatches.Where(b => b.ImportedByUserId == id).ToListAsync(cancellationToken);
        foreach (var batch in importBatches)
        {
            batch.ImportedByUserId = null;
        }

        // 3. ลบ UserRoles ของผู้ใช้
        var userRoles = await _dbContext.UserRoles.Where(ur => ur.UserId == id).ToListAsync(cancellationToken);
        if (userRoles.Any())
        {
            _dbContext.UserRoles.RemoveRange(userRoles);
        }

        _dbContext.UserAccounts.Remove(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync(
            "DELETE", "USER_ACCOUNT", user.Id, "Username",
            user.Username, null, currentUserId, ipAddress, cancellationToken: cancellationToken);

        return true;
    }

    private static UserAccountDto MapToDto(UserAccount u)
    {
        var primaryAssignment = u.Employee?.Assignments
            .OrderByDescending(a => a.IsCurrent)
            .ThenByDescending(a => a.EffectiveFrom)
            .FirstOrDefault();

        var email = u.Employee?.Contact?.OrganizationEmail
            ?? (u.Employee != null ? $"{u.Username.ToLower()}@enterprise.co.th" : null);

        return new UserAccountDto
        {
            Id = u.Id,
            EmployeeId = u.EmployeeId,
            EmployeeCode = u.Employee?.EmployeeCode ?? string.Empty,
            FullName = u.Employee != null ? $"{u.Employee.FirstName} {u.Employee.LastName}" : u.Username,
            Username = u.Username,
            CorporateEmail = email,
            DepartmentName = primaryAssignment?.Department?.DepartmentName,
            PositionName = primaryAssignment?.Position?.PositionName,
            Status = u.Status,
            LastLoginAt = u.LastLoginAt,
            Roles = u.UserRoles.Select(ur => new UserRoleItemDto
            {
                RoleId = ur.RoleId,
                RoleCode = ur.Role.RoleCode,
                RoleName = ur.Role.RoleName,
                IsActive = ur.Role.Status == "ACTIVE"
            }).ToList(),
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt
        };
    }
}
