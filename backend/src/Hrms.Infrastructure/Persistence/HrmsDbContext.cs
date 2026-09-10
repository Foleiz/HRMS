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

    // Master Data: Reference Feature
    public DbSet<Bank> Banks => Set<Bank>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // กำหนด Default Schema เป็น 'hrms'
        modelBuilder.HasDefaultSchema("hrms");

        // Configuration ของ Entity Bank
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
    }
}
