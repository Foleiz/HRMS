namespace Hrms.Application.Features.Payroll.DTOs;

public class PayrollPeriodDto
{
    public long Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string? PaymentDate { get; set; }
    public string Status { get; set; } = "REVIEW";
    public string StatusText { get; set; } = "รอตรวจสอบ";
    public int EmployeeCount { get; set; }
    public decimal TotalNetSalary { get; set; }
}

public class PayrollRecordDto
{
    public long Id { get; set; }
    public long PeriodId { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public decimal? TotalGrossIncome { get; set; }
    public decimal? TotalDeductionAmount { get; set; }
    public decimal? NetPayableSalary { get; set; }
    public string Status { get; set; } = "CALCULATED";
    public string StatusText { get; set; } = "คำนวณแล้ว";
}

public class PayrollDetailItemDto
{
    public long Id { get; set; }
    public long PayrollId { get; set; }
    public long PayrollItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string ItemType { get; set; } = "EARNING"; // EARNING, DEDUCTION
    public decimal? Quantity { get; set; }
    public decimal? Rate { get; set; }
    public decimal Amount { get; set; }
    public string? Subtext { get; set; }
}

public class UpdatePeriodStatusRequest
{
    public string Status { get; set; } = "REVIEW";
}

public class CreatePayrollPeriodRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string? PaymentDate { get; set; }
}

public class BankTransferItemDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal NetPayableSalary { get; set; }
    public string Status { get; set; } = "READY";
}

public class BankTransferSummaryDto
{
    public long PeriodId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string SelectedBankCode { get; set; } = "ALL";
    public decimal TotalTransferAmount { get; set; }
    public int TotalEmployees { get; set; }
    public List<BankTransferItemDto> Items { get; set; } = new();
}

public class TaxSsoItemDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string CitizenId { get; set; } = string.Empty;
    public decimal GrossIncome { get; set; }
    public decimal Pnd1Tax { get; set; }
    public decimal SsoEmployee { get; set; }
    public decimal SsoEmployer { get; set; }
}

public class TaxSsoSummaryDto
{
    public long PeriodId { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public decimal TotalGrossIncome { get; set; }
    public decimal TotalPnd1Tax { get; set; }
    public decimal TotalSsoEmployee { get; set; }
    public decimal TotalSsoEmployer { get; set; }
    public decimal TotalSsoCombined { get; set; }
    public int EmployeeCount { get; set; }
    public List<TaxSsoItemDto> Items { get; set; } = new();
}

public class EmployeeBonusDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int Year { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal Multiplier { get; set; }
    public decimal BonusAmount { get; set; }
    public string Status { get; set; } = "DRAFT";
    public string StatusText { get; set; } = "ร่าง";
}

public class CalculateBonusRequest
{
    public int Year { get; set; }
    public decimal DefaultMultiplier { get; set; } = 2.0m;
}

