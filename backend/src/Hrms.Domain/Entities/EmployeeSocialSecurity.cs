using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลประกันสังคมและโรงพยาบาลตามสิทธิ (PDPA Encrypted)
/// แมปกับตาราง hrms.employee_social_security
/// </summary>
public class EmployeeSocialSecurity : BaseEntity
{
    public long EmployeeId { get; set; }
    public string? SocialSecurityNo { get; set; }
    public byte[]? SocialSecurityNoEncrypted { get; set; }
    public string? SocialSecurityNoMasked { get; set; }
    public string? HospitalName { get; set; }
    public string? HospitalCode { get; set; }

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
