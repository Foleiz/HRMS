namespace Hrms.Application.Features.Transfers.DTOs;

/// <summary>
/// DTO สำหรับแสดงข้อมูลคำขอย้ายแผนก/การเลื่อนตำแหน่ง
/// </summary>
public class EmployeeTransferDto
{
    public long Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    public string TransferType { get; set; } = string.Empty;
    public string TransferTypeDisplay { get; set; } = string.Empty;

    // ข้อมูลเดิม
    public long? FromDivisionId { get; set; }
    public string FromDivisionName { get; set; } = string.Empty;
    public long? FromDepartmentId { get; set; }
    public string FromDepartmentName { get; set; } = string.Empty;
    public long? FromPositionId { get; set; }
    public string FromPositionName { get; set; } = string.Empty;
    public string FromDisplay { get; set; } = string.Empty;
    public string? FromManagerName { get; set; }

    // ข้อมูลใหม่
    public long? ToDivisionId { get; set; }
    public string ToDivisionName { get; set; } = string.Empty;
    public long ToDepartmentId { get; set; }
    public string ToDepartmentName { get; set; } = string.Empty;
    public long ToPositionId { get; set; }
    public string ToPositionName { get; set; } = string.Empty;
    public string ToDisplay { get; set; } = string.Empty;
    public string? ToManagerName { get; set; }

    public DateOnly EffectiveDate { get; set; }
    public string EffectiveDateDisplay { get; set; } = string.Empty; // e.g. "01/09/2569"
    public string Status { get; set; } = string.Empty; // PENDING, APPROVED, REJECTED
    public string StatusDisplay { get; set; } = string.Empty;
    public string? OrderNo { get; set; }
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
}
