namespace Hrms.Application.Features.Payroll.DTOs;

public class EmployeeSalaryDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public decimal BaseSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? Reason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdjustEmployeeSalaryRequest
{
    public decimal BaseSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public string? Reason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
}

public class BulkAdjustEmployeeSalaryItemRequest
{
    public long EmployeeId { get; set; }
    public decimal BaseSalary { get; set; }
}

public class BulkAdjustEmployeeSalaryRequest
{
    public List<BulkAdjustEmployeeSalaryItemRequest> Items { get; set; } = new();
    public DateOnly EffectiveFrom { get; set; }
    public string? Reason { get; set; }
    public long? ApprovedByEmployeeId { get; set; }
}

public class BulkAdjustEmployeeSalaryResultDto
{
    public int AdjustedCount { get; set; }
    public List<EmployeeSalaryDto> Results { get; set; } = new();
}

public class EmployeeSalaryOverviewDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string? LevelName { get; set; }
    public decimal? CurrentSalary { get; set; }
    public DateOnly? CurrentEffectiveFrom { get; set; }
    /// <summary>การปรับเงินเดือนที่ตั้งล่วงหน้าไว้ (มีผลหลังวันนี้)</summary>
    public decimal? PendingSalary { get; set; }
    public DateOnly? PendingEffectiveFrom { get; set; }
    /// <summary>ปี ค.ศ. และวันที่มีผลของการปรับฐานเงินเดือนล่าสุด (มีค่าเมื่อ SalaryRecordCount > 1)</summary>
    public int? LastAdjustedYear { get; set; }
    public DateOnly? LastAdjustedEffectiveFrom { get; set; }
    public decimal? SalaryStructureMin { get; set; }
    public decimal? SalaryStructureMax { get; set; }
    public int SalaryRecordCount { get; set; }
}
