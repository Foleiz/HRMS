using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Interfaces;

public interface IHrmsDbContext
{
    DbSet<Bank> Banks { get; }
    DbSet<Employee> Employees { get; }
    DbSet<EmployeeContact> EmployeeContacts { get; }
    DbSet<EmployeeAddress> EmployeeAddresses { get; }
    DbSet<EmployeeBankAccount> EmployeeBankAccounts { get; }
    DbSet<EmployeeSocialSecurity> EmployeeSocialSecurities { get; }
    DbSet<EmployeeEducation> EmployeeEducations { get; }
    DbSet<FamilyMember> FamilyMembers { get; }
    DbSet<EmergencyContact> EmergencyContacts { get; }
    DbSet<UserAccount> UserAccounts { get; }
    DbSet<Role> Roles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<RoleDataScope> RoleDataScopes { get; }

    // Organization Master Data (Dev 1 Sprint 1)
    DbSet<Company> Companies { get; }
    DbSet<Division> Divisions { get; }
    DbSet<Department> Departments { get; }
    DbSet<Position> Positions { get; }
    DbSet<EmployeeLevel> EmployeeLevels { get; }
    DbSet<EmployeeAssignment> EmployeeAssignments { get; }

    // Work Calendar Master Data (Dev 1 Sprint 2)
    DbSet<WorkWeek> WorkWeeks { get; }
    DbSet<Holiday> Holidays { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
