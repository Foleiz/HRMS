namespace Hrms.Application.Features.Leave.DTOs;

public record LeavePolicyDto
{
    public long Id { get; init; }
    public long LeaveTypeId { get; init; }
    public string LeaveTypeCode { get; init; } = string.Empty;
    public string LeaveTypeName { get; init; } = string.Empty;
    
    public long? EmployeeTypeId { get; init; }
    public string? EmployeeTypeName { get; init; }
    
    public long? EmployeeLevelId { get; init; }
    public string? EmployeeLevelName { get; init; }

    public decimal EntitlementDays { get; init; }
    public int MinimumServiceDays { get; init; }
    public int AdvanceRequestDays { get; init; }
    public bool IsCarryForwardAllowed { get; init; }
    public int? CarryForwardMaxMonths { get; init; }
    public int? CarryForwardExpiryMonths { get; init; }
    public bool IsDocumentRequired { get; init; }
    public decimal? DocumentRequiredAfterDays { get; init; }
    public bool IsAllowedDuringProbation { get; init; }
    public DateOnly EffectiveFrom { get; init; }
    public DateOnly? EffectiveTo { get; init; }
    public int? MaxLifetimeOccurrences { get; init; }
    public decimal? MaxDaysPerOccurrence { get; init; }
    public int? MaxOccurrencesPerYear { get; init; }
    public decimal? CarryForwardMaxDays { get; init; }
    public int? DocumentGraceDays { get; init; }
    public string ProrationMethod { get; init; } = "FULL";
    public bool IncludeHolidays { get; init; } = false;
}

public record CreateLeavePolicyRequest
{
    public long LeaveTypeId { get; init; }
    public long? EmployeeTypeId { get; init; }
    public long? EmployeeLevelId { get; init; }
    public decimal EntitlementDays { get; init; }
    public int MinimumServiceDays { get; init; } = 0;
    public int AdvanceRequestDays { get; init; } = 0;
    public bool IsCarryForwardAllowed { get; init; } = false;
    public int? CarryForwardMaxMonths { get; init; }
    public int? CarryForwardExpiryMonths { get; init; }
    public bool IsDocumentRequired { get; init; } = false;
    public decimal? DocumentRequiredAfterDays { get; init; }
    public bool IsAllowedDuringProbation { get; init; } = false;
    public DateOnly EffectiveFrom { get; init; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? EffectiveTo { get; init; }
    public int? MaxLifetimeOccurrences { get; init; }
    public decimal? MaxDaysPerOccurrence { get; init; }
    public int? MaxOccurrencesPerYear { get; init; }
    public decimal? CarryForwardMaxDays { get; init; }
    public int? DocumentGraceDays { get; init; }
    public string ProrationMethod { get; init; } = "FULL";
    public bool IncludeHolidays { get; init; } = false;
}

public record UpdateLeavePolicyRequest
{
    public long? EmployeeTypeId { get; init; }
    public long? EmployeeLevelId { get; init; }
    public decimal EntitlementDays { get; init; }
    public int MinimumServiceDays { get; init; }
    public int AdvanceRequestDays { get; init; }
    public bool IsCarryForwardAllowed { get; init; }
    public int? CarryForwardMaxMonths { get; init; }
    public int? CarryForwardExpiryMonths { get; init; }
    public bool IsDocumentRequired { get; init; }
    public decimal? DocumentRequiredAfterDays { get; init; }
    public bool IsAllowedDuringProbation { get; init; }
    /// <summary>null = คงวันที่มีผลเดิมไว้</summary>
    public DateOnly? EffectiveFrom { get; init; }
    public DateOnly? EffectiveTo { get; init; }
    public int? MaxLifetimeOccurrences { get; init; }
    public decimal? MaxDaysPerOccurrence { get; init; }
    public int? MaxOccurrencesPerYear { get; init; }
    public decimal? CarryForwardMaxDays { get; init; }
    public int? DocumentGraceDays { get; init; }
    public string ProrationMethod { get; init; } = "FULL";
    public bool IncludeHolidays { get; init; } = false;
}
public record LeaveHolidaySettingsDto
{
    public bool IncludeHolidays { get; init; }
}

public record UpdateLeaveHolidaySettingsRequest
{
    public bool IncludeHolidays { get; init; }
    /// <summary>อัปเดตสิทธิ์การลาทุกประเภทที่มีอยู่ให้ตรงกับค่าบริษัททันทีหรือไม่ (ค่าเริ่มต้น true)</summary>
    public bool ApplyToExistingPolicies { get; init; } = true;
}