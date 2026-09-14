using System.ComponentModel.DataAnnotations;

namespace Hrms.Application.Features.Transfers.DTOs;

/// <summary>
/// DTO สำหรับสร้างคำขอย้ายแผนก/การเลื่อนตำแหน่ง
/// </summary>
public class CreateEmployeeTransferRequest
{
    [Required(ErrorMessage = "กรุณาระบุพนักงาน")]
    public long EmployeeId { get; set; }

    [Required(ErrorMessage = "กรุณาระบุประเภทคำขอ")]
    public string TransferType { get; set; } = "DEPARTMENT_TRANSFER"; // DEPARTMENT_TRANSFER, PROMOTION, TRANSFER_AND_PROMOTION, PROMOTION_AND_SUPERVISOR

    // ปลายทาง
    public long? ToDivisionId { get; set; }

    [Required(ErrorMessage = "กรุณาระบุแผนกเป้าหมาย")]
    public long ToDepartmentId { get; set; }

    [Required(ErrorMessage = "กรุณาระบุตำแหน่งงานเป้าหมาย")]
    public long ToPositionId { get; set; }

    public long? ToManagerId { get; set; }

    [Required(ErrorMessage = "กรุณาระบุวันที่มีผล")]
    public DateOnly EffectiveDate { get; set; }

    public string? OrderNo { get; set; }
    public string? Reason { get; set; }

    /// <summary>
    /// หากต้องการให้อนุมัติและมีผลทันทีเมื่อสร้าง
    /// </summary>
    public bool AutoApprove { get; set; } = false;
}
