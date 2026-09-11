using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// บันทึกข้อผิดพลาดรายแถวของการนำเข้าเวลาบันทึกเวลา (Attendance Import Error)
/// แมปกับตาราง hrms.attendance_import_error
/// </summary>
public class AttendanceImportError : BaseEntity
{
    public long ImportBatchId { get; set; }
    public int RowNumber { get; set; }
    public string RawRowData { get; set; } = "{}"; // JSON string
    public string ErrorMessage { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public string? RawPunchTimestamp { get; set; }
    public string? DevicePunchState { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual AttendanceImportBatch Batch { get; set; } = null!;
}
