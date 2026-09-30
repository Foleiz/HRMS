using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public partial class LeaveRequestService : ILeaveRequestService
{
    private readonly IHrmsDbContext _context;
    private readonly IApprovalWorkflowService _approvalWorkflow;
    private readonly ILeaveEntitlementSync _entitlementSync;

    public LeaveRequestService(IHrmsDbContext context, IApprovalWorkflowService approvalWorkflow, ILeaveEntitlementSync entitlementSync)
    {
        _context = context;
        _approvalWorkflow = approvalWorkflow;
        _entitlementSync = entitlementSync;
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
            .Include(a => a.Position)
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
        // 1. ดึง Instance IDs ที่ผู้ใช้คนนี้อยู่ในสายการอนุมัติ (Approval Workflow)
        var allowedInstanceIds = await _approvalWorkflow.GetInstanceIdsForApproverUserAsync(managerId, "LEAVE_REQUEST", cancellationToken);

        // 2. สำหรับคำขอลาแบบเก่าที่ไม่มี ApprovalInstanceId ให้ใช้สายบังคับบัญชา
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

        var teamEmployeeIds = await _context.EmployeeAssignments
            .AsNoTracking()
            .Where(a => a.IsCurrent && (
                a.ManagerEmployeeId == managerId ||
                managedDeptIds.Contains(a.DepartmentId) ||
                managedDivIds.Contains(a.DivisionId)
            ))
            .Select(a => a.EmployeeId)
            .ToListAsync(cancellationToken);

        return query.Where(r => 
            (r.ApprovalInstanceId.HasValue && allowedInstanceIds.Contains(r.ApprovalInstanceId.Value)) ||
            (!r.ApprovalInstanceId.HasValue && teamEmployeeIds.Contains(r.EmployeeId))
        );
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
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == r.EmployeeId && a.IsCurrent, cancellationToken);

        return await MapToDtoAsync(r, assign, currentViewerEmployeeId, cancellationToken);
    }

    public async Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto request, CancellationToken cancellationToken = default)
    {
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

        // คำนวณวันลาใหม่ฝั่ง server — นับเฉพาะวันทำงานตามวันทำงานประจำสัปดาห์ และไม่นับวันหยุดบริษัท
        var calc = await ResolveLeaveDaysAsync(request.StartDatetime, request.EndDatetime, request.LeaveDays, request.IsDraft, cancellationToken);
        var year = ToThaiDate(request.StartDatetime).Year;

        // ตรวจโควตา (ยื่นจริงเท่านั้น) — สร้างยอดวันลาให้อัตโนมัติถ้ายังไม่มี และหักยอดที่รออนุมัติของใบอื่นก่อน
        if (!request.IsDraft)
        {
            // กฎการลาตามนโยบาย (ลาซ้อน, ทดลองงาน, อายุงาน, ยื่นล่วงหน้า/ย้อนหลัง, จำนวนครั้ง, เอกสารแนบ)
            await EnsureLeaveRulesAsync(request.EmployeeId, request.LeaveTypeId, request.StartDatetime, request.EndDatetime,
                request.LeaveDays, request.AttachmentData is { Length: > 0 }, null, cancellationToken);

            var (balance, isQuotaControlled) = await EnsureLeaveBalanceAsync(request.EmployeeId, request.LeaveTypeId, year, request.EmployeeId, cancellationToken);
            await EnsureQuotaAvailableAsync(balance, isQuotaControlled, calc.LeaveDays, includePending: true, excludeRequestId: null, cancellationToken);
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
            LeaveHours = calc.LeaveHours,
            LeaveDays = calc.LeaveDays,
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

        // คำนวณวันลาใหม่ฝั่ง server (ตามวันทำงานประจำสัปดาห์ / วันหยุดบริษัท)
        var calc = await ResolveLeaveDaysAsync(request.StartDatetime, request.EndDatetime, request.LeaveDays, request.IsDraft, cancellationToken);

        if (!request.IsDraft)
        {
            var year = ToThaiDate(request.StartDatetime).Year;
            var hasAttachment = request.AttachmentData is { Length: > 0 }
                || await _context.LeaveRequestDocuments.AnyAsync(d => d.LeaveRequestId == leaveRequest.Id, cancellationToken);
            await EnsureLeaveRulesAsync(leaveRequest.EmployeeId, request.LeaveTypeId, request.StartDatetime, request.EndDatetime,
                request.LeaveDays, hasAttachment, leaveRequest.Id, cancellationToken);

            var (balance, isQuotaControlled) = await EnsureLeaveBalanceAsync(leaveRequest.EmployeeId, request.LeaveTypeId, year, leaveRequest.EmployeeId, cancellationToken);
            await EnsureQuotaAvailableAsync(balance, isQuotaControlled, calc.LeaveDays, includePending: true, excludeRequestId: leaveRequest.Id, cancellationToken);
        }

        leaveRequest.LeaveTypeId = request.LeaveTypeId;
        leaveRequest.StartDatetime = request.StartDatetime;
        leaveRequest.EndDatetime = request.EndDatetime;
        leaveRequest.LeaveHours = calc.LeaveHours;
        leaveRequest.LeaveDays = calc.LeaveDays;
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

        // คำนวณวันลาใหม่ตามวันทำงานประจำสัปดาห์ / วันหยุดบริษัท (แก้ค่าที่อาจนับเสาร์–อาทิตย์มาจากหน้าเว็บเดิม)
        var calc = await ResolveLeaveDaysAsync(request.StartDatetime, request.EndDatetime, request.LeaveDays, allowZero: true, cancellationToken);
        request.LeaveDays = calc.LeaveDays;
        request.LeaveHours = calc.LeaveHours;

        // ตรวจโควตาซ้ำก่อนอนุมัติ — กันกรณีอนุมัติหลายใบจนยอดคงเหลือติดลบ
        var leaveYear = ToThaiDate(request.StartDatetime).Year;
        var (balance, isQuotaControlled) = await EnsureLeaveBalanceAsync(request.EmployeeId, request.LeaveTypeId, leaveYear, approverId, cancellationToken);
        await EnsureQuotaAvailableAsync(balance, isQuotaControlled, request.LeaveDays, includePending: false, excludeRequestId: request.Id, cancellationToken);

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
            // ยอดวันลาถูกสร้าง/ดึงไว้แล้วด้านบน (EnsureLeaveBalanceAsync) — ตัดยอดเสมอ
            // (เพิ่มรายการผ่าน navigation เพื่อให้ใช้ได้กับยอดที่เพิ่งสร้างใหม่ซึ่งยังไม่มี Id)
            balance.UsedDays += request.LeaveDays;
            RecalculateNetRemaining(balance);

            balance.Transactions.Add(new LeaveBalanceTransaction
            {
                TransactionType = "USED",
                Amount = -request.LeaveDays,
                ReferenceType = "leave_request",
                ReferenceId = request.Id,
                Note = $"อนุมัติคำร้องขอลาเลขที่ {request.RequestNo} ({FormatDays(request.LeaveDays)} วัน)" + (string.IsNullOrWhiteSpace(comment) ? "" : $" [ความเห็น: {comment}]"),
                CreatedAt = DateTime.UtcNow,
                CreatedByEmployeeId = approverId
            });

            // ซิงค์สถานะวันลาไปยัง AttendanceDaily — เฉพาะวันทำงาน (ไม่ลงวันหยุด) และใช้วันที่ตามเวลาไทย
            foreach (var d in calc.WorkingDates.Select(x => DateOnly.ParseExact(x, "yyyy-MM-dd")))
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
        }

        // บันทึกเสมอ (รวมกรณียังไม่ถึงขั้นสุดท้าย: จำนวนวันที่คำนวณใหม่ / ยอดวันลาที่สร้างอัตโนมัติ)
        await _context.SaveChangesAsync(cancellationToken);

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

        // ถ้าเคย APPROVED แล้ว ต้องคืนยอดวันลา — คืนเข้ายอดเดียวกับที่เคยตัด (อ้างอิงจากรายการ USED ของคำขอนี้)
        if (request.Status == "APPROVED")
        {
            var usedTx = await _context.LeaveBalanceTransactions
                .AsNoTracking()
                .Where(t => t.ReferenceType == "leave_request" && t.ReferenceId == request.Id && t.TransactionType == "USED")
                .OrderByDescending(t => t.Id)
                .FirstOrDefaultAsync(cancellationToken);

            LeaveBalance? balance;
            if (usedTx != null)
            {
                balance = await _context.LeaveBalances.FirstOrDefaultAsync(b => b.Id == usedTx.LeaveBalanceId, cancellationToken);
            }
            else
            {
                var year = ToThaiDate(request.StartDatetime).Year;
                balance = await _context.LeaveBalances
                    .FirstOrDefaultAsync(b => b.EmployeeId == request.EmployeeId && b.LeaveTypeId == request.LeaveTypeId && b.Year == year, cancellationToken);
            }

            if (balance != null)
            {
                var refundDays = usedTx != null ? Math.Abs(usedTx.Amount) : request.LeaveDays;
                balance.UsedDays = Math.Max(0, balance.UsedDays - refundDays);
                RecalculateNetRemaining(balance);

                _context.LeaveBalanceTransactions.Add(new LeaveBalanceTransaction
                {
                    LeaveBalanceId = balance.Id,
                    TransactionType = "REVERSAL",
                    Amount = refundDays,
                    ReferenceType = "leave_request",
                    ReferenceId = request.Id,
                    Note = $"ยกเลิกคำร้องขอลาเลขที่ {request.RequestNo} - คืนสิทธิ์ ({FormatDays(refundDays)} วัน)",
                    CreatedAt = DateTime.UtcNow,
                    CreatedByEmployeeId = cancelledBy
                });
            }

            var startDate = ToThaiDate(request.StartDatetime);
            var endDate = ToThaiDate(request.EndDatetime);

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
            PositionName = assign?.Position?.PositionName ?? "-",
            LeaveTypeId = r.LeaveTypeId,
            LeaveTypeCode = r.LeaveType?.LeaveCode ?? string.Empty,
            LeaveTypeName = r.LeaveType?.LeaveName ?? string.Empty,
            FormCategory = r.LeaveType?.FormCategory,
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
