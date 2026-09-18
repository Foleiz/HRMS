using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// กลุ่มเป้าหมายผู้รับสารของข่าวประกาศ
/// แมปกับตาราง hrms.announcement_target
/// </summary>
public class AnnouncementTarget : BaseEntity
{
    public long AnnouncementId { get; set; }
    
    /// <summary>
    /// ชนิดของเป้าหมาย: ALL (ทั้งบริษัท), DEPARTMENT, DIVISION, BRANCH, EMPLOYEE_LEVEL
    /// </summary>
    public string TargetType { get; set; } = "ALL";

    /// <summary>
    /// รหัสอ้างอิงของกลุ่มเป้าหมาย (เช่น department_id, division_id) หรือ null เมื่อ TargetType = ALL
    /// </summary>
    public long? TargetEntityId { get; set; }

    // Navigation Properties
    public virtual Announcement? Announcement { get; set; }
}
