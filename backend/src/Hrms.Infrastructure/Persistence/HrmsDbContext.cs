using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core DbContext สำหรับ HRMS
/// เชื่อมต่อไปยัง PostgreSQL สคีมา 'hrms'
/// </summary>
public class HrmsDbContext : DbContext, IHrmsDbContext
{
    public HrmsDbContext(DbContextOptions<HrmsDbContext> options) : base(options)
    {
    }

    // Master Data
    public DbSet<Bank> Banks => Set<Bank>();

    // Authentication & Core Entities
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeContact> EmployeeContacts => Set<EmployeeContact>();
    public DbSet<EmployeeAddress> EmployeeAddresses => Set<EmployeeAddress>();
    public DbSet<EmployeeBankAccount> EmployeeBankAccounts => Set<EmployeeBankAccount>();
    public DbSet<EmployeeSocialSecurity> EmployeeSocialSecurities => Set<EmployeeSocialSecurity>();
    public DbSet<EmployeeEducation> EmployeeEducations => Set<EmployeeEducation>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<EmergencyContact> EmergencyContacts => Set<EmergencyContact>();
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RoleDataScope> RoleDataScopes => Set<RoleDataScope>();

    // Organization Master Data (Dev 1 Sprint 1)
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Division> Divisions => Set<Division>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<EmployeeLevel> EmployeeLevels => Set<EmployeeLevel>();

    // Work Calendar Master Data (Dev 1 Sprint 2)
    public DbSet<WorkWeek> WorkWeeks => Set<WorkWeek>();
    public DbSet<Holiday> Holidays => Set<Holiday>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // กำหนด Default Schema เป็น 'hrms'
        modelBuilder.HasDefaultSchema("hrms");

        // Configuration: Bank
        modelBuilder.Entity<Bank>(entity =>
        {
            entity.ToTable("bank", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.BankCode).HasColumnName("bank_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.BankName).HasColumnName("bank_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.HasIndex(e => e.BankCode).IsUnique();
        });

        // Configuration: Employee
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employee", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeCode).HasColumnName("employee_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.Prefix).HasColumnName("prefix").HasMaxLength(50);
            entity.Property(e => e.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.LastName).HasColumnName("last_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.CitizenId).HasColumnName("citizen_id").HasMaxLength(30);
            entity.Property(e => e.CitizenIdEncrypted).HasColumnName("citizen_id_encrypted");
            entity.Property(e => e.CitizenIdMasked).HasColumnName("citizen_id_masked").HasMaxLength(20);
            entity.Property(e => e.BirthDate).HasColumnName("birth_date");
            entity.Property(e => e.Gender).HasColumnName("gender").HasMaxLength(30);
            entity.Property(e => e.GenderId).HasColumnName("gender_id");
            entity.Property(e => e.Nationality).HasColumnName("nationality").HasMaxLength(100);
            entity.Property(e => e.NationalityId).HasColumnName("nationality_id");
            entity.Property(e => e.Religion).HasColumnName("religion").HasMaxLength(100);
            entity.Property(e => e.ReligionId).HasColumnName("religion_id");
            entity.Property(e => e.MaritalStatus).HasColumnName("marital_status").HasMaxLength(30);
            entity.Property(e => e.MaritalStatusId).HasColumnName("marital_status_id");
            entity.Property(e => e.MilitaryStatus).HasColumnName("military_status").HasMaxLength(50);
            entity.Property(e => e.IsTopLevel).HasColumnName("is_top_level");
            entity.Property(e => e.SpouseHasIncome).HasColumnName("spouse_has_income");
            entity.Property(e => e.NumberOfChildren).HasColumnName("number_of_children");
            entity.Property(e => e.ParentDeductionCount).HasColumnName("parent_deduction_count");
            entity.Property(e => e.DisabilityDeductionCount).HasColumnName("disability_deduction_count");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Ignore(e => e.FullName);
        });

        // Configuration: EmployeeContact
        modelBuilder.Entity<EmployeeContact>(entity =>
        {
            entity.ToTable("employee_contact", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.PersonalPhone).HasColumnName("personal_phone").HasMaxLength(50);
            entity.Property(e => e.PersonalEmail).HasColumnName("personal_email").HasMaxLength(255);
            entity.Property(e => e.OrganizationEmail).HasColumnName("organization_email").HasMaxLength(255);

            entity.HasOne(e => e.Employee)
                .WithOne(e => e.Contact)
                .HasForeignKey<EmployeeContact>(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: EmployeeAddress
        modelBuilder.Entity<EmployeeAddress>(entity =>
        {
            entity.ToTable("employee_address", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.AddressType).HasColumnName("address_type").IsRequired().HasMaxLength(30);
            entity.Property(e => e.AddressLine).HasColumnName("address_line");
            entity.Property(e => e.SubDistrict).HasColumnName("sub_district").HasMaxLength(150);
            entity.Property(e => e.District).HasColumnName("district").HasMaxLength(150);
            entity.Property(e => e.Province).HasColumnName("province").HasMaxLength(150);
            entity.Property(e => e.PostalCode).HasColumnName("postal_code").HasMaxLength(20);
            entity.Property(e => e.IsCurrent).HasColumnName("is_current").IsRequired();

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.Addresses)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: EmployeeBankAccount
        modelBuilder.Entity<EmployeeBankAccount>(entity =>
        {
            entity.ToTable("employee_bank_account", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.BankId).HasColumnName("bank_id").IsRequired();
            entity.Property(e => e.AccountNumber).HasColumnName("account_number").IsRequired().HasMaxLength(100);
            entity.Property(e => e.AccountType).HasColumnName("account_type").HasMaxLength(50);
            entity.Property(e => e.AccountName).HasColumnName("account_name").HasMaxLength(255);
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.BankAccounts)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Bank)
                .WithMany()
                .HasForeignKey(e => e.BankId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configuration: EmployeeSocialSecurity
        modelBuilder.Entity<EmployeeSocialSecurity>(entity =>
        {
            entity.ToTable("employee_social_security", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.SocialSecurityNo).HasColumnName("social_security_no").HasMaxLength(50);
            entity.Property(e => e.SocialSecurityNoEncrypted).HasColumnName("social_security_no_encrypted");
            entity.Property(e => e.SocialSecurityNoMasked).HasColumnName("social_security_no_masked").HasMaxLength(20);
            entity.Property(e => e.HospitalName).HasColumnName("hospital_name").HasMaxLength(255);
            entity.Property(e => e.HospitalCode).HasColumnName("hospital_code").HasMaxLength(50);

            entity.HasOne(e => e.Employee)
                .WithOne(e => e.SocialSecurity)
                .HasForeignKey<EmployeeSocialSecurity>(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: EmployeeEducation
        modelBuilder.Entity<EmployeeEducation>(entity =>
        {
            entity.ToTable("employee_education", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EducationLevel).HasColumnName("education_level").IsRequired().HasMaxLength(100);
            entity.Property(e => e.Institution).HasColumnName("institution").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Major).HasColumnName("major").HasMaxLength(255);
            entity.Property(e => e.GraduationYear).HasColumnName("graduation_year");
            entity.Property(e => e.Gpa).HasColumnName("gpa").HasPrecision(4, 2);

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.Educations)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: FamilyMember
        modelBuilder.Entity<FamilyMember>(entity =>
        {
            entity.ToTable("family_member", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.RelationshipType).HasColumnName("relationship_type").IsRequired().HasMaxLength(30);
            entity.Property(e => e.Prefix).HasColumnName("prefix").HasMaxLength(50);
            entity.Property(e => e.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(150);
            entity.Property(e => e.CitizenId).HasColumnName("citizen_id").HasMaxLength(30);
            entity.Property(e => e.CitizenIdEncrypted).HasColumnName("citizen_id_encrypted");
            entity.Property(e => e.CitizenIdMasked).HasColumnName("citizen_id_masked").HasMaxLength(20);
            entity.Property(e => e.BirthDate).HasColumnName("birth_date");
            entity.Property(e => e.MaritalStatus).HasColumnName("marital_status").HasMaxLength(30);
            entity.Property(e => e.EducationStatus).HasColumnName("education_status").HasMaxLength(100);

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.FamilyMembers)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: EmergencyContact
        modelBuilder.Entity<EmergencyContact>(entity =>
        {
            entity.ToTable("emergency_contact", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.Prefix).HasColumnName("prefix").HasMaxLength(50);
            entity.Property(e => e.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.LastName).HasColumnName("last_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.Relationship).HasColumnName("relationship").HasMaxLength(100);
            entity.Property(e => e.PrimaryPhone).HasColumnName("primary_phone").IsRequired().HasMaxLength(50);
            entity.Property(e => e.SecondaryPhone).HasColumnName("secondary_phone").HasMaxLength(50);
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary").IsRequired();

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.EmergencyContacts)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: UserAccount
        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.ToTable("user_account", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.Username).HasColumnName("username").IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Employee)
                .WithOne(e => e.UserAccount)
                .HasForeignKey<UserAccount>(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configuration: Role
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("role", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.RoleCode).HasColumnName("role_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.RoleName).HasColumnName("role_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
        });

        // Configuration: Permission
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("permission", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.PermissionCode).HasColumnName("permission_code").IsRequired().HasMaxLength(100);
            entity.Property(e => e.PermissionName).HasColumnName("permission_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description");
        });

        // Configuration: UserRole
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_role", "hrms");
            entity.HasKey(e => new { e.UserId, e.RoleId });
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: RolePermission
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("role_permission", "hrms");
            entity.HasKey(e => new { e.RoleId, e.PermissionId });
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");

            entity.HasOne(e => e.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: RoleDataScope
        modelBuilder.Entity<RoleDataScope>(entity =>
        {
            entity.ToTable("role_data_scope", "hrms");
            entity.HasKey(e => new { e.RoleId, e.PermissionId });
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");
            entity.Property(e => e.DataVisibilityScope).HasColumnName("data_visibility_scope").IsRequired().HasMaxLength(30);

            entity.HasOne(e => e.Role)
                .WithMany(r => r.RoleDataScopes)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Permission)
                .WithMany(p => p.RoleDataScopes)
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: Company
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("company", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CompanyCode).HasColumnName("company_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.CompanyName).HasColumnName("company_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.Property(e => e.LogoData).HasColumnName("logo_data");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(e => e.CompanyCode).IsUnique();
        });

        // Configuration: Division
        modelBuilder.Entity<Division>(entity =>
        {
            entity.ToTable("division", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CompanyId).HasColumnName("company_id").IsRequired();
            entity.Property(e => e.DivisionCode).HasColumnName("division_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.DivisionName).HasColumnName("division_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.HeadEmployeeId).HasColumnName("head_employee_id");
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Divisions)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.HeadEmployee)
                .WithMany()
                .HasForeignKey(e => e.HeadEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.CompanyId, e.DivisionCode }).IsUnique();
        });

        // Configuration: Department
        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("department", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.DivisionId).HasColumnName("division_id").IsRequired();
            entity.Property(e => e.ParentDepartmentId).HasColumnName("parent_department_id");
            entity.Property(e => e.DepartmentCode).HasColumnName("department_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.DepartmentName).HasColumnName("department_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.HeadEmployeeId).HasColumnName("head_employee_id");
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Division)
                .WithMany(d => d.Departments)
                .HasForeignKey(e => e.DivisionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ParentDepartment)
                .WithMany(d => d.SubDepartments)
                .HasForeignKey(e => e.ParentDepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.HeadEmployee)
                .WithMany()
                .HasForeignKey(e => e.HeadEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.DivisionId, e.DepartmentCode }).IsUnique();
        });

        // Configuration: Position
        modelBuilder.Entity<Position>(entity =>
        {
            entity.ToTable("position", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.DepartmentId).HasColumnName("department_id").IsRequired();
            entity.Property(e => e.EmployeeLevelId).HasColumnName("employee_level_id");
            entity.Property(e => e.PositionCode).HasColumnName("position_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.PositionName).HasColumnName("position_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Department)
                .WithMany(d => d.Positions)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EmployeeLevel)
                .WithMany(l => l.Positions)
                .HasForeignKey(e => e.EmployeeLevelId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.PositionCode).IsUnique();
        });

        // Configuration: EmployeeLevel
        modelBuilder.Entity<EmployeeLevel>(entity =>
        {
            entity.ToTable("employee_level", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.LevelCode).HasColumnName("level_code").IsRequired().HasMaxLength(50);
            entity.Property(e => e.LevelName).HasColumnName("level_name").IsRequired().HasMaxLength(100);
            entity.Property(e => e.LevelRank).HasColumnName("level_rank");
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(20);
            entity.Property(e => e.MinSalary).HasColumnName("min_salary");
            entity.Property(e => e.MaxSalary).HasColumnName("max_salary");
            entity.Property(e => e.ApprovalLimit).HasColumnName("approval_limit");
            entity.Property(e => e.DefaultFlowId).HasColumnName("default_flow_id");
            entity.HasIndex(e => e.LevelCode).IsUnique();
        });

        // Configuration: WorkWeek (Dev 1 Sprint 2)
        modelBuilder.Entity<WorkWeek>(entity =>
        {
            entity.ToTable("work_week", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CompanyId).HasColumnName("company_id").IsRequired();
            entity.Property(e => e.DayOfWeek).HasColumnName("day_of_week").IsRequired();
            entity.Property(e => e.IsWorkingDay).HasColumnName("is_working_day").IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.CompanyId, e.DayOfWeek }).IsUnique();
        });

        // Configuration: Holiday (Dev 1 Sprint 2)
        modelBuilder.Entity<Holiday>(entity =>
        {
            entity.ToTable("holiday", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.HolidayDate).HasColumnName("holiday_date").IsRequired();
            entity.Property(e => e.HolidayName).HasColumnName("holiday_name").IsRequired().HasMaxLength(255);
            entity.Property(e => e.CompanyId).HasColumnName("company_id").IsRequired();
            entity.Property(e => e.HolidayType).HasColumnName("holiday_type").IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.CompanyId, e.HolidayDate }).IsUnique();
        });

        // Configuration: EmployeeEducation
        modelBuilder.Entity<EmployeeEducation>(entity =>
        {
            entity.ToTable("employee_education", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.EducationLevel).HasColumnName("education_level").IsRequired().HasMaxLength(100);
            entity.Property(e => e.Institution).HasColumnName("institution").IsRequired().HasMaxLength(255);
            entity.Property(e => e.Major).HasColumnName("major").HasMaxLength(255);
            entity.Property(e => e.GraduationYear).HasColumnName("graduation_year");
            entity.Property(e => e.Gpa).HasColumnName("gpa");

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.Educations)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: FamilyMember
        modelBuilder.Entity<FamilyMember>(entity =>
        {
            entity.ToTable("family_member", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.RelationshipType).HasColumnName("relationship_type").IsRequired().HasMaxLength(30);
            entity.Property(e => e.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(150);
            entity.Property(e => e.CitizenId).HasColumnName("citizen_id").HasMaxLength(30);
            entity.Property(e => e.CitizenIdEncrypted).HasColumnName("citizen_id_encrypted");
            entity.Property(e => e.CitizenIdMasked).HasColumnName("citizen_id_masked").HasMaxLength(20);
            entity.Property(e => e.BirthDate).HasColumnName("birth_date");
            entity.Property(e => e.MaritalStatus).HasColumnName("marital_status").HasMaxLength(30);
            entity.Property(e => e.EducationStatus).HasColumnName("education_status").HasMaxLength(100);
            entity.Ignore(e => e.Prefix);

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.FamilyMembers)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configuration: EmergencyContact
        modelBuilder.Entity<EmergencyContact>(entity =>
        {
            entity.ToTable("emergency_contact", "hrms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id").IsRequired();
            entity.Property(e => e.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.LastName).HasColumnName("last_name").IsRequired().HasMaxLength(150);
            entity.Property(e => e.Relationship).HasColumnName("relationship").HasMaxLength(100);
            entity.Property(e => e.PrimaryPhone).HasColumnName("primary_phone").IsRequired().HasMaxLength(50);
            entity.Property(e => e.SecondaryPhone).HasColumnName("secondary_phone").HasMaxLength(50);
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary").IsRequired();
            entity.Ignore(e => e.Prefix);

            entity.HasOne(e => e.Employee)
                .WithMany(e => e.EmergencyContacts)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
