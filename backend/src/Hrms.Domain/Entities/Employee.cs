using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลพนักงานหลัก (Employee Core Master)
/// แมปกับตาราง hrms.employee
/// </summary>
public class Employee : BaseEntity
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? CitizenId { get; set; }
    public byte[]? CitizenIdEncrypted { get; set; }
    public string? CitizenIdMasked { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Gender { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Helper property
    public string FullName => $"{Prefix} {FirstName} {LastName}".Trim();

    // Navigation Properties
    public virtual UserAccount? UserAccount { get; set; }
}
