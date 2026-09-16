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

    // Work Shifts (Dev 1 Sprint 3)
    DbSet<Shift> Shifts { get; }

    // Work Schedules & Employee Shifts (Dev 1 Sprint 4)
    DbSet<WorkSchedule> WorkSchedules { get; }
    DbSet<EmployeeShift> EmployeeShifts { get; }
    DbSet<EmployeeType> EmployeeTypes { get; }

    // Daily Attendance (Dev 1 Sprint 5)
    DbSet<AttendanceDaily> AttendanceDailies { get; }

    // Attendance Import (Dev 1 Sprint 6)
    DbSet<AttendanceImportBatch> AttendanceImportBatches { get; }
    DbSet<AttendanceImportError> AttendanceImportErrors { get; }

    // Contracts & Lifecycle (Dev 2 Sprint 2)
    DbSet<EmploymentContract> EmploymentContracts { get; }
    DbSet<EmployeeStatusHistory> EmployeeStatusHistories { get; }

    // Attendance Adjustment Requests (Dev 1 Sprint 7)
    DbSet<AttendanceAdjustment> AttendanceAdjustments { get; }

    // Benefits & Welfare Management
    DbSet<BenefitItem> BenefitItems { get; }
    DbSet<EmployeeTypeBenefit> EmployeeTypeBenefits { get; }

    // Employee Avatar Storage (Option 3 - PostgreSQL Binary)
    DbSet<EmployeeAvatar> EmployeeAvatars { get; }

    // Employee Transfer & Promotion Requests (Dev 2)
    DbSet<EmployeeTransferRequest> EmployeeTransferRequests { get; }

    // Leave Management (Dev 2 Sprint 3)
    DbSet<LeaveType> LeaveTypes { get; }
    DbSet<LeavePolicy> LeavePolicies { get; }
    DbSet<LeaveBalance> LeaveBalances { get; }
    DbSet<LeaveBalanceTransaction> LeaveBalanceTransactions { get; }
    DbSet<LeaveRequest> LeaveRequests { get; }
    DbSet<LeaveRequestDocument> LeaveRequestDocuments { get; }

    // Payroll & Compensation (Dev 2 Sprint 5.1)
    DbSet<SalaryStructure> SalaryStructures { get; }
    DbSet<TaxBracket> TaxBrackets { get; }
    DbSet<SocialSecurityRate> SocialSecurityRates { get; }
    DbSet<EmployeeSalary> EmployeeSalaries { get; }
    DbSet<PayrollItem> PayrollItems { get; }
    DbSet<PayrollPeriod> PayrollPeriods { get; }
    DbSet<Payroll> Payrolls { get; }
    DbSet<PayrollDetail> PayrollDetails { get; }

    // Audit Trail (PDPA Compliance)
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
