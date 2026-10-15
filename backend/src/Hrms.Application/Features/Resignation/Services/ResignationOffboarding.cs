using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Resignation.Services;

/// <summary>
/// ขั้นตอนหลังอนุมัติใบลาออก
/// 1) ตอนอนุมัติครบ: กำหนดวันสิ้นสุดสัญญา + บันทึกประวัติสถานะ RESIGNED (ใช้คิดเงินเดือน/เวลาถึงวันทำงานวันสุดท้าย)
/// 2) เมื่อพ้นวันทำงานวันสุดท้าย (งานเบื้องหลัง): ปิดสัญญา, พนักงาน INACTIVE, ระงับบัญชีผู้ใช้
/// HR ยังระงับ/เปิดบัญชีเองได้ที่ ตั้งค่า → ผู้ใช้งาน
/// </summary>
public static class ResignationOffboarding
{
    public static DateOnly ThaiToday() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    /// <summary>เรียกตอนใบลาออกอนุมัติครบ (ยังไม่ SaveChanges — ผู้เรียกบันทึกเอง)</summary>
    public static async Task ApplyOnApprovalAsync(IHrmsDbContext context, ResignationRequest request, CancellationToken cancellationToken)
    {
        var lastDay = request.RequestedLastWorkingDate;
        var reason = $"ลาออก (เลขที่ {request.RequestNo})";

        EmploymentContract? contract = null;
        if (request.ResultingContractId.HasValue)
        {
            contract = await context.EmploymentContracts
                .FirstOrDefaultAsync(c => c.Id == request.ResultingContractId.Value, cancellationToken);
        }
        contract ??= await context.EmploymentContracts
            .Where(c => c.EmployeeId == request.EmployeeId && c.Status == "ACTIVE")
            .OrderByDescending(c => c.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (contract != null && contract.Status != "CANCELLED")
        {
            contract.TerminationDate = lastDay;
            contract.TerminationReason = reason;
        }

        var exists = await context.EmployeeStatusHistories.AnyAsync(
            h => h.EmployeeId == request.EmployeeId && h.Status == "RESIGNED" && h.EffectiveFrom == lastDay,
            cancellationToken);
        if (!exists)
        {
            context.EmployeeStatusHistories.Add(new EmployeeStatusHistory
            {
                EmployeeId = request.EmployeeId,
                SourceContractId = contract?.Id,
                Status = "RESIGNED",
                EffectiveFrom = lastDay,
                Reason = reason,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // อนุมัติย้อนหลัง (วันสุดท้ายผ่านไปแล้ว) → ปิดบัญชีทันที
        if (lastDay < ThaiToday())
        {
            await DeactivateAsync(context, request.EmployeeId, lastDay, cancellationToken);
        }
    }

    /// <summary>งานเบื้องหลัง: ปิดบัญชีพนักงานที่พ้นวันทำงานวันสุดท้ายแล้ว คืนจำนวนพนักงานที่ปิด</summary>
    public static async Task<int> ApplyDueAsync(IHrmsDbContext context, CancellationToken cancellationToken)
    {
        var today = ThaiToday();
        var due = await context.ResignationRequests
            .AsNoTracking()
            .Where(r => r.Status == "APPROVED" && r.RequestedLastWorkingDate < today
                        && r.Employee.EmploymentStatus == "ACTIVE")
            .Select(r => new { r.EmployeeId, r.RequestedLastWorkingDate })
            .ToListAsync(cancellationToken);

        int count = 0;
        foreach (var g in due.GroupBy(d => d.EmployeeId))
        {
            var lastDay = g.Max(x => x.RequestedLastWorkingDate);
            if (await DeactivateAsync(context, g.Key, lastDay, cancellationToken)) count++;
        }
        if (count > 0) await context.SaveChangesAsync(cancellationToken);
        return count;
    }

    private static async Task<bool> DeactivateAsync(IHrmsDbContext context, long employeeId, DateOnly lastDay, CancellationToken cancellationToken)
    {
        // กลับเข้าทำงานใหม่ (มีสัญญา ACTIVE ที่เริ่มหลังวันออก) → ไม่ปิด
        var rehired = await context.EmploymentContracts.AnyAsync(
            c => c.EmployeeId == employeeId && c.Status == "ACTIVE" && c.StartDate > lastDay, cancellationToken);
        if (rehired) return false;

        var employee = await context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);
        if (employee == null) return false;
        employee.EmploymentStatus = "INACTIVE";
        employee.UpdatedAt = DateTime.UtcNow;

        var contracts = await context.EmploymentContracts
            .Where(c => c.EmployeeId == employeeId && c.Status == "ACTIVE" && c.StartDate <= lastDay)
            .ToListAsync(cancellationToken);
        foreach (var c in contracts)
        {
            c.Status = "TERMINATED";
            c.TerminationDate ??= lastDay;
            c.TerminationReason ??= "ลาออก";
        }

        var users = await context.UserAccounts
            .Where(u => u.EmployeeId == employeeId && u.Status == "ACTIVE")
            .ToListAsync(cancellationToken);
        foreach (var u in users)
        {
            u.Status = "INACTIVE";
            u.UpdatedAt = DateTime.UtcNow;
        }
        return true;
    }
}
