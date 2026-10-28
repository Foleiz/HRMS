using Hrms.Domain.Entities;

namespace Hrms.Application.Common.Utilities;

/// <summary>
/// เลือกตำแหน่งงาน (employee_assignment) ที่มีผล ณ วันที่ที่กำหนด
/// ใช้กับเอกสารเพื่อให้แสดงตำแหน่ง/แผนก ณ วันที่ยื่นหรือวันที่อนุมัติ ไม่เปลี่ยนตามการย้ายตำแหน่งภายหลัง
/// </summary>
public static class AssignmentAsOf
{
    public static EmployeeAssignment? Pick(IEnumerable<EmployeeAssignment>? assignments, DateTime at)
        => Pick(assignments, DateOnly.FromDateTime(at.Kind == DateTimeKind.Utc ? at.AddHours(7) : at));

    public static EmployeeAssignment? Pick(IEnumerable<EmployeeAssignment>? assignments, DateOnly date)
    {
        if (assignments == null) return null;
        var list = assignments as IList<EmployeeAssignment> ?? assignments.ToList();
        if (list.Count == 0) return null;

        return list
                   .Where(a => a.EffectiveFrom <= date && (a.EffectiveTo == null || a.EffectiveTo >= date))
                   .OrderByDescending(a => a.EffectiveFrom)
                   .ThenByDescending(a => a.Id)
                   .FirstOrDefault()
               // ข้อมูลเก่าที่วันที่ไม่ครอบคลุม → ใช้ตำแหน่งปัจจุบัน
               ?? list.FirstOrDefault(a => a.IsCurrent)
               ?? list.OrderByDescending(a => a.EffectiveFrom).First();
    }
}
