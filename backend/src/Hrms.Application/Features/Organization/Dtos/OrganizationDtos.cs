namespace Hrms.Application.Features.Organization.Dtos;

#region Company DTOs
public class CompanyDto
{
    public long Id { get; set; }
    public string CompanyCode { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime UpdatedAt { get; set; }
}

public class UpdateCompanyDto
{
    public string CompanyName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
#endregion

#region Division DTOs
public class DivisionDto
{
    public long Id { get; set; }
    public long CompanyId { get; set; }
    public string DivisionCode { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string? HeadEmployeeName { get; set; }
    public int DepartmentCount { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime UpdatedAt { get; set; }
}

public class CreateDivisionDto
{
    public string DivisionCode { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateDivisionDto
{
    public string DivisionName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
#endregion

#region Department DTOs
public class DepartmentDto
{
    public long Id { get; set; }
    public long DivisionId { get; set; }
    public string DivisionName { get; set; } = string.Empty;
    public long? ParentDepartmentId { get; set; }
    public string? ParentDepartmentName { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string? HeadEmployeeName { get; set; }
    public int PositionCount { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime UpdatedAt { get; set; }
}

public class CreateDepartmentDto
{
    public long DivisionId { get; set; }
    public long? ParentDepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateDepartmentDto
{
    public long DivisionId { get; set; }
    public long? ParentDepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public long? HeadEmployeeId { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
#endregion

#region Position DTOs
public class PositionDto
{
    public long Id { get; set; }
    public long DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public long? EmployeeLevelId { get; set; }
    public string? LevelCode { get; set; }
    public string? LevelName { get; set; }
    public string PositionCode { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
    public DateTime UpdatedAt { get; set; }
}

public class CreatePositionDto
{
    public long DepartmentId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public string PositionCode { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdatePositionDto
{
    public long DepartmentId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public string PositionName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
}
#endregion

#region EmployeeLevel DTOs
public class EmployeeLevelDto
{
    public long Id { get; set; }
    public string LevelCode { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
    public int? LevelRank { get; set; }
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public decimal? ApprovalLimit { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
#endregion

#region Summary DTO
public class OrganizationSummaryDto
{
    public int CompanyCount { get; set; }
    public int DivisionCount { get; set; }
    public int DepartmentCount { get; set; }
    public int PositionCount { get; set; }
    public int LevelCount { get; set; }
}
#endregion
