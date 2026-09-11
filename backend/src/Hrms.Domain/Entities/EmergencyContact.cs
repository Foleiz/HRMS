using System.ComponentModel.DataAnnotations.Schema;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ผู้ติดต่อกรณีฉุกเฉินของพนักงาน (Mapping: hrms.emergency_contact)
/// </summary>
public class EmergencyContact : BaseEntity
{
    public long EmployeeId { get; set; }
    [NotMapped]
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Relationship { get; set; }
    public string PrimaryPhone { get; set; } = string.Empty;
    public string? SecondaryPhone { get; set; }
    public string? Address { get; set; }
    public bool IsPrimary { get; set; } = true;

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
