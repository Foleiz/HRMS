namespace Hrms.Domain.Entities;

/// <summary>
/// กำหนดขอบเขตการมองเห็นข้อมูลของแต่ละ Role ในสิทธิ์นั้นๆ (Data Scoping)
/// เช่น สิทธิ์ดูข้อมูลพนักงาน (EMP_VIEW):
/// - SuperAdmin มองเห็นระดับ ORGANIZATION (ทั้งบริษัท)
/// - Dept Manager มองเห็นระดับ DEPARTMENT (เฉพาะแผนกตนเอง)
/// - Staff มองเห็นระดับ SELF (เฉพาะข้อมูลตนเอง)
/// แมปกับตาราง hrms.role_data_scope
/// </summary>
public class RoleDataScope
{
    public long RoleId { get; set; }
    public long PermissionId { get; set; }
    public string DataVisibilityScope { get; set; } = "SELF"; // ORGANIZATION, DIVISION, DEPARTMENT, TEAM, SELF

    // Navigation Properties
    public virtual Role Role { get; set; } = null!;
    public virtual Permission Permission { get; set; } = null!;
}
