namespace Hrms.Application.Features.Organization.Dtos;

public class CompanyBankAccountDto
{
    public long Id { get; set; }
    public long CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public long BankId { get; set; }
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountName { get; set; }
    public bool IsPrimaryPayrollAccount { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class CreateCompanyBankAccountDto
{
    public long? CompanyId { get; set; }
    public long BankId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountName { get; set; }
    public bool IsPrimaryPayrollAccount { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateCompanyBankAccountDto
{
    public long? CompanyId { get; set; }
    public long BankId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountName { get; set; }
    public bool IsPrimaryPayrollAccount { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
}
