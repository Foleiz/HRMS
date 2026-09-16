using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ขั้นบันไดอัตราภาษีเงินได้บุคคลธรรมดา
/// แมปกับตาราง hrms.tax_bracket
/// </summary>
public class TaxBracket : BaseEntity
{
    public string BracketName { get; set; } = string.Empty;
    public decimal IncomeFrom { get; set; }
    public decimal? IncomeTo { get; set; }
    public decimal TaxRate { get; set; }
    public decimal BaseTaxAmount { get; set; } = 0;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
