namespace Hrms.Application.Features.Settings.Dtos;

/// <summary>
/// ข้อมูลบันทึกประวัติการใช้งานระบบ (Audit Trail Log)
/// </summary>
public class AuditLogDto
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string ActorType { get; set; } = "USER"; // USER, SYSTEM, API, ANONYMOUS
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? ActorRole { get; set; }
    public string Action { get; set; } = string.Empty; // LOGIN, LOGIN_FAILED, LOGOUT, INSERT, UPDATE, DELETE, VIEW, DOWNLOAD, EXPORT, APPROVE, REJECT, CLEANUP
    public string EntityType { get; set; } = string.Empty;
    public long? EntityId { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Metadata { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>เจ้าของข้อมูลที่ถูกกระทำ (พนักงาน) — null ถ้าไม่ใช่ข้อมูลของพนักงานคนใดคนหนึ่ง</summary>
    public long? SubjectEmployeeId { get; set; }
    public string? SubjectEmployeeCode { get; set; }
    public string? SubjectEmployeeName { get; set; }
}

/// <summary>ผลค้นหา employee_id ของแถวข้อมูล (ใช้เป็น Fallback สำหรับแถวเก่าก่อนอัปเกรด)</summary>
public class AuditRowOwner
{
    public long Id { get; set; }
    public long? EmployeeId { get; set; }
}

/// <summary>
/// ตัวกรองสำหรับสืบค้นบันทึกการใช้งานระบบ
/// </summary>
public class AuditLogQueryFilter
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public long? UserId { get; set; }
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
