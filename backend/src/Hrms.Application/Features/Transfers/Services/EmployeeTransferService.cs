using System.Globalization;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Transfers.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Transfers.Services;

public class EmployeeTransferService : IEmployeeTransferService
{
    private readonly IHrmsDbContext _context;
    private readonly IApprovalWorkflowService _approvalWorkflowService;

    public EmployeeTransferService(
        IHrmsDbContext context,
        IApprovalWorkflowService approvalWorkflowService)
    {
        _context = context;
        _approvalWorkflowService = approvalWorkflowService;
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

        bool isArchive = string.Equals(request.RecordType, "ARCHIVE", StringComparison.OrdinalIgnoreCase);
        byte[]? docData = null;
        if (!string.IsNullOrWhiteSpace(request.DocumentBase64))
        {
            try
            {
                var base64 = request.DocumentBase64;
                if (base64.Contains(','))
                {
                    base64 = base64.Substring(base64.IndexOf(',') + 1);
                }
                docData = Convert.FromBase64String(base64);
            }
            catch
            {
                // ignore base64 conversion errors
            }
        }

        bool shouldApproveImmediately = isArchive || request.AutoApprove;

        var transfer = new EmployeeTransferRequest
        {
            RequestNo = requestNo,
            EmployeeId = request.EmployeeId,
            TransferType = request.TransferType,
            RecordType = isArchive ? "ARCHIVE" : "REQUEST",
            FromDivisionId = currentAssign?.DivisionId,
            FromDepartmentId = currentAssign?.DepartmentId,
            FromPositionId = currentAssign?.PositionId,
            FromManagerId = currentAssign?.ManagerEmployeeId,
            ToDivisionId = toDivisionId,
            ToDepartmentId = request.ToDepartmentId,
            ToPositionId = request.ToPositionId,
            ToManagerId = request.ToManagerId,
            EffectiveDate = request.EffectiveDate,
            Status = shouldApproveImmediately ? "APPROVED" : "PENDING",
            OrderNo = request.OrderNo,
            Reason = request.Reason,
            DocumentName = request.DocumentName,
            DocumentContentType = request.DocumentContentType,
            DocumentData = docData,
            DocumentSize = request.DocumentSize ?? docData?.Length,
            CreatedAt = DateTime.UtcNow,
            ApprovedAt = shouldApproveImmediately ? DateTime.UtcNow : null
        };

        _context.EmployeeTransferRequests.Add(transfer);
        await _context.SaveChangesAsync(cancellationToken);

        // กรณีบันทึกย้อนหลัง (ARCHIVE) หรือเปิด AutoApprove ให้ปรับปรุง Assignment ทันที
        if (shouldApproveImmediately)
        {
            ApplyAssignmentUpdate(currentAssign, transfer);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            // กรณีเป็นคำขอทั่วไป (REQUEST) ให้เริ่มต้น Approval Workflow ตามสายการอนุมัติ
            try
            {
                var instanceId = await _approvalWorkflowService.StartWorkflowAsync(
                    "TRANSFER_REQUEST",
                    transfer.Id,
                    transfer.EmployeeId,
                    cancellationToken);

                if (instanceId.HasValue)
                {
                    transfer.ApprovalInstanceId = instanceId.Value;
                    await _context.SaveChangesAsync(cancellationToken);
                }
                else
                {
                    // หากไม่ได้ตั้งค่าสายการอนุมัติไว้ ให้มีผลอัตโนมัติ
                    transfer.Status = "APPROVED";
                    transfer.ApprovedAt = DateTime.UtcNow;
                    ApplyAssignmentUpdate(currentAssign, transfer);
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch
            {
                // Fallback ป้องกันระบบค้างหาก workflow service มีปัญหา
                transfer.Status = "APPROVED";
                transfer.ApprovedAt = DateTime.UtcNow;
                ApplyAssignmentUpdate(currentAssign, transfer);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

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

    public async Task<(byte[] Data, string ContentType, string FileName)?> GetDocumentAsync(long id, CancellationToken cancellationToken = default)
    {
        var transfer = await _context.EmployeeTransferRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (transfer == null || transfer.DocumentData == null || transfer.DocumentData.Length == 0)
        {
            return null;
        }

        return (
            transfer.DocumentData,
            transfer.DocumentContentType ?? "application/pdf",
            transfer.DocumentName ?? $"transfer-order-{transfer.RequestNo}.pdf"
        );
    }

    public async Task<ApprovalTimelineDto?> GetApprovalTimelineAsync(long id, CancellationToken cancellationToken = default)
    {
        var transfer = await _context.EmployeeTransferRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (transfer == null) return null;

        if (transfer.ApprovalInstanceId.HasValue)
        {
            return await _approvalWorkflowService.GetTimelineAsync(transfer.ApprovalInstanceId.Value, cancellationToken);
        }

        return await _approvalWorkflowService.GetTimelineByDocumentAsync("TRANSFER_REQUEST", transfer.Id, cancellationToken);
    }

    public async Task<EmployeeTransferDto> ProcessActionAsync(
        long id,
        long approverEmployeeId,
        string actionDecision,
        string? comment = null,
        CancellationToken cancellationToken = default)
    {
        var transfer = await _context.EmployeeTransferRequests
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (transfer == null)
        {
            throw new NotFoundException("คำขอย้าย/เลื่อนตำแหน่ง", id);
        }

        if (!transfer.ApprovalInstanceId.HasValue)
        {
            if (actionDecision == "APPROVE")
            {
                return await ApproveAsync(id, cancellationToken);
            }
            return await RejectAsync(id, comment, cancellationToken);
        }

        var result = await _approvalWorkflowService.ProcessActionAsync(
            transfer.ApprovalInstanceId.Value,
            approverEmployeeId,
            actionDecision,
            comment,
            cancellationToken);

        if (result.Status == "APPROVED")
        {
            transfer.Status = "APPROVED";
            transfer.ApprovedAt = DateTime.UtcNow;
            transfer.ApprovedBy = approverEmployeeId;

            var currentAssign = await _context.EmployeeAssignments
                .Where(a => a.EmployeeId == transfer.EmployeeId && a.IsCurrent)
                .OrderByDescending(a => a.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            ApplyAssignmentUpdate(currentAssign, transfer);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else if (result.Status == "REJECTED")
        {
            transfer.Status = "REJECTED";
            if (!string.IsNullOrWhiteSpace(comment))
            {
                transfer.Reason = string.IsNullOrWhiteSpace(transfer.Reason)
                    ? $"เหตุผลที่ไม่อนุมัติ: {comment}"
                    : $"{transfer.Reason} (ไม่อนุมัติ: {comment})";
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

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
            RecordType = t.RecordType ?? "REQUEST",
            RecordTypeDisplay = (t.RecordType == "ARCHIVE") ? "บันทึกคำสั่งย้อนหลัง" : "ยื่นขออนุมัติตามสายงาน",
            ApprovalInstanceId = t.ApprovalInstanceId,
            HasDocument = (t.DocumentData != null && t.DocumentData.Length > 0) || !string.IsNullOrEmpty(t.DocumentName),
            DocumentName = t.DocumentName,
            DocumentSize = t.DocumentSize,
            OrderNo = t.OrderNo,
            Reason = t.Reason,
            CreatedAt = t.CreatedAt,
            ApprovedAt = t.ApprovedAt
        };
    }
}
