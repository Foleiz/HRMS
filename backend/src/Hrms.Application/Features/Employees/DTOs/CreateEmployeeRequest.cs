namespace Hrms.Application.Features.Employees.DTOs;

/// <summary>
/// คำขอสร้างข้อมูลพนักงานใหม่
/// ข้อมูล Sensitive เช่น CitizenId และ SocialSecurityNo จะถูกเข้ารหัส AES-256 ใน Service ทันที
/// </summary>
public class CreateEmployeeRequest
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // เลขบัตรประชาชนที่รับจาก Client (Plaintext) -> Service จะแปลงเป็น Encrypted & Masked
    public string? CitizenId { get; set; }

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

    // ข้อมูลลดหย่อนภาษี
    public bool SpouseHasIncome { get; set; } = false;
    public int NumberOfChildren { get; set; } = 0;
    public int ParentDeductionCount { get; set; } = 0;
    public int DisabilityDeductionCount { get; set; } = 0;

    // ช่องทางการติดต่อ
    public string? PersonalPhone { get; set; }
    public string? PersonalEmail { get; set; }
    public string? OrganizationEmail { get; set; }

    // ประกันสังคม (Plaintext) -> Service จะแปลงเป็น Encrypted & Masked
    public string? SocialSecurityNo { get; set; }
    public string? HospitalName { get; set; }
    public string? HospitalCode { get; set; }

    // ที่อยู่
    public List<CreateEmployeeAddressDto>? Addresses { get; set; }

    // บัญชีธนาคาร
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public List<CreateEmployeeBankAccountDto>? BankAccounts { get; set; }

    // ตำแหน่งงานและประเภทพนักงาน
    public long? PositionId { get; set; }
    public string? PositionName { get; set; }
    public string? EmployeeType { get; set; }

    // วุฒิการศึกษา
    public string? EducationLevel { get; set; }
    public string? Institution { get; set; }
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    public decimal? Gpa { get; set; }

    // ข้อมูลครอบครัว
    public List<CreateFamilyMemberDto>? FamilyMembers { get; set; }

    // กรณีฉุกเฉินติดต่อใคร
    public CreateEmergencyContactDto? EmergencyContact { get; set; }
}

public class CreateFamilyMemberDto
{
    public string RelationshipType { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? CitizenId { get; set; }
    public DateOnly? BirthDate { get; set; }
}

public class CreateEmergencyContactDto
{
    public string? Relationship { get; set; }
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string PrimaryPhone { get; set; } = string.Empty;
}

public class CreateEmployeeAddressDto
{
    public string AddressType { get; set; } = "CURRENT";
    public string? AddressLine { get; set; }
    public string? SubDistrict { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public bool IsCurrent { get; set; } = true;
}

public class CreateEmployeeBankAccountDto
{
    public long BankId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountType { get; set; }
    public string? AccountName { get; set; }
    public bool IsPrimary { get; set; } = true;
    public string Status { get; set; } = "ACTIVE";
}
