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
}
