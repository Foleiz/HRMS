using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeaveRequestService : ILeaveRequestService
{
    private readonly IHrmsDbContext _context;
    private readonly IApprovalWorkflowService _approvalWorkflow;

    public LeaveRequestService(IHrmsDbContext context, IApprovalWorkflowService approvalWorkflow)
    {
        _context = context;
        _approvalWorkflow = approvalWorkflow;
    }

    public async Task<(List<LeaveRequestDto> Items, int TotalCount)> GetAllAsync(
        long? employeeId = null,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        long? scopeToManagerEmployeeId = null,
        long? currentViewerEmployeeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.LeaveRequests
            .AsNoTracking()
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Include(r => r.Documents)
            .Include(r => r.ApprovalInstance).ThenInclude(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(r => r.ApprovalInstance).ThenInclude(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(r => r.ApprovalInstance).ThenInclude(i => i.Actions).ThenInclude(a => a.ApproverEmployee)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(r => r.EmployeeId == employeeId.Value);
        }

        if (scopeToManagerEmployeeId.HasValue)
        {
            query = await ApplyScopeToQueryAsync(query, scopeToManagerEmployeeId.Value, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status.ToUpper());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var requests = await query
            .OrderByDescending(r => r.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var empIds = requests.Select(r => r.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var items = new List<LeaveRequestDto>();
        foreach (var r in requests)
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
            var item = await MapToDtoAsync(r, assign, currentViewerEmployeeId, cancellationToken);
            items.Add(item);
        }

        return (items, totalCount);
    }

    public async Task<LeaveStatsDto> GetStatsAsync(long? scopeToManagerEmployeeId = null, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endOfMonth = startOfMonth.AddMonths(1);

        var query = _context.LeaveRequests.AsNoTracking().AsQueryable();

        if (scopeToManagerEmployeeId.HasValue)
        {
            query = await ApplyScopeToQueryAsync(query, scopeToManagerEmployeeId.Value, cancellationToken);
        }

        var pendingCount = await query
            .CountAsync(r => r.Status == "PENDING", cancellationToken);

        var approvedThisMonth = await query
            .Where(r => r.Status == "APPROVED" && r.StartDatetime >= startOfMonth && r.StartDatetime < endOfMonth)
            .ToListAsync(cancellationToken);

        var rejectedCount = await query
            .CountAsync(r => r.Status == "REJECTED" && r.StartDatetime >= startOfMonth && r.StartDatetime < endOfMonth, cancellationToken);

        return new LeaveStatsDto
        {
            PendingRequestsCount = pendingCount,
            ApprovedThisMonthCount = approvedThisMonth.Count,
            RejectedThisMonthCount = rejectedCount,
            TotalLeaveDaysThisMonth = approvedThisMonth.Sum(r => r.LeaveDays)
        };
    }

    private async Task<IQueryable<LeaveRequest>> ApplyScopeToQueryAsync(
        IQueryable<LeaveRequest> query,
        long managerId,
        CancellationToken cancellationToken)
    {
        // 1. หาแผนกและฝ่ายที่ผู้ใช้นี้เป็นหัวหน้าตามโครงสร้างองค์กร (Head of Department / Head of Division)
        var managedDeptIds = await _context.Departments
            .AsNoTracking()
            .Where(d => d.HeadEmployeeId == managerId)
            .Select(d => d.Id)
            .ToListAsync(cancellationToken);

        var managedDivIds = await _context.Divisions
            .AsNoTracking()
            .Where(d => d.HeadEmployeeId == managerId)
            .Select(d => d.Id)
            .ToListAsync(cancellationToken);

        // 2. พนักงานใต้บังคับบัญชา:
        // - สายตรง (ManagerEmployeeId == managerId)
        // - พนักงานในแผนกที่ตนเป็นหัวหน้าแผนก (DepartmentId IN managedDeptIds)
        // - พนักงานในฝ่ายที่ตนเป็นหัวหน้าฝ่าย (DivisionId IN managedDivIds)
        var teamEmployeeIds = await _context.EmployeeAssignments
            .AsNoTracking()
            .Where(a => a.IsCurrent && (
                a.ManagerEmployeeId == managerId ||
                managedDeptIds.Contains(a.DepartmentId) ||
                managedDivIds.Contains(a.DivisionId)
            ))
            .Select(a => a.EmployeeId)
            .ToListAsync(cancellationToken);

        // 3. รวมเอกสารที่อยู่ในสายการอนุมัติ ที่ถึงคิวผู้ใช้คนนี้มีสิทธิ์อนุมัติ (Approval Workflow)
        var pendingInstanceIds = await _approvalWorkflow.GetPendingInstanceIdsForUserAsync(managerId, "LEAVE_REQUEST", cancellationToken);

        // 4. รวมเอกสารที่ผู้ใช้คนนี้เคยดำเนินการอนุมัติ/ปฏิเสธไปแล้ว (Actioned instances)
        var actionedInstanceIds = await _context.ApprovalActions
            .AsNoTracking()
            .Where(a => a.ApproverEmployeeId == managerId)
            .Select(a => a.ApprovalInstanceId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return query.Where(r => teamEmployeeIds.Contains(r.EmployeeId) || (r.ApprovalInstanceId.HasValue && (pendingInstanceIds.Contains(r.ApprovalInstanceId.Value) || actionedInstanceIds.Contains(r.ApprovalInstanceId.Value))));
    }

    public async Task<LeaveRequestDto?> GetByIdAsync(long id, long? currentViewerEmployeeId = null, CancellationToken cancellationToken = default)
    {
        var r = await _context.LeaveRequests
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.LeaveType)
            .Include(x => x.Documents)
            .Include(x => x.ApprovalInstance).ThenInclude(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(x => x.ApprovalInstance).ThenInclude(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(x => x.ApprovalInstance).ThenInclude(i => i.Actions).ThenInclude(a => a.ApproverEmployee)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (r == null) return null;

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .FirstOrDefaultAsync(a => a.EmployeeId == r.EmployeeId && a.IsCurrent, cancellationToken);

        return await MapToDtoAsync(r, assign, currentViewerEmployeeId, cancellationToken);
    }

    public async Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto request, CancellationToken cancellationToken = default)
    {
        var year = request.StartDatetime.Year;
        var leaveType = await _context.LeaveTypes.FindAsync([request.LeaveTypeId], cancellationToken);
        if (leaveType == null)
        {
            throw new KeyNotFoundException($"ไม่พบประเภทการลารหัส ID {request.LeaveTypeId}");
        }

        var emp = await _context.Employees.FindAsync([request.EmployeeId], cancellationToken);
        if (emp == null)
        {
            throw new KeyNotFoundException($"ไม่พบพนักงานรหัส ID {request.EmployeeId}");
        }

        // Validate Leave Balance — ข้ามการตรวจสอบถ้าเป็นการบันทึกแบบร่าง
        var balance = await _context.LeaveBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == request.EmployeeId && b.LeaveTypeId == request.LeaveTypeId && b.Year == year, cancellationToken);

        if (!request.IsDraft && balance != null && balance.NetRemainingLeaveDays < request.LeaveDays)
        {
            throw new InvalidOperationException($"วันลาคงเหลือไม่เพียงพอ (คงเหลือ {balance.NetRemainingLeaveDays} วัน, ขอลา {request.LeaveDays} วัน)");
        }

        // Generate Request No: LR-YYYYMM-XXXX
        var prefix = $"LR-{DateTime.UtcNow:yyyyMM}-";
        var countThisMonth = await _context.LeaveRequests
            .CountAsync(r => r.RequestNo.StartsWith(prefix), cancellationToken);
        var requestNo = $"{prefix}{(countThisMonth + 1):D4}";

        var leaveRequest = new LeaveRequest
        {
            RequestNo = requestNo,
            EmployeeId = request.EmployeeId,
            LeaveTypeId = request.LeaveTypeId,
            StartDatetime = request.StartDatetime,
            EndDatetime = request.EndDatetime,
            LeaveHours = request.LeaveHours,
            LeaveDays = request.LeaveDays,
            Reason = request.Reason,
            ContactDuringLeave = request.ContactDuringLeave,
            Status = request.IsDraft ? "DRAFT" : "PENDING",
            SubmittedAt = request.IsDraft ? null : DateTime.UtcNow
        };

        if (request.AttachmentData != null && request.AttachmentData.Length > 0)
        {
            leaveRequest.Documents.Add(new LeaveRequestDocument
            {
                FileName = request.AttachmentFileName ?? "attachment.pdf",
                FileData = request.AttachmentData,
                UploadedAt = DateTime.UtcNow
            });
        }

        _context.LeaveRequests.Add(leaveRequest);
        await _context.SaveChangesAsync(cancellationToken);

        // ถ้ายื่นคำขอจริง ให้เริ่ม Approval Workflow ทันที
        if (!request.IsDraft)
        {
            var instanceId = await _approvalWorkflow.StartWorkflowAsync("LEAVE_REQUEST", leaveRequest.Id, leaveRequest.EmployeeId, cancellationToken);
            if (instanceId.HasValue)
            {
                leaveRequest.ApprovalInstanceId = instanceId.Value;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        return (await GetByIdAsync(leaveRequest.Id, request.EmployeeId, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> UpdateDraftAsync(long id, CreateLeaveRequestDto request, CancellationToken cancellationToken = default)
    {
        var leaveRequest = await _context.LeaveRequests
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (leaveRequest == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอลารหัส ID {id}");
        }

        if (leaveRequest.Status != "DRAFT")
        {
            throw new InvalidOperationException("แก้ไขได้เฉพาะคำขอลาที่ยังเป็นแบบร่างเท่านั้น");
        }

        var leaveType = await _context.LeaveTypes.FindAsync([request.LeaveTypeId], cancellationToken);
        if (leaveType == null)
        {
            throw new KeyNotFoundException($"ไม่พบประเภทการลารหัส ID {request.LeaveTypeId}");
        }

        if (!request.IsDraft)
        {
            var year = request.StartDatetime.Year;
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(b => b.EmployeeId == leaveRequest.EmployeeId && b.LeaveTypeId == request.LeaveTypeId && b.Year == year, cancellationToken);

            if (balance != null && balance.NetRemainingLeaveDays < request.LeaveDays)
            {
                throw new InvalidOperationException($"วันลาคงเหลือไม่เพียงพอ (คงเหลือ {balance.NetRemainingLeaveDays} วัน, ขอลา {request.LeaveDays} วัน)");
            }
        }

        leaveRequest.LeaveTypeId = request.LeaveTypeId;
        leaveRequest.StartDatetime = request.StartDatetime;
        leaveRequest.EndDatetime = request.EndDatetime;
        leaveRequest.LeaveHours = request.LeaveHours;
        leaveRequest.LeaveDays = request.LeaveDays;
        leaveRequest.Reason = request.Reason;
        leaveRequest.ContactDuringLeave = request.ContactDuringLeave;

        if (!request.IsDraft)
        {
            leaveRequest.Status = "PENDING";
            leaveRequest.SubmittedAt = DateTime.UtcNow;

            var instanceId = await _approvalWorkflow.StartWorkflowAsync("LEAVE_REQUEST", leaveRequest.Id, leaveRequest.EmployeeId, cancellationToken);
            if (instanceId.HasValue)
            {
                leaveRequest.ApprovalInstanceId = instanceId.Value;
            }
        }

        if (request.AttachmentData != null && request.AttachmentData.Length > 0)
        {
            leaveRequest.Documents.Add(new LeaveRequestDocument
            {
                FileName = request.AttachmentFileName ?? "attachment.pdf",
                FileData = request.AttachmentData,
                UploadedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(leaveRequest.Id, leaveRequest.EmployeeId, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> ApproveAsync(long id, long? approverId = null, string? comment = null, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำร้องขอลาหยุดงานรหัส ID {id}");
        }

        if (request.Status == "APPROVED")
        {
            return (await GetByIdAsync(id, approverId, cancellationToken))!;
        }

        bool finalizeApproval = false;

        // 1. ตรวจสอบว่ามี ApprovalInstance ผูกอยู่หรือไม่
        if (request.ApprovalInstanceId.HasValue)
        {
            var workflowResult = await _approvalWorkflow.ProcessActionAsync(
                request.ApprovalInstanceId.Value,
                approverId ?? 1,
                "APPROVE",
                comment,
                cancellationToken);

            // ถ้าอนุมัติครบทุกขั้นตอนแล้ว (Final Step) จึงตัดยอดวันลาและลงปฏิทิน
            if (workflowResult.IsCompleted && workflowResult.Status == "APPROVED")
            {
                finalizeApproval = true;
            }
        }
        else
        {
            // ถ้าไม่มี Workflow ผูกอยู่ (เช่น เอกสารเก่า) ให้อนุมัติโดยตรง
            finalizeApproval = true;
        }

        if (finalizeApproval)
        {
            var year = request.StartDatetime.Year;
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(b => b.EmployeeId == request.EmployeeId && b.LeaveTypeId == request.LeaveTypeId && b.Year == year, cancellationToken);

            if (balance != null)
            {
                balance.UsedDays += request.LeaveDays;
                balance.NetRemainingLeaveDays = balance.BroughtForwardDays 
                                              + balance.AnnualQuotaDays 
                                              + balance.ActiveCarriedForwardDays 
                                              - balance.UsedDays 
                                              + balance.AdjustedDays;

                _context.LeaveBalanceTransactions.Add(new LeaveBalanceTransaction
                {
                    LeaveBalanceId = balance.Id,
                    TransactionType = "USED",
                    Amount = -request.LeaveDays,
                    ReferenceType = "leave_request",
                    ReferenceId = request.Id,
                    Note = $"อนุมัติคำร้องขอลาเลขที่ {request.RequestNo} ({request.LeaveDays} วัน)" + (string.IsNullOrWhiteSpace(comment) ? "" : $" [ความเห็น: {comment}]"),
                    CreatedAt = DateTime.UtcNow,
                    CreatedByEmployeeId = approverId
                });
            }

            // ซิงค์สถานะวันลาไปยัง AttendanceDaily
            var startDate = DateOnly.FromDateTime(request.StartDatetime);
            var endDate = DateOnly.FromDateTime(request.EndDatetime);

            for (var d = startDate; d <= endDate; d = d.AddDays(1))
            {
                var daily = await _context.AttendanceDailies
                    .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.WorkDate == d, cancellationToken);

                if (daily == null)
                {
                    daily = new AttendanceDaily
                    {
                        EmployeeId = request.EmployeeId,
                        WorkDate = d,
                        IsAbsent = false,
                        Status = "LEAVE"
                    };
                    _context.AttendanceDailies.Add(daily);
                }
                else
                {
                    daily.IsAbsent = false;
                    daily.Status = "LEAVE";
                }
            }

            request.Status = "APPROVED";
            await _context.SaveChangesAsync(cancellationToken);
        }

        return (await GetByIdAsync(id, approverId, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> RejectAsync(long id, string? reason = null, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests.FindAsync([id], cancellationToken);
        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำร้องขอลาหยุดงานรหัส ID {id}");
        }

        if (request.ApprovalInstanceId.HasValue)
        {
            var approverId = 1L; // fallback
            try
            {
                await _approvalWorkflow.ProcessActionAsync(
                    request.ApprovalInstanceId.Value,
                    approverId,
                    "REJECT",
                    reason,
                    cancellationToken);
            }
            catch { /* Ignore if workflow status mismatch */ }
        }

        request.Status = "REJECTED";
        request.CancelReason = reason;
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, null, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> CancelAsync(long id, string? reason = null, long? cancelledBy = null, bool revertToDraftIfPending = false, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests.FindAsync([id], cancellationToken);
        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำร้องขอลาหยุดงานรหัส ID {id}");
        }

        if (revertToDraftIfPending && request.Status == "PENDING")
        {
            if (request.ApprovalInstanceId.HasValue)
            {
                try
                {
                    await _approvalWorkflow.ProcessActionAsync(
                        request.ApprovalInstanceId.Value,
                        cancelledBy ?? 1,
                        "CANCEL",
                        reason,
                        cancellationToken);
                }
                catch { }
            }

            request.Status = "DRAFT";
            request.SubmittedAt = null;
            request.CancelledAt = null;
            request.CancelReason = null;
            request.ApprovalInstanceId = null;

            await _context.SaveChangesAsync(cancellationToken);
            return (await GetByIdAsync(id, cancelledBy, cancellationToken))!;
        }

        // ถ้าเคย APPROVED แล้ว ต้องคืนยอดวันลา
        if (request.Status == "APPROVED")
        {
            var year = request.StartDatetime.Year;
            var balance = await _context.LeaveBalances
                .FirstOrDefaultAsync(b => b.EmployeeId == request.EmployeeId && b.LeaveTypeId == request.LeaveTypeId && b.Year == year, cancellationToken);

            if (balance != null)
            {
                balance.UsedDays = Math.Max(0, balance.UsedDays - request.LeaveDays);
                balance.NetRemainingLeaveDays = balance.BroughtForwardDays 
                                              + balance.AnnualQuotaDays 
                                              + balance.ActiveCarriedForwardDays 
                                              - balance.UsedDays 
                                              + balance.AdjustedDays;

                _context.LeaveBalanceTransactions.Add(new LeaveBalanceTransaction
                {
                    LeaveBalanceId = balance.Id,
                    TransactionType = "REVERSAL",
                    Amount = request.LeaveDays,
                    ReferenceType = "leave_request",
                    ReferenceId = request.Id,
                    Note = $"ยกเลิกคำร้องขอลาเลขที่ {request.RequestNo} - คืนสิทธิ์ ({request.LeaveDays} วัน)",
                    CreatedAt = DateTime.UtcNow,
                    CreatedByEmployeeId = cancelledBy
                });
            }

            var startDate = DateOnly.FromDateTime(request.StartDatetime);
            var endDate = DateOnly.FromDateTime(request.EndDatetime);

            var dailies = await _context.AttendanceDailies
                .Where(a => a.EmployeeId == request.EmployeeId && a.WorkDate >= startDate && a.WorkDate <= endDate && a.Status == "LEAVE")
                .ToListAsync(cancellationToken);

            foreach (var daily in dailies)
            {
                if (daily.ActualIn.HasValue || daily.ActualOut.HasValue)
                {
                    daily.Status = daily.ActualIn.HasValue ? "PRESENT" : "ABSENT";
                }
                else
                {
                    daily.Status = "PENDING";
                }
            }
        }

        if (request.ApprovalInstanceId.HasValue)
        {
            try
            {
                await _approvalWorkflow.ProcessActionAsync(
                    request.ApprovalInstanceId.Value,
                    cancelledBy ?? 1,
                    "CANCEL",
                    reason,
                    cancellationToken);
            }
            catch { }
        }

        request.Status = "CANCELLED";
        request.CancelledAt = DateTime.UtcNow;
        request.CancelReason = reason;
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancelledBy, cancellationToken))!;
    }

    public async Task<LeaveRequestDocument?> GetDocumentAsync(long requestId, long documentId, CancellationToken cancellationToken = default)
    {
        return await _context.LeaveRequestDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId && d.LeaveRequestId == requestId, cancellationToken);
    }

    public async Task DeleteDraftAsync(long id, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests.FindAsync([id], cancellationToken);
        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอลารหัส ID {id}");
        }

        if (request.Status != "DRAFT")
        {
            throw new InvalidOperationException("ลบได้เฉพาะคำขอลาที่ยังเป็นแบบร่างเท่านั้น");
        }

        _context.LeaveRequests.Remove(request);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<LeaveRequestDto> MapToDtoAsync(
        LeaveRequest r,
        EmployeeAssignment? assign,
        long? currentViewerEmployeeId,
        CancellationToken cancellationToken)
    {
        var emp = r.Employee;
        var empName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty;

        var instance = r.ApprovalInstance;
        var currentStepNo = instance?.CurrentStepNo;
        var totalSteps = instance?.ApprovalFlow?.Steps?.Count ?? 0;
        string? currentApproverDisplay = null;
        bool isMyTurn = false;

        if (instance != null && instance.Status == "PENDING" && currentStepNo.HasValue)
        {
            var step = instance.ApprovalFlow?.Steps.FirstOrDefault(s => s.StepNo == currentStepNo.Value);
            if (step != null)
            {
                currentApproverDisplay = step.ApproverType switch
                {
                    "ROLE" => step.ApproverRole?.RoleName ?? "บทบาทตามระบบ",
                    "EMPLOYEE" => step.ApproverEmployee?.FullName ?? "พนักงานระบุตัวบุคคล",
                    "MANAGER" => "หัวหน้างานโดยตรง (Direct Manager)",
                    "DEPARTMENT_HEAD" => "ผู้จัดการแผนก (Department Head)",
                    "DIVISION_HEAD" => "ผู้จัดการฝ่าย (Division Head)",
                    "HR" => "ฝ่ายทรัพยากรบุคคล (HR)",
                    "CEO" => "ประธานเจ้าหน้าที่บริหาร (CEO)",
                    _ => step.ApproverType
                };
            }

            if (currentViewerEmployeeId.HasValue)
            {
                isMyTurn = await _approvalWorkflow.CanUserApproveStepAsync(instance.Id, currentViewerEmployeeId.Value, cancellationToken);
            }
        }

        var hasAlreadyApproved = instance != null && currentViewerEmployeeId.HasValue &&
            instance.Actions.Any(a => a.ApproverEmployeeId == currentViewerEmployeeId.Value && a.ActionDecision == "APPROVE");

        var finalApproveAction = instance?.Actions
            .Where(a => a.ActionDecision == "APPROVE")
            .OrderByDescending(a => a.ActionAt)
            .FirstOrDefault();

        return new LeaveRequestDto
        {
            Id = r.Id,
            RequestNo = r.RequestNo,
            EmployeeId = r.EmployeeId,
            EmployeeCode = emp?.EmployeeCode ?? string.Empty,
            EmployeeName = empName,
            DepartmentName = assign?.Department?.DepartmentName ?? "-",
            LeaveTypeId = r.LeaveTypeId,
            LeaveTypeCode = r.LeaveType?.LeaveCode ?? string.Empty,
            LeaveTypeName = r.LeaveType?.LeaveName ?? string.Empty,
            StartDatetime = r.StartDatetime,
            EndDatetime = r.EndDatetime,
            LeaveHours = r.LeaveHours,
            LeaveDays = r.LeaveDays,
            Reason = r.Reason,
            ContactDuringLeave = r.ContactDuringLeave,
            Status = r.Status,
            SubmittedAt = r.SubmittedAt,
            CancelledAt = r.CancelledAt,
            CancelReason = r.CancelReason,
            RejectReason = r.CancelReason,
            ApprovalInstanceId = r.ApprovalInstanceId,
            CurrentStepNo = currentStepNo,
            TotalSteps = totalSteps,
            CurrentApproverDisplay = currentApproverDisplay,
            IsMyTurnToApprove = isMyTurn,
            HasAlreadyApproved = hasAlreadyApproved,
            ApprovedByName = finalApproveAction?.ApproverEmployee?.FullName,
            ApprovedAt = instance?.CompletedAt ?? finalApproveAction?.ActionAt,
            Documents = r.Documents.Select(d => new LeaveRequestDocumentDto
            {
                Id = d.Id,
                LeaveRequestId = d.LeaveRequestId,
                FileName = d.FileName,
                UploadedAt = d.UploadedAt
            }).ToList()
        };
    }
}
