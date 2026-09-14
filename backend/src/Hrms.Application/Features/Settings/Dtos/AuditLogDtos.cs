namespace Hrms.Application.Features.Settings.Dtos;

/// <summary>
/// ข้อมูลบันทึกประวัติการใช้งานระบบ (Audit Trail Log)
/// </summary>
public class AuditLogDto
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // LOGIN, LOGOUT, INSERT, UPDATE, DELETE, APPROVE, REJECT, EXPORT
    public string EntityType { get; set; } = string.Empty;
    public long? EntityId { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IpAddress { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
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
    public int PageSize { get; set; } = 15;
}
