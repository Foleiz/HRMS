namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// บริการกลางสำหรับตรวจสอบและบังคับใช้ขอบเขตการเข้าถึงข้อมูล (Data Scoping)
/// ลำดับขอบเขต: SELF (0) < TEAM (1) < DEPARTMENT (2) < DIVISION (3) < ORGANIZATION (4)
/// </summary>
public interface IDataScopeService
{
    /// <summary>
    /// ดึงขอบเขตสูงสุดของผู้ใช้ปัจจุบันสำหรับ Permission ที่ระบุ (ORGANIZATION, DIVISION, DEPARTMENT, TEAM, SELF)
    /// </summary>
    string GetScope(string permissionCode);

    /// <summary>
    /// ตรวจสอบว่าขอบเขตของผู้ใช้ปัจจุบันสำหรับ Permission ที่ระบุ มีระดับเท่ากับหรือสูงกว่า minScope หรือไม่
    /// </summary>
    bool HasScope(string permissionCode, string minScope);

    /// <summary>
    /// ตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์เข้าถึงข้อมูลของพนักงานเป้าหมาย (targetEmployeeId) ตาม Permission และ Scope หรือไม่
    /// </summary>
    Task<bool> CanAccessEmployeeAsync(long targetEmployeeId, string permissionCode, CancellationToken ct = default);

    /// <summary>
    /// ดึงรายการ Employee ID ทั้งหมดที่ผู้ใช้ปัจจุบันสามารถเข้าถึงได้ตาม Permission และ Scope
    /// คืนค่า null หากมี Scope ระดับ ORGANIZATION หรือเป็น ADMIN (หมายถึงเห็นทุกคน ไม่ต้องกรอง ID)
    /// </summary>
    Task<List<long>?> GetAccessibleEmployeeIdsAsync(string permissionCode, CancellationToken ct = default);

    /// <summary>
    /// กรองหรือตรวจสอบ DepartmentId ตาม Scope ของผู้ใช้:
    /// - หากเป็น ORGANIZATION/ADMIN: ให้ใช้ requestedDeptId ที่ส่งมาได้อิสระ
    /// - หากเป็น DEPARTMENT/TEAM: บังคับให้เป็น DepartmentId ของผู้ใช้เอง (หากส่ง id อื่นมาจะโยน ForbiddenException)
    /// </summary>
    Task<long?> ResolveDepartmentFilterAsync(long? requestedDeptId, string permissionCode, CancellationToken ct = default);
}
