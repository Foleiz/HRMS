namespace Hrms.Application.Features.Payroll.DTOs;

public class SocialSecurityRateDto
{
    public long Id { get; set; }
    public string RateName { get; set; } = string.Empty;
    public decimal EmployeeContributionPercent { get; set; }
    public decimal EmployerContributionPercent { get; set; }
    public decimal MinWageBaseAmount { get; set; }
    public decimal MaxWageBaseAmount { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateSocialSecurityRateRequest
{
    public string RateName { get; set; } = string.Empty;
    public decimal EmployeeContributionPercent { get; set; }
    public decimal EmployerContributionPercent { get; set; }
    public decimal MinWageBaseAmount { get; set; }
    public decimal MaxWageBaseAmount { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
