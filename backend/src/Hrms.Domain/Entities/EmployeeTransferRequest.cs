using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// คำขอย้ายแผนกและการเลื่อนตำแหน่ง (Department Transfer & Promotion Request)
/// แมปกับตาราง hrms.employee_transfer_request
/// </summary>
public class EmployeeTransferRequest : BaseEntity
{
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string TransferType { get; set; } = "DEPARTMENT_TRANSFER"; // DEPARTMENT_TRANSFER, PROMOTION, TRANSFER_AND_PROMOTION, PROMOTION_AND_SUPERVISOR
    
    // ข้อมูลต้นทาง
    public long? FromDivisionId { get; set; }
    public long? FromDepartmentId { get; set; }
    public long? FromPositionId { get; set; }
    public long? FromManagerId { get; set; }
    
    // ข้อมูลปลายทาง
    public long? ToDivisionId { get; set; }
    public long ToDepartmentId { get; set; }
    public long ToPositionId { get; set; }
    public long? ToManagerId { get; set; }
    
    public DateOnly EffectiveDate { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED
    public string? OrderNo { get; set; }
    public string? Reason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public long? ApprovedBy { get; set; }

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual Division? FromDivision { get; set; }
    public virtual Department? FromDepartment { get; set; }
    public virtual Position? FromPosition { get; set; }
    public virtual Employee? FromManager { get; set; }

    public virtual Division? ToDivision { get; set; }
    public virtual Department? ToDepartment { get; set; }
    public virtual Position? ToPosition { get; set; }
    public virtual Employee? ToManager { get; set; }
}
