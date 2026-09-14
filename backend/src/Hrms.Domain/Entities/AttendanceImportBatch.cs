using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ชุดข้อมูลการนำเข้าเวลาบันทึกเวลา/สแกนนิ้ว (Attendance Import Batch)
/// แมปกับตาราง hrms.attendance_import_batch
/// </summary>
public class AttendanceImportBatch : BaseEntity
{
    public string? FileName { get; set; }
    public string? FileHash { get; set; }
    public byte[]? FileData { get; set; }
    public string? Source { get; set; } // FINGERPRINT, FACE_SCAN, EXCEL, CSV, EXTERNAL
    public string? DeviceName { get; set; }
    public string? UnitName { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public DateTime? ExportedAt { get; set; }
    public long? ImportedByUserId { get; set; }
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
    public int? TotalRecords { get; set; } = 0;
    public int? SuccessRecords { get; set; } = 0;
    public int? FailedRecords { get; set; } = 0;
    public string Status { get; set; } = "IMPORTED"; // IMPORTED, PARTIAL, FAILED

    // Navigation Properties
    public virtual UserAccount? ImportedByUser { get; set; }
    public virtual ICollection<AttendanceImportError> Errors { get; set; } = new List<AttendanceImportError>();
}
