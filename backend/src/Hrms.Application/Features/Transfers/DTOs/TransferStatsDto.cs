namespace Hrms.Application.Features.Transfers.DTOs;

/// <summary>
/// DTO สำหรับการ์ด KPI สถิติ 3 ใบในหน้าหลัก
/// </summary>
public class TransferStatsDto
{
    /// <summary>
    /// คำขอรออนุมัติ (Pending requests)
    /// </summary>
    public int PendingRequestsCount { get; set; }

    /// <summary>
    /// ย้ายแผนกเดือนนี้ (Department transfers this month)
    /// </summary>
    public int TransfersThisMonthCount { get; set; }

    /// <summary>
    /// เลื่อนตำแหน่งเดือนนี้ (Promotions this month)
    /// </summary>
    public int PromotionsThisMonthCount { get; set; }
}
