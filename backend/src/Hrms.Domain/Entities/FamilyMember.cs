using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สมาชิกในครอบครัวของพนักงาน (Mapping: hrms.family_member)
/// </summary>
public class FamilyMember : BaseEntity
{
    public long EmployeeId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? CitizenId { get; set; }
    public byte[]? CitizenIdEncrypted { get; set; }
    public string? CitizenIdMasked { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? MaritalStatus { get; set; }
    public string? EducationStatus { get; set; }

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
