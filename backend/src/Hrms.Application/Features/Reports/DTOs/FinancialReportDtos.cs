namespace Hrms.Application.Features.Reports.DTOs;

/// <summary>
/// DTO รายการภาษีหัก ณ ที่จ่าย และประกันสังคมรายบุคคล
/// </summary>
public class PayrollTaxItemDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string CitizenIdMasked { get; set; } = string.Empty;
    public decimal GrossIncome { get; set; }
    public decimal WithholdingTax { get; set; }
    public decimal SsoEmployee { get; set; }
    public decimal SsoEmployer { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal NetSalary { get; set; }
}

/// <summary>
/// DTO สรุปภาพรวมรายงานภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) ประจำเดือน
/// </summary>
public class PayrollTaxSummaryDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public long? PeriodId { get; set; }
    public string PeriodStatus { get; set; } = string.Empty;
    public int TotalEmployees { get; set; }
    public int TaxableEmployeesCount { get; set; }
    public decimal TotalGrossIncome { get; set; }
    public decimal TotalWithholdingTax { get; set; }
    public decimal TotalSsoEmployee { get; set; }
    public decimal TotalSsoEmployer { get; set; }
    public decimal TotalSsoRemittance { get; set; }
    public decimal TotalNetSalary { get; set; }
    public List<PayrollTaxItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO อัตราการเข้า-ออกของพนักงานจำแนกตามแผนก
/// </summary>
public class DepartmentTurnoverDto
{
    public long DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string DivisionName { get; set; } = string.Empty;
    public int BeginningHeadcount { get; set; }
    public int JoinedCount { get; set; }
    public int ResignedCount { get; set; }
    public int EndingHeadcount { get; set; }
    public double TurnoverRate { get; set; }
    public double RetentionRate { get; set; }
}

/// <summary>
/// DTO ประวัติการเคลื่อนไหวพนักงาน (เข้าใหม่ / ลาออก / เลิกจ้าง) ในรอบเดือน
/// </summary>
public class TurnoverEventLogDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty; // JOINED, RESIGNED, TERMINATED
    public DateOnly EventDate { get; set; }
    public string? Reason { get; set; }
}

/// <summary>
/// DTO ภาพรวมรายงานอัตราการเข้า-ออกของพนักงานประจำเดือน
/// </summary>
public class MonthlyTurnoverSummaryDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalBeginningHeadcount { get; set; }
    public int TotalJoinedCount { get; set; }
    public int TotalResignedCount { get; set; }
    public int TotalEndingHeadcount { get; set; }
    public double OverallTurnoverRate { get; set; }
    public double OverallRetentionRate { get; set; }
    public List<DepartmentTurnoverDto> DepartmentTurnovers { get; set; } = new();
    public List<TurnoverEventLogDto> EventLogs { get; set; } = new();
}
