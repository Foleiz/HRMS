namespace Hrms.Application.Features.MasterData.DTOs;

public class BankDto
{
    public long Id { get; set; }
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    /// <summary>ชื่อย่อ เช่น KBANK</summary>
    public string? ShortName { get; set; }
    /// <summary>จำนวนหลักเลขบัญชี (null = ไม่ตรวจ)</summary>
    public int? AccountDigits { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class CreateBankDto
{
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    /// <summary>ชื่อย่อ เช่น KBANK</summary>
    public string? ShortName { get; set; }
    /// <summary>จำนวนหลักเลขบัญชี (null = ไม่ตรวจ)</summary>
    public int? AccountDigits { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateBankDto
{
    public string BankName { get; set; } = string.Empty;
    /// <summary>ชื่อย่อ เช่น KBANK</summary>
    public string? ShortName { get; set; }
    /// <summary>จำนวนหลักเลขบัญชี (null = ไม่ตรวจ)</summary>
    public int? AccountDigits { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
