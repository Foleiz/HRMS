namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// คำขอสำหรับต่ออายุสัญญาจ้างงาน (Renew Contract Request)
/// </summary>
public class RenewEmploymentContractRequest
{
    public string ContractType { get; set; } = "FIXED_TERM";
    public long? EmployeeTypeId { get; set; }
    public string? WageType { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }
    public string? DocumentFileName { get; set; }
    public string? DocumentFileData { get; set; }
}
