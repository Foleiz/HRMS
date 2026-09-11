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

    // ข้อมูล PDPA ที่มีความอ่อนไหวสูง (Sensitive Data)
    public string? CitizenId { get; set; }
    public byte[]? CitizenIdEncrypted { get; set; }
    public string? CitizenIdMasked { get; set; }

    public DateOnly? BirthDate { get; set; }
    public string? Gender { get; set; }
    public long? GenderId { get; set; }

    public string? Nationality { get; set; }
    public long? NationalityId { get; set; }

    public string? Religion { get; set; }
    public long? ReligionId { get; set; }

    public string? MaritalStatus { get; set; }
    public long? MaritalStatusId { get; set; }

    public string? MilitaryStatus { get; set; }
    public bool IsTopLevel { get; set; } = false;

    // ข้อมูลลดหย่อนภาษีครอบครัว (Family Tax Deductions)
    public bool SpouseHasIncome { get; set; } = false;
    public int NumberOfChildren { get; set; } = 0;
    public int ParentDeductionCount { get; set; } = 0;
    public int DisabilityDeductionCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Helper property สำหรับแสดงชื่อ-นามสกุลเต็ม
    public string FullName => $"{Prefix} {FirstName} {LastName}".Trim();

    // Navigation Properties
    public virtual UserAccount? UserAccount { get; set; }
    public virtual EmployeeContact? Contact { get; set; }
    public virtual EmployeeSocialSecurity? SocialSecurity { get; set; }
    public virtual ICollection<EmployeeAddress> Addresses { get; set; } = new List<EmployeeAddress>();
    public virtual ICollection<EmployeeBankAccount> BankAccounts { get; set; } = new List<EmployeeBankAccount>();
    public virtual ICollection<EmployeeEducation> Educations { get; set; } = new List<EmployeeEducation>();
    public virtual ICollection<FamilyMember> FamilyMembers { get; set; } = new List<FamilyMember>();
    public virtual ICollection<EmergencyContact> EmergencyContacts { get; set; } = new List<EmergencyContact>();
}
