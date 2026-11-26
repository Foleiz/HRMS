using Hrms.Domain.Common;
using Hrms.Domain.Common.Attributes;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลประกันสังคมและโรงพยาบาลตามสิทธิ (PDPA Encrypted)
/// แมปกับตาราง hrms.employee_social_security
/// </summary>
public class EmployeeSocialSecurity : BaseEntity
{
    public long EmployeeId { get; set; }

    [AuditSensitive(AuditMaskMode.KeepLast4)]
    public string? SocialSecurityNo { get; set; }

    [AuditSensitive(AuditMaskMode.Redacted)]
    public byte[]? SocialSecurityNoEncrypted { get; set; }
    public string? SocialSecurityNoMasked { get; set; }
    public string? HospitalName { get; set; }
    public string? HospitalCode { get; set; }

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
