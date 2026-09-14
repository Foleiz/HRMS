namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// DTO สำหรับข้อมูลสรุปบัตรสถิติสัญญาจ้างงาน (KPI Summary Cards)
/// </summary>
public class ContractSummaryStatsDto
{
    public int ProbationCount { get; set; }
    public int PermanentCount { get; set; }
    public int ProbationExpiring7DaysCount { get; set; }
    public int TotalActiveCount { get; set; }
}
