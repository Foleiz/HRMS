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
    public string? LogoData { get; set; }
    public long? CeoEmployeeId { get; set; }
    public string? CeoEmployeeName { get; set; }
    public string? CeoEmployeeCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateCompanyDto
{
    public string CompanyName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public string? LogoData { get; set; }
    public long? CeoEmployeeId { get; set; }
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateDivisionDto
{
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? DivisionCode { get; set; }
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateDepartmentDto
{
    public long DivisionId { get; set; }
    public long? ParentDepartmentId { get; set; }
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? DepartmentCode { get; set; }
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
    /// <summary>อัตรากำลังที่อนุมัติ (null = ไม่กำหนด)</summary>
    public int? HeadcountPlan { get; set; }
    /// <summary>จำนวนพนักงานที่ทำงานอยู่ในตำแหน่งนี้ตอนนี้</summary>
    public int FilledCount { get; set; }
    /// <summary>อัตราว่าง (null = ไม่กำหนดอัตรากำลัง)</summary>
    public int? VacantCount => HeadcountPlan.HasValue ? Math.Max(0, HeadcountPlan.Value - FilledCount) : null;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePositionDto
{
    public long DepartmentId { get; set; }
    public long? EmployeeLevelId { get; set; }
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? PositionCode { get; set; }
    public string PositionName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
    public int? HeadcountPlan { get; set; }
}

public class UpdatePositionDto
{
    public long DepartmentId { get; set; }
    public long? EmployeeLevelId { get; set; }
    public string PositionName { get; set; } = string.Empty;
    public string Status { get; set; } = "ACTIVE";
    public int? HeadcountPlan { get; set; }
}
#endregion

#region EmployeeLevel DTOs
public class EmployeeLevelDto
{
    public long Id { get; set; }
    public string LevelCode { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
    public int? LevelRank { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class CreateEmployeeLevelDto
{
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? LevelCode { get; set; }
    public string LevelName { get; set; } = string.Empty;
    public int? LevelRank { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateEmployeeLevelDto
{
    public string LevelName { get; set; } = string.Empty;
    public int? LevelRank { get; set; }
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

#region Org Chart DTOs
/// <summary>บุคคลในแผนผังองค์กร — ส่งเฉพาะข้อมูลที่เปิดเผยได้ (ไม่มีเบอร์/อีเมลส่วนตัว)</summary>
public class OrgChartPersonDto
{
    public long Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PositionName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? WorkEmail { get; set; }
}

public class OrgChartDepartmentDto
{
    public long Id { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    /// <summary>หัวหน้าแผนก (null = ตำแหน่งว่าง)</summary>
    public OrgChartPersonDto? Head { get; set; }
    /// <summary>พนักงานในแผนก (ไม่รวมผู้ที่แสดงเป็นหัวหน้าในแผนผังแล้ว)</summary>
    public List<OrgChartPersonDto> Members { get; set; } = new();
    /// <summary>จำนวนพนักงานที่สังกัดแผนกนี้จริง (รวมหัวหน้าถ้าสังกัดแผนกนี้)</summary>
    public int ActiveCount { get; set; }
    /// <summary>อัตรากำลังตามแผน = ผลรวม headcount_plan ของตำแหน่งในแผนก (null = ยังไม่กำหนด)</summary>
    public int? HeadcountPlan { get; set; }
    public List<OrgChartDepartmentDto> SubDepartments { get; set; } = new();
}

public class OrgChartDivisionDto
{
    public long Id { get; set; }
    public string DivisionCode { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public OrgChartPersonDto? Head { get; set; }
    public int ActiveCount { get; set; }
    public List<OrgChartDepartmentDto> Departments { get; set; } = new();
}

public class OrgChartDto
{
    public string CompanyName { get; set; } = string.Empty;
    public OrgChartPersonDto? Ceo { get; set; }
    public List<OrgChartDivisionDto> Divisions { get; set; } = new();
    /// <summary>พนักงานที่ยังไม่มีสังกัด (ไม่มีตำแหน่งปัจจุบัน หรือสังกัดแผนก/ฝ่ายที่ปิดใช้งาน)</summary>
    public List<OrgChartPersonDto> Unassigned { get; set; } = new();
    public int TotalEmployees { get; set; }
    public int TotalDepartments { get; set; }
}
#endregion
