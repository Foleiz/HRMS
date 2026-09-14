namespace Hrms.Application.Features.Leave.DTOs;

public record LeaveBalanceDto
{
    public long Id { get; init; }
    public long EmployeeId { get; init; }
    public string EmployeeCode { get; init; } = string.Empty;
    public string EmployeeName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string PositionTitle { get; init; } = string.Empty;
    
    public long LeaveTypeId { get; init; }
    public string LeaveTypeCode { get; init; } = string.Empty;
    public string LeaveTypeName { get; init; } = string.Empty;

    public int Year { get; init; }
    public decimal BroughtForwardDays { get; init; }
    public decimal AnnualQuotaDays { get; init; }
    public decimal ActiveCarriedForwardDays { get; init; }
    public decimal UsedDays { get; init; }
    public decimal AdjustedDays { get; init; }
    public decimal NetRemainingLeaveDays { get; init; }
    public DateOnly? CarryForwardExpiry { get; init; }
}

public record LeaveBalanceAdjustmentRequest
{
    public long LeaveBalanceId { get; init; }
    public decimal Amount { get; init; } // positive or negative
    public string Reason { get; init; } = string.Empty;
}

public record LeaveBalanceTransactionDto
{
    public long Id { get; init; }
    public long LeaveBalanceId { get; init; }
    public string TransactionType { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string? ReferenceType { get; init; }
    public long? ReferenceId { get; init; }
    public string? Note { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? CreatedByEmployeeName { get; init; }
}

public record InitializeYearBalanceRequest
{
    public int TargetYear { get; init; }
}

public record InitializeYearBalanceResultDto
{
    public int TargetYear { get; init; }
    public int ProcessedEmployeesCount { get; init; }
    public int CreatedBalancesCount { get; init; }
    public string Message { get; init; } = string.Empty;
}
