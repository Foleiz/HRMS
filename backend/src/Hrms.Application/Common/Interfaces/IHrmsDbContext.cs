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

    // Organization Master Data (Dev 1 Sprint 1)
    DbSet<Company> Companies { get; }
    DbSet<Division> Divisions { get; }
    DbSet<Department> Departments { get; }
    DbSet<Position> Positions { get; }
    DbSet<EmployeeLevel> EmployeeLevels { get; }

    // Work Calendar Master Data (Dev 1 Sprint 2)
    DbSet<WorkWeek> WorkWeeks { get; }
    DbSet<Holiday> Holidays { get; }

    // Work Shifts (Dev 1 Sprint 3)
    DbSet<Shift> Shifts { get; }

    // Work Schedules & Employee Shifts (Dev 1 Sprint 4)
    DbSet<WorkSchedule> WorkSchedules { get; }
    DbSet<EmployeeShift> EmployeeShifts { get; }
    DbSet<EmployeeAssignment> EmployeeAssignments { get; }
    DbSet<EmployeeType> EmployeeTypes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
