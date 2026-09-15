namespace Hrms.Application.Features.Payroll.DTOs;

public class PayrollOverviewDto
{
    public decimal CurrentMonthTotal { get; set; } = 1842300;
    public string CurrentMonthPeriod { get; set; } = "รอบ ส.ค. 2569";
    public int CalculatedEmployeesCount { get; set; } = 118;
    public int TotalEmployeesCount { get; set; } = 145;
    public int CalculatedPercentage { get; set; } = 81;
    public int PendingApprovalCount { get; set; } = 27;
    public string NextClosingDate { get; set; } = "29 ส.ค. 2569";
    public int RemainingDays { get; set; } = 2;
    public List<RecentPayrollPeriodDto> RecentPeriods { get; set; } = new();
}

public class RecentPayrollPeriodDto
{
    public string PeriodName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusText { get; set; } = string.Empty;
}

public class PayrollItemDto
{
    public long Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ItemType { get; set; } = "EARNING";
    public string CalculationType { get; set; } = "FIXED";
    public string? FormulaTemplate { get; set; }
    public string? FormulaValue { get; set; }
    public bool IsTaxable { get; set; }
    public bool IsSocialSecurityCalculated { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class CreatePayrollItemRequest
{
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ItemType { get; set; } = "EARNING";
    public string CalculationType { get; set; } = "FIXED";
    public string? FormulaTemplate { get; set; }
    public string? FormulaValue { get; set; }
    public bool IsTaxable { get; set; } = true;
    public bool IsSocialSecurityCalculated { get; set; } = true;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdatePayrollItemRequest
{
    public string ItemName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CalculationType { get; set; } = "FIXED";
    public string? FormulaTemplate { get; set; }
    public string? FormulaValue { get; set; }
    public bool IsTaxable { get; set; }
    public bool IsSocialSecurityCalculated { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
