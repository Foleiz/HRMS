namespace Hrms.Domain.Common;

/// <summary>
/// คลาสแม่สำหรับ Entity ที่มี ID เป็นชนิด long (bigint ใน PostgreSQL)
/// </summary>
public abstract class BaseEntity
{
    public long Id { get; set; }
}
