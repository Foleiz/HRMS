namespace Hrms.Application.Features.Employees.DTOs;

/// <summary>
/// ข้อมูลพนักงานหลักสำหรับส่งออกผ่าน API (ปลอดภัยตามมาตรฐาน PDPA)
/// จะไม่เปิดเผยเลขบัตรประชาชนตัวเต็ม แต่จะแสดงเฉพาะค่าที่พราง (Masked)
/// </summary>
public class EmployeeDto
{
    public long Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    /// <summary>จำนวนแถวลงเวลาจากไฟล์ที่นำเข้าไว้แล้ว ที่ถูกจับคู่ให้พนักงานคนนี้อัตโนมัติหลังบันทึก (มีเฉพาะผลของการสร้าง/แก้ไข)</summary>
    public int? AttendanceRowsLinked { get; set; }
    public string? BiometricId { get; set; }
    /// <summary>สถานะการจ้างงาน: ACTIVE, PROBATION, RESIGNED, INACTIVE</summary>
    public string EmploymentStatus { get; set; } = "ACTIVE";
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
    public string? PositionCode { get; set; }
    public string? PositionName { get; set; }
    public long? DepartmentId { get; set; }
    public string? DepartmentCode { get; set; }
    public string? DepartmentName { get; set; }
    public long? DivisionId { get; set; }
    public string? DivisionCode { get; set; }
    public string? DivisionName { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string? EmployeeType { get; set; }
    /// <summary>หัวหน้างานโดยตรง (ใช้กับขั้นอนุมัติ "หัวหน้างานตรง")</summary>
    public long? ManagerEmployeeId { get; set; }
    public string? ManagerName { get; set; }
    public string? ManagerEmployeeCode { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? AvatarUpdatedAt { get; set; }
    public string? AvatarUrl { get; set; }
    public bool HasSignature { get; set; }
    public string? SignatureUrl { get; set; }

    // ข้อมูลส่วนย่อย (Navigation DTOs)
    public EmployeeContactDto? Contact { get; set; }
    public EmployeeSocialSecurityDto? SocialSecurity { get; set; }
    public List<EmployeeAddressDto> Addresses { get; set; } = new();
    public List<EmployeeBankAccountDto> BankAccounts { get; set; } = new();
    public List<EmployeeEducationDto> Educations { get; set; } = new();
    public List<EmployeeWorkExperienceDto> WorkExperiences { get; set; } = new();
    public List<FamilyMemberDto> FamilyMembers { get; set; } = new();
    public List<EmergencyContactDto> EmergencyContacts { get; set; } = new();
    public EmployeeUserAccountDto? UserAccount { get; set; }
    public List<Hrms.Application.Features.MasterData.DTOs.BenefitItemDto> Benefits { get; set; } = new();
}

public class EmployeeUserAccountDto
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
    public DateTime? LastLoginAt { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<string> RoleNames { get; set; } = new();
    public string? AccessScope { get; set; }
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
    /// <summary>ACTIVE = ใช้จ่ายเงินเดือน, PENDING_VERIFY = รอยืนยัน, REJECTED = ไม่อนุมัติ</summary>
    public string Status { get; set; } = "ACTIVE";
    /// <summary>true = เลขบัญชีถูกซ่อน (ผู้ดูไม่มีสิทธิ์เห็นเต็ม)</summary>
    public bool IsMasked { get; set; }
    public DateTime? RequestedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? RejectReason { get; set; }
    /// <summary>ผู้ดูปัจจุบันยืนยัน/ปฏิเสธบัญชีนี้ได้</summary>
    public bool CanVerify { get; set; }
}

public class ReviewBankAccountRequest
{
    public bool Approve { get; set; }
    public string? Reason { get; set; }
}

public class EmployeeWorkExperienceDto
{
    public long Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? PositionName { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public decimal? LastSalary { get; set; }
    public string? LeavingReason { get; set; }
    public string? JobDescription { get; set; }
}

/// <summary>รายการประวัติการศึกษา (ส่งมาทั้งชุด = แทนที่ของเดิมทั้งหมด)</summary>
public class EmployeeEducationInput
{
    public string EducationLevel { get; set; } = string.Empty;
    public string Institution { get; set; } = string.Empty;
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    public decimal? Gpa { get; set; }
}

/// <summary>รายการประวัติการทำงาน (ส่งมาทั้งชุด = แทนที่ของเดิมทั้งหมด)</summary>
public class EmployeeWorkExperienceInput
{
    public string CompanyName { get; set; } = string.Empty;
    public string? PositionName { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public decimal? LastSalary { get; set; }
    public string? LeavingReason { get; set; }
    public string? JobDescription { get; set; }
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
