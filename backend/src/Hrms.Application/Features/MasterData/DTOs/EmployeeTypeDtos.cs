namespace Hrms.Application.Features.MasterData.DTOs;

public class EmployeeTypeDto
{
    public long Id { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string WageType { get; set; } = "MONTHLY";
    public bool HasSocialSecurity { get; set; } = true;
    public bool HasLeaveEntitlement { get; set; } = true;
    public bool HasOvertime { get; set; } = true;
    public bool HasProvidentFund { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int ActiveContractsCount { get; set; }
}

public class CreateEmployeeTypeRequest
{
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string WageType { get; set; } = "MONTHLY";
    public bool HasSocialSecurity { get; set; } = true;
    public bool HasLeaveEntitlement { get; set; } = true;
    public bool HasOvertime { get; set; } = true;
    public bool HasProvidentFund { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateEmployeeTypeRequest
{
    public string TypeName { get; set; } = string.Empty;
    public string WageType { get; set; } = "MONTHLY";
    public bool HasSocialSecurity { get; set; } = true;
    public bool HasLeaveEntitlement { get; set; } = true;
    public bool HasOvertime { get; set; } = true;
    public bool HasProvidentFund { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
}

public class EmployeeTypeStatsDto
{
    public int TotalTypes { get; set; }
    public int MonthlyWageCount { get; set; }
    public int OtherWageCount { get; set; }
    public int ActiveCount { get; set; }
}
