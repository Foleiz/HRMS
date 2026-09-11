namespace Hrms.Application.Features.Employees.DTOs;

/// <summary>
/// ข้อมูลพนักงานหลักสำหรับส่งออกผ่าน API (ปลอดภัยตามมาตรฐาน PDPA)
/// จะไม่เปิดเผยเลขบัตรประชาชนตัวเต็ม แต่จะแสดงเฉพาะค่าที่พราง (Masked)
/// </summary>
public class EmployeeDto
{
    public long Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;

    // ข้อมูล PDPA Masked (เช่น 1-1002-xxxxx-xx-7)
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
    public bool IsTopLevel { get; set; }

    // ข้อมูลลดหย่อนภาษี
    public bool SpouseHasIncome { get; set; }
    public int NumberOfChildren { get; set; }
    public int ParentDeductionCount { get; set; }
    public int DisabilityDeductionCount { get; set; }

    // ข้อมูลการจ้างงาน
    public long? PositionId { get; set; }
    public string? PositionName { get; set; }
    public string? EmployeeType { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ข้อมูลส่วนย่อย (Navigation DTOs)
    public EmployeeContactDto? Contact { get; set; }
    public EmployeeSocialSecurityDto? SocialSecurity { get; set; }
    public List<EmployeeAddressDto> Addresses { get; set; } = new();
    public List<EmployeeBankAccountDto> BankAccounts { get; set; } = new();
    public List<EmployeeEducationDto> Educations { get; set; } = new();
    public List<FamilyMemberDto> FamilyMembers { get; set; } = new();
    public List<EmergencyContactDto> EmergencyContacts { get; set; } = new();
}

public class EmployeeContactDto
{
    public string? PersonalPhone { get; set; }
    public string? PersonalEmail { get; set; }
    public string? OrganizationEmail { get; set; }
}

public class EmployeeSocialSecurityDto
{
    public string? SocialSecurityNoMasked { get; set; }
    public string? HospitalName { get; set; }
    public string? HospitalCode { get; set; }
}

public class EmployeeAddressDto
{
    public long Id { get; set; }
    public string AddressType { get; set; } = "CURRENT";
    public string? AddressLine { get; set; }
    public string? SubDistrict { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public bool IsCurrent { get; set; }
}

public class EmployeeBankAccountDto
{
    public long Id { get; set; }
    public long BankId { get; set; }
    public string? BankCode { get; set; }
    public string? BankName { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountType { get; set; }
    public string? AccountName { get; set; }
    public bool IsPrimary { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class EmployeeEducationDto
{
    public long Id { get; set; }
    public string EducationLevel { get; set; } = string.Empty;
    public string Institution { get; set; } = string.Empty;
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    public decimal? Gpa { get; set; }
}

public class FamilyMemberDto
{
    public long Id { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? CitizenIdMasked { get; set; }
    public DateOnly? BirthDate { get; set; }
}

public class EmergencyContactDto
{
    public long Id { get; set; }
    public string? Relationship { get; set; }
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string PrimaryPhone { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
}
