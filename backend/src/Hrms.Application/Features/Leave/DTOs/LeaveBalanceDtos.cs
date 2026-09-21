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

public record LeaveCardItemDto
{
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public decimal UsedDays { get; init; }
    public decimal QuotaDays { get; init; }
    public decimal RemainingDays { get; init; }
    public decimal? UsedTimes { get; init; }
    public decimal? MaxTimes { get; init; }
    public string Unit { get; init; } = "วัน";
}

public record MyLeaveSummaryDto
{
    public long EmployeeId { get; init; }
    public string EmployeeCode { get; init; } = string.Empty;
    public string EmployeeName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string PositionTitle { get; init; } = string.Empty;
    public int Year { get; init; }
    public int YearThai { get; init; }

    public LeaveCardItemDto SickLeave { get; init; } = new();
    public LeaveCardItemDto PersonalLeave { get; init; } = new();
    public LeaveCardItemDto AnnualLeave { get; init; } = new();
    public LeaveCardItemDto SpecialLeave { get; init; } = new();
    public LeaveCardItemDto OrdinationLeave { get; init; } = new();
    public LeaveCardItemDto MilitaryLeave { get; init; } = new();
    public LeaveCardItemDto MaternityLeave { get; init; } = new();
    public decimal TotalOvertimeHours { get; init; }

    public List<LeaveBalanceDto> AllBalances { get; init; } = new();
}

