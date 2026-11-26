using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติการตรวจสอบการใช้งานระบบ (Audit Trail / Activity Log)
/// บันทึกการกระทำต่างๆ เช่น INSERT, UPDATE, DELETE, VIEW, DOWNLOAD, EXPORT, LOGIN, LOGOUT, LOGIN_FAILED, APPROVE, REJECT
/// พร้อมรองรับ Change Data Capture (CDC), Snapshot ผู้กระทำ, เจ้าของข้อมูล (Write-time Subject) และ Metadata JSONB ตามมาตรฐาน PDPA
/// แมปกับตาราง hrms.audit_log
/// </summary>
public class AuditLog : BaseEntity
{
    public long? UserId { get; set; }

    /// <summary>ประเภทผู้กระทำ: USER, SYSTEM, API, ANONYMOUS</summary>
    public string ActorType { get; set; } = "USER";

    /// <summary>Snapshot ชื่อบัญชีผู้กระทำ ณ เวลาเกิดเหตุการณ์ (ไม่หายแม้บัญชีถูกระงับ)</summary>
    public string? ActorUsername { get; set; }

    /// <summary>Snapshot ชื่อ-นามสกุลผู้กระทำ ณ เวลาเกิดเหตุการณ์</summary>
    public string? ActorName { get; set; }

    /// <summary>Snapshot บทบาทของผู้กระทำ ณ เวลาเกิดเหตุการณ์ (คั่นด้วยจุลภาค เช่น ADMIN, HR_MANAGER)</summary>
    public string? ActorRole { get; set; }

    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public long? EntityId { get; set; }
    public string? FieldName { get; set; }
    public string? OldValue { get; set; } // jsonb serialized in db
    public string? NewValue { get; set; } // jsonb serialized in db

    /// <summary>ข้อมูลโครงสร้างเสริม (jsonb) เช่น สถิติงานกลุ่ม (bulk), จำนวนแถวที่ส่งออก, ชื่อไฟล์, รายชื่อฟิลด์อ่อนไหว</summary>
    public string? Metadata { get; set; }

    /// <summary>รหัสพนักงานเจ้าของข้อมูลที่ถูกกระทำ (คำนวณตั้งแต่ตอนเขียน Log เพื่อใช้ทำ Index และ Data Scope)</summary>
    public long? SubjectEmployeeId { get; set; }

    /// <summary>Snapshot รหัสพนักงานเจ้าของข้อมูล ณ เวลาเกิดเหตุการณ์</summary>
    public string? SubjectEmployeeCode { get; set; }

    /// <summary>Snapshot ชื่อ-นามสกุลพนักงานเจ้าของข้อมูล ณ เวลาเกิดเหตุการณ์</summary>
    public string? SubjectEmployeeName { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual UserAccount? User { get; set; }
    public virtual Employee? SubjectEmployee { get; set; }
}
