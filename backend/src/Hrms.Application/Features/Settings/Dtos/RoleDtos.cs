namespace Hrms.Application.Features.Settings.Dtos;

/// <summary>
/// ข้อมูลสรุปบทบาทผู้ใช้งาน
/// </summary>
public class RoleSummaryDto
{
    public long Id { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public int UserCount { get; set; }
    public bool IsSystemDefault { get; set; }
    public DateTime? LastModifiedAt { get; set; }
}

/// <summary>
/// รายละเอียดบทบาทพร้อมตาราง Permission & Data Scope Matrix
/// </summary>
public class RoleDetailDto
{
    public long Id { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public bool IsSystemDefault { get; set; }
    public DateTime? LastModifiedAt { get; set; }
    public List<ModulePermissionScopeDto> Modules { get; set; } = new();
}

/// <summary>
/// สิทธิ์การกระทำ 4 ประการ (ดู, สร้าง, แก้ไข, อนุมัติ) ในขอบเขตข้อมูลที่กำหนด
/// </summary>
public class ScopeActionPermissionsDto
{
    public bool View { get; set; }
    public bool Create { get; set; }
    public bool Edit { get; set; }
    public bool Approve { get; set; }
}

/// <summary>
/// การกำหนดสิทธิ์ระดับโมดูล (Scope + Actions: View, Create, Edit, Approve)
/// </summary>
public class ModulePermissionScopeDto
{
    public string ModuleCode { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string? GroupName { get; set; }
    public string? CategoryCode { get; set; }
    public string? CategoryName { get; set; }

    // สิทธิ์การกระทำแยกอิสระตามแต่ละระดับขอบเขตข้อมูล (Independent Checkboxes)
    public ScopeActionPermissionsDto Self { get; set; } = new();
    public ScopeActionPermissionsDto Team { get; set; } = new();
    public ScopeActionPermissionsDto Department { get; set; } = new();
    public ScopeActionPermissionsDto Division { get; set; } = new();
    public ScopeActionPermissionsDto Organization { get; set; } = new();

    // Backward compatibility properties
    public string DataScope { get; set; } = "SELF";
    public string? ViewScope { get; set; }
    public string? CreateScope { get; set; }
    public string? EditScope { get; set; }
    public string? ApproveScope { get; set; }
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanApprove { get; set; }
}

/// <summary>
/// คำขอสร้างบทบาทใหม่
/// </summary>
public class CreateRoleRequestDto
{
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

/// <summary>
/// คำขอแก้ไขข้อมูลพื้นฐานของบทบาท
/// </summary>
public class UpdateRoleRequestDto
{
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

/// <summary>
/// คำขอบันทึกสิทธิ์การใช้งาน (Batch Update Matrix)
/// </summary>
public class UpdateRoleMatrixRequestDto
{
    public List<ModulePermissionScopeDto> Modules { get; set; } = new();
}
