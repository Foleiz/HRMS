using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Resignation.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Resignation.Services;

public class ResignationService : IResignationService
{
    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApprovalWorkflowService _approvalWorkflow;

    private class ResignationReasonPayload
    {
        public string? Category { get; set; }
        public string? Detail { get; set; }
        public string? Handover { get; set; }
        public string? Contact { get; set; }
    }

    public ResignationService(
        IHrmsDbContext context,
        ICurrentUserService currentUserService,
        IApprovalWorkflowService approvalWorkflow)
    {
        _context = context;
        _currentUserService = currentUserService;
        _approvalWorkflow = approvalWorkflow;
    }

    public async Task<List<ResignationRequestDto>> GetMyRequestsAsync(CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            return new List<ResignationRequestDto>();
        }

        return await GetRequestsInternalAsync(employeeId.Value, null, cancellationToken);
    }

    public async Task<List<ResignationRequestDto>> GetAllRequestsAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        return await GetRequestsInternalAsync(null, status, cancellationToken);
    }

    public async Task<ResignationRequestDto?> GetRequestByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var request = await _context.ResignationRequests
            .AsNoTracking()
            .Include(r => r.Employee)
            .Include(r => r.ApprovedByEmployee)
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (request == null)
        {
            return null;
        }

        var currentEmpId = _currentUserService.EmployeeId;
        var isHrOrAdmin = _currentUserService.HasRole("HR_MGR") ||
                          _currentUserService.HasRole("HR_ADMIN") ||
                          _currentUserService.HasRole("SUPER_ADMIN") ||
                          _currentUserService.HasRole("SYS_ADMIN");

        if (request.EmployeeId != currentEmpId && !isHrOrAdmin)
        {
            throw new UnauthorizedAccessException("คุณไม่มีสิทธิ์เข้าถึงคำขอลาออกนี้");
        }

        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.IsCurrent, cancellationToken);

        return MapToDto(request, assignment, currentEmpId, isHrOrAdmin);
    }

    public async Task<ResignationRequestDto> CreateRequestAsync(CreateResignationRequestDto dto, CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");
        }

        // ตรวจสอบคำขอที่ค้างอยู่
        var existingPending = await _context.ResignationRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.EmployeeId == employeeId.Value && r.Status == "PENDING", cancellationToken);

        if (existingPending != null)
        {
            throw new ValidationException($"คุณมีคำขอลาออกที่อยู่ระหว่างรอการอนุมัติอยู่แล้ว (เลขที่: {existingPending.RequestNo})");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new ValidationException("กรุณาระบุรายละเอียดเหตุผลการลาออก");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (dto.RequestedLastWorkingDate <= today)
        {
            throw new ValidationException("วันที่ต้องการทำงานวันสุดท้ายต้องเป็นวันหลังจากวันนี้เป็นต้นไป");
        }

        // ค้นหาสัญญาจ้างงานปัจจุบัน
        var contract = await _context.EmploymentContracts
            .AsNoTracking()
            .Where(c => c.EmployeeId == employeeId.Value && c.Status == "ACTIVE")
            .OrderByDescending(c => c.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        // สร้างเลขที่คำขออัตโนมัติ RES-YYYYMM-XXXX
        var prefix = $"RES-{DateTime.UtcNow:yyyyMM}-";
        var count = await _context.ResignationRequests
            .CountAsync(r => r.RequestNo.StartsWith(prefix), cancellationToken);
        var requestNo = $"{prefix}{(count + 1):D4}";

        // จัดเก็บเหตุผลในรูปแบบ JSON payload เพื่อความสมบูรณ์ของโครงสร้าง
        var reasonPayload = new ResignationReasonPayload
        {
            Category = dto.ReasonCategory?.Trim(),
            Detail = dto.Reason.Trim(),
            Handover = dto.HandoverNotes?.Trim(),
            Contact = dto.ContactAfterResignation?.Trim()
        };
        var reasonJson = JsonSerializer.Serialize(reasonPayload);

        var request = new ResignationRequest
        {
            RequestNo = requestNo,
            EmployeeId = employeeId.Value,
            RequestedLastWorkingDate = dto.RequestedLastWorkingDate,
            Reason = reasonJson,
            Status = "PENDING",
            SubmittedAt = DateTime.UtcNow,
            ResultingContractId = contract?.Id
        };

        _context.ResignationRequests.Add(request);
        await _context.SaveChangesAsync(cancellationToken);

        // เชื่อมโยงระบบสายการอนุมัติ (Approval Workflow Engine)
        try
        {
            var instanceId = await _approvalWorkflow.StartWorkflowAsync(
                "RESIGNATION_REQUEST",
                request.Id,
                request.EmployeeId,
                cancellationToken);

            if (instanceId.HasValue)
            {
                request.ApprovalInstanceId = instanceId.Value;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        catch
        {
            // หากการเริ่มสายอนุมัติเกิดข้อผิดพลาด ให้เอกสารถูกสร้างขึ้นโดยรอการผูกสายอนุมัติ
        }

        var employee = await _context.Employees.FindAsync(new object[] { employeeId.Value }, cancellationToken);
        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId.Value && a.IsCurrent, cancellationToken);

        return MapToDto(request, assignment, employeeId.Value, true);
    }

    public async Task<bool> CancelRequestAsync(long id, string? reason = null, CancellationToken cancellationToken = default)
    {
        var request = await _context.ResignationRequests
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอลาออกรหัส {id}");
        }

        var currentEmpId = _currentUserService.EmployeeId;
        var isHrOrAdmin = _currentUserService.HasRole("HR_MGR") ||
                          _currentUserService.HasRole("HR_ADMIN") ||
                          _currentUserService.HasRole("SUPER_ADMIN");

        if (request.EmployeeId != currentEmpId && !isHrOrAdmin)
        {
            throw new UnauthorizedAccessException("คุณไม่มีสิทธิ์ยกเลิกคำขอนี้");
        }

        if (request.Status != "PENDING")
        {
            throw new InvalidOperationException($"ไม่สามารถยกเลิกคำขอที่อยู่ในสถานะ {request.Status} ได้");
        }

        request.Status = "CANCELLED";
        request.CancelledAt = DateTime.UtcNow;
        request.CancelReason = reason ?? "ยกเลิกคำขอโดยผู้ยื่น";

        if (request.ApprovalInstanceId.HasValue)
        {
            try
            {
                await _approvalWorkflow.ProcessActionAsync(
                    request.ApprovalInstanceId.Value,
                    currentEmpId ?? request.EmployeeId,
                    "CANCEL",
                    reason ?? "ยกเลิกคำขอลาออก",
                    cancellationToken);
            }
            catch
            {
                // หากสายอนุมัติปิดตัวไปแล้ว ให้ดำเนินการต่อ
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<List<ResignationRequestDto>> GetRequestsInternalAsync(long? employeeId, string? status, CancellationToken cancellationToken)
    {
        var query = _context.ResignationRequests
            .AsNoTracking()
            .Include(r => r.Employee)
            .Include(r => r.ApprovedByEmployee)
            .Include(r => r.ApprovalInstance)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(r => r.EmployeeId == employeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status.Trim().ToUpper());
        }

        var requests = await query
            .OrderByDescending(r => r.SubmittedAt)
            .ToListAsync(cancellationToken);

        var empIds = requests.Select(r => r.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var currentEmpId = _currentUserService.EmployeeId;
        var isHrOrAdmin = _currentUserService.HasRole("HR_MGR") ||
                          _currentUserService.HasRole("HR_ADMIN") ||
                          _currentUserService.HasRole("SUPER_ADMIN") ||
                          _currentUserService.HasRole("SYS_ADMIN");

        return requests.Select(r =>
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
            return MapToDto(r, assign, currentEmpId, isHrOrAdmin);
        }).ToList();
    }

    private static ResignationRequestDto MapToDto(
        ResignationRequest r,
        EmployeeAssignment? assignment,
        long? currentEmpId,
        bool isHrOrAdmin)
    {
        string? category = null;
        string? detail = r.Reason;
        string? handover = null;
        string? contact = null;

        if (!string.IsNullOrWhiteSpace(r.Reason) && r.Reason.TrimStart().StartsWith("{"))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<ResignationReasonPayload>(r.Reason, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                if (parsed != null)
                {
                    category = parsed.Category;
                    detail = parsed.Detail;
                    handover = parsed.Handover;
                    contact = parsed.Contact;
                }
            }
            catch
            {
                // Fallback to raw text
            }
        }

        var submittedDate = DateOnly.FromDateTime(r.SubmittedAt);
        var noticeDays = r.RequestedLastWorkingDate.DayNumber - submittedDate.DayNumber;

        var effectiveStatus = r.Status;
        if (r.ApprovalInstance != null && r.ApprovalInstance.Status != "PENDING" && r.Status == "PENDING")
        {
            effectiveStatus = r.ApprovalInstance.Status;
        }

        return new ResignationRequestDto
        {
            Id = r.Id,
            RequestNo = r.RequestNo,
            EmployeeId = r.EmployeeId,
            EmployeeCode = r.Employee?.EmployeeCode ?? "",
            EmployeeName = $"{r.Employee?.FirstName} {r.Employee?.LastName}".Trim(),
            DepartmentName = assignment?.Department?.DepartmentName ?? "-",
            PositionName = assignment?.Position?.PositionName ?? "-",
            RequestedLastWorkingDate = r.RequestedLastWorkingDate,
            Reason = r.Reason,
            ReasonCategory = category,
            ReasonDetail = detail,
            HandoverNotes = handover,
            ContactAfterResignation = contact,
            Status = effectiveStatus,
            SubmittedAt = r.SubmittedAt,
            CancelledAt = r.CancelledAt,
            CancelReason = r.CancelReason,
            ApprovedByEmployeeId = r.ApprovedByEmployeeId,
            ApprovedByName = r.ApprovedByEmployee != null ? $"{r.ApprovedByEmployee.FirstName} {r.ApprovedByEmployee.LastName}".Trim() : null,
            ApprovedAt = r.ApprovedAt,
            ApprovalInstanceId = r.ApprovalInstanceId,
            NoticePeriodDays = noticeDays > 0 ? noticeDays : 0,
            CanCancel = effectiveStatus == "PENDING" && (r.EmployeeId == currentEmpId || isHrOrAdmin)
        };
    }
}
