using System.Globalization;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Transfers.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Transfers.Services;

public class EmployeeTransferService : IEmployeeTransferService
{
    private readonly IHrmsDbContext _context;

    public EmployeeTransferService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<EmployeeTransferDto>> GetAllAsync(
        string? search = null,
        string? transferType = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.EmployeeTransferRequests
            .Include(t => t.Employee)
            .Include(t => t.FromDivision)
            .Include(t => t.FromDepartment)
            .Include(t => t.FromPosition)
            .Include(t => t.FromManager)
            .Include(t => t.ToDivision)
            .Include(t => t.ToDepartment)
            .Include(t => t.ToPosition)
            .Include(t => t.ToManager)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t =>
                t.RequestNo.ToLower().Contains(s) ||
                (t.Employee != null && (
                    t.Employee.EmployeeCode.ToLower().Contains(s) ||
                    t.Employee.FirstName.ToLower().Contains(s) ||
                    t.Employee.LastName.ToLower().Contains(s)
                ))
            );
        }

        if (!string.IsNullOrWhiteSpace(transferType) && transferType != "ALL")
        {
            query = query.Where(t => t.TransferType == transferType);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            query = query.Where(t => t.Status == status);
        }

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<TransferStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var all = await _context.EmployeeTransferRequests
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var pendingCount = all.Count(t => t.Status == "PENDING");
        var transfersThisMonth = all.Count(t =>
            (t.TransferType == "DEPARTMENT_TRANSFER" || t.TransferType == "TRANSFER_AND_PROMOTION") &&
            t.EffectiveDate.Month == currentMonth &&
            t.EffectiveDate.Year == currentYear);

        var promotionsThisMonth = all.Count(t =>
            (t.TransferType == "PROMOTION" || t.TransferType == "TRANSFER_AND_PROMOTION" || t.TransferType == "PROMOTION_AND_SUPERVISOR") &&
            t.EffectiveDate.Month == currentMonth &&
            t.EffectiveDate.Year == currentYear);

        return new TransferStatsDto
        {
            PendingRequestsCount = pendingCount,
            TransfersThisMonthCount = transfersThisMonth,
            PromotionsThisMonthCount = promotionsThisMonth
        };
    }

    public async Task<EmployeeTransferDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.EmployeeTransferRequests
            .Include(t => t.Employee)
            .Include(t => t.FromDivision)
            .Include(t => t.FromDepartment)
            .Include(t => t.FromPosition)
            .Include(t => t.FromManager)
            .Include(t => t.ToDivision)
            .Include(t => t.ToDepartment)
            .Include(t => t.ToPosition)
            .Include(t => t.ToManager)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException("คำขอย้าย/เลื่อนตำแหน่ง", id);
        }

        return MapToDto(entity);
    }

    public async Task<EmployeeTransferDto> CreateAsync(
        CreateEmployeeTransferRequest request,
        CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .Include(e => e.Assignments)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("พนักงาน", request.EmployeeId);
        }

        // ดึงการมอบหมายงานปัจจุบัน
        var currentAssign = await _context.EmployeeAssignments
            .Where(a => a.EmployeeId == request.EmployeeId && a.IsCurrent)
            .OrderByDescending(a => a.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        // หา Division ของ Department เป้าหมาย ถ้าไม่ได้ระบุ
        var toDivisionId = request.ToDivisionId;
        if (!toDivisionId.HasValue || toDivisionId.Value == 0)
        {
            var targetDept = await _context.Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == request.ToDepartmentId, cancellationToken);

            toDivisionId = targetDept?.DivisionId;
        }

        // สร้าง Request No เช่น TRF-2569-022
        var buddhistYear = DateTime.Now.Year + 543;
        var prefix = $"TRF-{buddhistYear}-";

        var latestRequest = await _context.EmployeeTransferRequests
            .Where(t => t.RequestNo.StartsWith(prefix))
            .OrderByDescending(t => t.RequestNo)
            .FirstOrDefaultAsync(cancellationToken);

        int nextSeq = 1;
        if (latestRequest != null)
        {
            var parts = latestRequest.RequestNo.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out int lastSeq))
            {
                nextSeq = lastSeq + 1;
            }
        }

        var requestNo = $"{prefix}{nextSeq:D3}";

        var transfer = new EmployeeTransferRequest
        {
            RequestNo = requestNo,
            EmployeeId = request.EmployeeId,
            TransferType = request.TransferType,
            FromDivisionId = currentAssign?.DivisionId,
            FromDepartmentId = currentAssign?.DepartmentId,
            FromPositionId = currentAssign?.PositionId,
            FromManagerId = currentAssign?.ManagerEmployeeId,
            ToDivisionId = toDivisionId,
            ToDepartmentId = request.ToDepartmentId,
            ToPositionId = request.ToPositionId,
            ToManagerId = request.ToManagerId,
            EffectiveDate = request.EffectiveDate,
            Status = request.AutoApprove ? "APPROVED" : "PENDING",
            OrderNo = request.OrderNo,
            Reason = request.Reason,
            CreatedAt = DateTime.UtcNow,
            ApprovedAt = request.AutoApprove ? DateTime.UtcNow : null
        };

        _context.EmployeeTransferRequests.Add(transfer);

        // หากเป็นการอนุมัติทันที ให้ปรับปรุง EmployeeAssignment ทันที
        if (request.AutoApprove)
        {
            ApplyAssignmentUpdate(currentAssign, transfer);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(transfer.Id, cancellationToken);
    }

    public async Task<EmployeeTransferDto> ApproveAsync(long id, CancellationToken cancellationToken = default)
    {
        var transfer = await _context.EmployeeTransferRequests
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (transfer == null)
        {
            throw new NotFoundException("คำขอย้าย/เลื่อนตำแหน่ง", id);
        }

        if (transfer.Status == "APPROVED")
        {
            return await GetByIdAsync(id, cancellationToken);
        }

        transfer.Status = "APPROVED";
        transfer.ApprovedAt = DateTime.UtcNow;

        // ดึง assignment ปัจจุบันของพนักงาน
        var currentAssign = await _context.EmployeeAssignments
            .Where(a => a.EmployeeId == transfer.EmployeeId && a.IsCurrent)
            .OrderByDescending(a => a.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        ApplyAssignmentUpdate(currentAssign, transfer);

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<EmployeeTransferDto> RejectAsync(long id, string? reason, CancellationToken cancellationToken = default)
    {
        var transfer = await _context.EmployeeTransferRequests
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (transfer == null)
        {
            throw new NotFoundException("คำขอย้าย/เลื่อนตำแหน่ง", id);
        }

        transfer.Status = "REJECTED";
        if (!string.IsNullOrWhiteSpace(reason))
        {
            transfer.Reason = string.IsNullOrWhiteSpace(transfer.Reason) 
                ? $"เหตุผลที่ปฏิเสธ: {reason}" 
                : $"{transfer.Reason} (เหตุผลที่ปฏิเสธ: {reason})";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    private void ApplyAssignmentUpdate(EmployeeAssignment? currentAssign, EmployeeTransferRequest transfer)
    {
        // ปิดรอบ assignment เดิม
        if (currentAssign != null)
        {
            currentAssign.IsCurrent = false;
            currentAssign.EffectiveTo = transfer.EffectiveDate.AddDays(-1);
        }

        // สร้าง assignment ใหม่
        var newAssignment = new EmployeeAssignment
        {
            EmployeeId = transfer.EmployeeId,
            DivisionId = transfer.ToDivisionId ?? (currentAssign?.DivisionId ?? 1),
            DepartmentId = transfer.ToDepartmentId,
            PositionId = transfer.ToPositionId,
            ManagerEmployeeId = transfer.ToManagerId ?? currentAssign?.ManagerEmployeeId,
            EffectiveFrom = transfer.EffectiveDate,
            EffectiveTo = null,
            IsCurrent = true,
            WageType = currentAssign?.WageType ?? "MONTHLY",
            WorkScheduleId = currentAssign?.WorkScheduleId
        };

        _context.EmployeeAssignments.Add(newAssignment);
    }

    private static EmployeeTransferDto MapToDto(EmployeeTransferRequest t)
    {
        var empName = t.Employee != null 
            ? $"{t.Employee.FirstName} {t.Employee.LastName}".Trim() 
            : "-";
        var empCode = t.Employee?.EmployeeCode ?? "-";

        // แปลงประเภทคำขอเป็นภาษาไทยตรงตาม Mockup
        var typeDisplay = t.TransferType switch
        {
            "DEPARTMENT_TRANSFER" => "ย้ายแผนก",
            "PROMOTION" => "เลื่อนตำแหน่ง",
            "TRANSFER_AND_PROMOTION" => "โอนย้ายและเลื่อนตำแหน่ง",
            "PROMOTION_AND_SUPERVISOR" => "เลื่อนตำแหน่ง + เปลี่ยนหัวหน้างาน",
            _ => t.TransferType
        };

        // แสดงสายงาน / แผนก หรือ ตำแหน่งต้นทาง
        var fromDept = t.FromDepartment?.DepartmentName?.Trim() ?? "";
        var fromDiv = t.FromDivision?.DivisionName?.Trim() ?? "";
        var fromPos = t.FromPosition?.PositionName?.Trim() ?? "";
        string fromDisplay;
        if (!string.IsNullOrEmpty(fromDiv) && !string.IsNullOrEmpty(fromDept))
        {
            fromDisplay = $"{fromDiv} / {fromDept}";
        }
        else if (!string.IsNullOrEmpty(fromDept))
        {
            fromDisplay = fromDept;
        }
        else
        {
            fromDisplay = string.IsNullOrEmpty(fromPos) ? "-" : fromPos;
        }

        // แสดงสายงาน / แผนก หรือ ตำแหน่งปลายทาง
        var toDept = t.ToDepartment?.DepartmentName?.Trim() ?? "";
        var toDiv = t.ToDivision?.DivisionName?.Trim() ?? "";
        var toPos = t.ToPosition?.PositionName?.Trim() ?? "";
        string toDisplay;
        if (!string.IsNullOrEmpty(toDiv) && !string.IsNullOrEmpty(toDept))
        {
            toDisplay = $"{toDiv} / {toDept}";
        }
        else if (!string.IsNullOrEmpty(toDept))
        {
            toDisplay = toDept;
        }
        else
        {
            toDisplay = string.IsNullOrEmpty(toPos) ? "-" : toPos;
        }

        // วันที่ พ.ศ. เช่น 01/09/2569
        var bYear = t.EffectiveDate.Year + 543;
        var dateDisplay = $"{t.EffectiveDate.Day:D2}/{t.EffectiveDate.Month:D2}/{bYear}";

        var statusDisplay = t.Status switch
        {
            "PENDING" => "รอดำเนินการ",
            "APPROVED" => "อนุมัติแล้ว",
            "REJECTED" => "ปฏิเสธ",
            _ => t.Status
        };

        var fromMgr = t.FromManager != null ? $"{t.FromManager.FirstName} {t.FromManager.LastName}".Trim() : null;
        var toMgr = t.ToManager != null ? $"{t.ToManager.FirstName} {t.ToManager.LastName}".Trim() : null;

        return new EmployeeTransferDto
        {
            Id = t.Id,
            RequestNo = t.RequestNo,
            EmployeeId = t.EmployeeId,
            EmployeeName = empName,
            EmployeeCode = empCode,
            TransferType = t.TransferType,
            TransferTypeDisplay = typeDisplay,
            FromDivisionId = t.FromDivisionId,
            FromDivisionName = fromDiv,
            FromDepartmentId = t.FromDepartmentId,
            FromDepartmentName = fromDept,
            FromPositionId = t.FromPositionId,
            FromPositionName = fromPos,
            FromDisplay = fromDisplay,
            FromManagerName = fromMgr,
            ToDivisionId = t.ToDivisionId,
            ToDivisionName = toDiv,
            ToDepartmentId = t.ToDepartmentId,
            ToDepartmentName = toDept,
            ToPositionId = t.ToPositionId,
            ToPositionName = toPos,
            ToDisplay = toDisplay,
            ToManagerName = toMgr,
            EffectiveDate = t.EffectiveDate,
            EffectiveDateDisplay = dateDisplay,
            Status = t.Status,
            StatusDisplay = statusDisplay,
            OrderNo = t.OrderNo,
            Reason = t.Reason,
            CreatedAt = t.CreatedAt,
            ApprovedAt = t.ApprovedAt
        };
    }
}
