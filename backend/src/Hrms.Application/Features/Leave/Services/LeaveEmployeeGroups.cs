using Hrms.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

/// <summary>กลุ่มพนักงานที่ใช้จับคู่สิทธิ์การลา (ประเภทพนักงาน / ระดับพนักงาน)</summary>
public readonly record struct LeaveEmployeeGroup(long? EmployeeTypeId, long? EmployeeLevelId);

/// <summary>
/// หาประเภท/ระดับพนักงานสำหรับจับคู่สิทธิ์การลา ตามแหล่งข้อมูลจริงของระบบ
/// - ประเภทพนักงาน: จากสัญญาจ้างที่มีผล (ACTIVE) ล่าสุด ณ วันที่กำหนด → ถ้าไม่มี ใช้ค่าในตำแหน่งงานปัจจุบัน
/// - ระดับพนักงาน: ค่าที่ระบุในตำแหน่งงานปัจจุบัน → ถ้าไม่มี ใช้ระดับของตำแหน่ง (position)
/// - พนักงานที่มีตำแหน่งงานปัจจุบันหลายรายการ ใช้รายการที่มีผลล่าสุด
/// </summary>
public static class LeaveEmployeeGroups
{
    public static async Task<Dictionary<long, LeaveEmployeeGroup>> ResolveAsync(
        IHrmsDbContext context, IReadOnlyCollection<long> employeeIds, DateOnly onDate, CancellationToken cancellationToken)
    {
        var ids = employeeIds.Distinct().ToList();
        var result = new Dictionary<long, LeaveEmployeeGroup>();
        if (ids.Count == 0) return result;

        var assignments = (await context.EmployeeAssignments.AsNoTracking()
                .Where(a => a.IsCurrent && ids.Contains(a.EmployeeId))
                .Select(a => new
                {
                    a.EmployeeId,
                    a.EffectiveFrom,
                    a.Id,
                    a.EmployeeTypeId,
                    a.EmployeeLevelId,
                    PositionLevelId = a.Position != null ? a.Position.EmployeeLevelId : null
                })
                .ToListAsync(cancellationToken))
            .GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.EffectiveFrom).ThenByDescending(a => a.Id).First());

        var contracts = (await context.EmploymentContracts.AsNoTracking()
                .Where(c => ids.Contains(c.EmployeeId) && c.Status == "ACTIVE" && c.EmployeeTypeId != null)
                .Select(c => new { c.EmployeeId, c.EmployeeTypeId, c.StartDate, c.Id })
                .ToListAsync(cancellationToken))
            .GroupBy(c => c.EmployeeId)
            .ToDictionary(g => g.Key, g =>
                // สัญญาที่เริ่มแล้ว ณ วันที่กำหนดก่อน แล้วค่อยสัญญาที่เริ่มในอนาคต
                g.OrderByDescending(c => c.StartDate <= onDate)
                 .ThenByDescending(c => c.StartDate)
                 .ThenByDescending(c => c.Id)
                 .First().EmployeeTypeId);

        foreach (var id in ids)
        {
            assignments.TryGetValue(id, out var assign);
            contracts.TryGetValue(id, out var contractTypeId);
            result[id] = new LeaveEmployeeGroup(
                contractTypeId ?? assign?.EmployeeTypeId,
                assign?.EmployeeLevelId ?? assign?.PositionLevelId);
        }
        return result;
    }

    public static async Task<LeaveEmployeeGroup> ResolveAsync(
        IHrmsDbContext context, long employeeId, DateOnly onDate, CancellationToken cancellationToken)
    {
        var map = await ResolveAsync(context, new[] { employeeId }, onDate, cancellationToken);
        return map.TryGetValue(employeeId, out var g) ? g : default;
    }
}
