namespace Hrms.Application.Features.MasterData.DTOs;

public class BankDto
{
    public long Id { get; set; }
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
}

public class CreateBankDto
{
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateBankDto
{
    public string BankName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
}
