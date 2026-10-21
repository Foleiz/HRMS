using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// รายการค่าคอมมิชชั่นรายวัน/รายช่วงของพนักงาน — แหล่งข้อมูลจริงของยอดรวมรายเดือน (EmployeeCommission)
/// แมปกับตาราง hrms.employee_commission_entry
/// </summary>
public class EmployeeCommissionEntry : BaseEntity
{
    public long EmployeeId { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
    public decimal SalesAmount { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal SpecialAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public string Source { get; set; } = "FILE"; // FILE, MANUAL, ADJUST, LEGACY
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, SUPERSEDED, REVERTED, REMOVED
    public long? BatchId { get; set; }
    public long? SupersededByBatchId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Employee? Employee { get; set; }
    public virtual CommissionImportBatch? Batch { get; set; }
}
