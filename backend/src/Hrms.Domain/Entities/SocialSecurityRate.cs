using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// อัตราเงินสมทบกองทุนประกันสังคม
/// แมปกับตาราง hrms.social_security_rate
/// </summary>
public class SocialSecurityRate : BaseEntity
{
    public string RateName { get; set; } = string.Empty;
    public decimal EmployeeContributionPercent { get; set; }
    public decimal EmployerContributionPercent { get; set; }
    public decimal MinWageBaseAmount { get; set; } = 0;
    public decimal MaxWageBaseAmount { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
