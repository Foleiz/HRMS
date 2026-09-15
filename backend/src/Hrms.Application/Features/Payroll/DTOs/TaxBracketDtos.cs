namespace Hrms.Application.Features.Payroll.DTOs;

public class TaxBracketDto
{
    public long Id { get; set; }
    public string BracketName { get; set; } = string.Empty;
    public decimal IncomeFrom { get; set; }
    public decimal? IncomeTo { get; set; }
    public decimal TaxRate { get; set; }
    public decimal BaseTaxAmount { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateTaxBracketRequest
{
    public string BracketName { get; set; } = string.Empty;
    public decimal IncomeFrom { get; set; }
    public decimal? IncomeTo { get; set; }
    public decimal TaxRate { get; set; }
    public decimal BaseTaxAmount { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
