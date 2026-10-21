using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ชุดนำเข้าไฟล์ค่าคอมมิชชั่น (ประวัติการนำเข้า)
/// แมปกับตาราง hrms.commission_import_batch
/// </summary>
public class CommissionImportBatch : BaseEntity
{
    public string? FileName { get; set; }
    public string? FileHash { get; set; }
    public string DetectedType { get; set; } = "MONTH"; // MONTH, DAY, RANGE
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailedRows { get; set; }
    public int EmployeeCount { get; set; }
    public int ReplacedEntries { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "IMPORTED"; // IMPORTED, PARTIAL, FAILED, REVERTED
    public string? ErrorsJson { get; set; }
    public long? ImportedByUserId { get; set; }
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevertedAt { get; set; }
    public long? RevertedByUserId { get; set; }

    public virtual UserAccount? ImportedByUser { get; set; }
    public virtual UserAccount? RevertedByUser { get; set; }
}
