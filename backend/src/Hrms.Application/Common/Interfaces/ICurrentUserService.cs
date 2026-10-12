namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// อินเทอร์เฟซสำหรับดึงข้อมูลผู้ใช้งานที่กำลังล็อกอินอยู่ใน Request ปัจจุบัน
/// </summary>
public interface ICurrentUserService
{
    long? UserId { get; }
    string? Username { get; }
    long? EmployeeId { get; }
    List<string> Roles { get; }
    bool IsAuthenticated { get; }
    bool HasRole(string role);
    bool HasPermission(string permission);
    string GetDataScope(string permission);
    string? IpAddress { get; }
    string? UserAgent { get; }
    /// <summary>แผนกปัจจุบันของ User ที่ login (จาก JWT claim department_id)</summary>
    long? DepartmentId { get; }
    /// <summary>ฝ่ายปัจจุบันของ User ที่ login (จาก JWT claim division_id)</summary>
    long? DivisionId { get; }
    /// <summary>ทีมปัจจุบันของ User ที่ login (จาก JWT claim team_id)</summary>
    long? TeamId { get; }
}
