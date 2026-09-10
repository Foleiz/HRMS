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
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Ignore(e => e.FullName);
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
    }
}
