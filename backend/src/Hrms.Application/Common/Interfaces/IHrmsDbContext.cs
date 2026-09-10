using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Interfaces;

public interface IHrmsDbContext
{
    DbSet<Bank> Banks { get; }
    DbSet<Employee> Employees { get; }
    DbSet<UserAccount> UserAccounts { get; }
    DbSet<Role> Roles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<RoleDataScope> RoleDataScopes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
