using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติการตรวจสอบการใช้งานระบบ (Audit Trail / Activity Log)
/// บันทึกการกระทำต่างๆ เช่น INSERT, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, EXPORT
/// พร้อมรองรับ Change Data Capture (CDC: ค่าเดิม vs ค่าใหม่) และ IP Address ตามมาตรฐาน PDPA
/// แมปกับตาราง hrms.audit_log
/// </summary>
public class AuditLog : BaseEntity
{
    public long? UserId { get; set; }
    public string Action { get; set; } = string.Empty; // INSERT, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, EXPORT
    public string EntityType { get; set; } = string.Empty;
    public long? EntityId { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; } // jsonb serialized in db
    public string? NewValue { get; set; } // jsonb serialized in db
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual UserAccount? User { get; set; }
}
