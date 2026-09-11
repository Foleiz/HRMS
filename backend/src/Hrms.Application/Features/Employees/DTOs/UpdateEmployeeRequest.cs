namespace Hrms.Application.Features.Employees.DTOs;

/// <summary>
/// คำขอแก้ไขข้อมูลพนักงาน
/// หากไม่ต้องการเปลี่ยน CitizenId หรือ SocialSecurityNo สามารถส่งค่าว่างหรือ null มาได้
/// </summary>
public class UpdateEmployeeRequest
{
    public string? EmployeeCode { get; set; }
    public string? Prefix { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // หากมีการส่งเลขใหม่มา จะทำการเข้ารหัสและสร้าง mask ใหม่
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
    public bool IsTopLevel { get; set; }

    // ข้อมูลลดหย่อนภาษี
    public bool SpouseHasIncome { get; set; }
    public int NumberOfChildren { get; set; }
    public int ParentDeductionCount { get; set; }
    public int DisabilityDeductionCount { get; set; }

    // ช่องทางการติดต่อ
    public string? PersonalPhone { get; set; }
    public string? PersonalEmail { get; set; }
    public string? OrganizationEmail { get; set; }

    // ประกันสังคม
    public string? SocialSecurityNo { get; set; }
    public string? HospitalName { get; set; }
    public string? HospitalCode { get; set; }

    // ที่อยู่
    public string? AddressType { get; set; }
    public string? AddressLine { get; set; }
    public string? SubDistrict { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public List<CreateEmployeeAddressDto>? Addresses { get; set; }

    // บัญชีธนาคาร
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public List<CreateEmployeeBankAccountDto>? BankAccounts { get; set; }

    // ประวัติการศึกษา
    public string? EducationLevel { get; set; }
    public string? Institution { get; set; }
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    public decimal? Gpa { get; set; }

    // ข้อมูลครอบครัว
    public List<CreateFamilyMemberDto>? FamilyMembers { get; set; }

    // กรณีฉุกเฉินติดต่อใคร
    public CreateEmergencyContactDto? EmergencyContact { get; set; }

    // ตำแหน่งงานและการจ้างงาน
    public string? PositionName { get; set; }
    public string? EmployeeType { get; set; }
    public string? DepartmentName { get; set; }
    public string? DivisionName { get; set; }
}
