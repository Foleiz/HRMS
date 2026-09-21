namespace Hrms.Application.Features.Payroll.DTOs;

public class MySalaryOverviewDto
{
    public decimal LatestNetPay { get; set; }
    public decimal LatestGrossIncome { get; set; }
    public decimal LatestTotalDeductions { get; set; }
    public decimal YtdTotalGross { get; set; }
    public string YtdPeriodRange { get; set; } = string.Empty;
    public string GrossSubtext { get; set; } = string.Empty;
    public string DeductionSubtext { get; set; } = string.Empty;
    public string BankAccountMasked { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public List<MySalarySlipItemDto> History { get; set; } = new();
    public MySalaryChartDataDto ChartData { get; set; } = new();
}

public class MySalarySlipItemDto
{
    public long PayrollId { get; set; }
    public long PeriodId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string PeriodMonthName { get; set; } = string.Empty;
    public decimal TotalGrossIncome { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal NetPayableSalary { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string PaymentDateThai { get; set; } = string.Empty;
    public string Status { get; set; } = "ปกติ";
}

public class MySalaryChartDataDto
{
    // Donut / Pie Chart proportions
    public decimal BaseSalaryAmount { get; set; }
    public decimal OvertimeAmount { get; set; }
    public decimal AllowanceAmount { get; set; }
    public decimal BonusAmount { get; set; }
    public decimal DeductionsAmount { get; set; }

    // Monthly Bar Chart trends (recent up to 6 months)
    public List<MonthlySalaryTrendDto> MonthlyTrends { get; set; } = new();
}

public class MonthlySalaryTrendDto
{
    public string MonthLabel { get; set; } = string.Empty;
    public decimal GrossIncome { get; set; }
    public decimal Deductions { get; set; }
    public decimal NetPay { get; set; }
}

public class MySalaryDetailDto
{
    public long PayrollId { get; set; }
    public long PeriodId { get; set; }
    public string PeriodMonthName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankAccountMasked { get; set; } = string.Empty;
    public string PaymentDateThai { get; set; } = string.Empty;
    public decimal TotalGrossIncome { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal NetPayableSalary { get; set; }
    public List<MySalaryLineItemDto> Earnings { get; set; } = new();
    public List<MySalaryLineItemDto> Deductions { get; set; } = new();
}

public class MySalaryLineItemDto
{
    public string ItemName { get; set; } = string.Empty;
    public string ItemType { get; set; } = "EARNING"; // EARNING / DEDUCTION
    public decimal Amount { get; set; }
    public string? SubDescription { get; set; }
}
