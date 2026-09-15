using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeaveRequestService : ILeaveRequestService
{
    private readonly IHrmsDbContext _context;

    public LeaveRequestService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<(List<LeaveRequestDto> Items, int TotalCount)> GetAllAsync(
        long? employeeId = null,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _context.LeaveRequests
            .AsNoTracking()
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Include(r => r.Documents)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(r => r.EmployeeId == employeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status.ToUpper());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var requests = await query
            .OrderByDescending(r => r.StartDatetime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var empIds = requests.Select(r => r.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var items = requests.Select(r =>
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
            var emp = r.Employee;
            var empName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty;

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
                Documents = r.Documents.Select(d => new LeaveRequestDocumentDto
                {
                    Id = d.Id,
                    LeaveRequestId = d.LeaveRequestId,
                    FileName = d.FileName,
                    UploadedAt = d.UploadedAt
                }).ToList()
            };
        }).ToList();

        return (items, totalCount);
    }

    public async Task<LeaveStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endOfMonth = startOfMonth.AddMonths(1);

        var pendingCount = await _context.LeaveRequests
            .CountAsync(r => r.Status == "PENDING", cancellationToken);

        var approvedThisMonth = await _context.LeaveRequests
            .Where(r => r.Status == "APPROVED" && r.StartDatetime >= startOfMonth && r.StartDatetime < endOfMonth)
            .ToListAsync(cancellationToken);

        var rejectedCount = await _context.LeaveRequests
            .CountAsync(r => r.Status == "REJECTED" && r.StartDatetime >= startOfMonth && r.StartDatetime < endOfMonth, cancellationToken);

        return new LeaveStatsDto
        {
            PendingRequestsCount = pendingCount,
            ApprovedThisMonthCount = approvedThisMonth.Count,
            RejectedThisMonthCount = rejectedCount,
            TotalLeaveDaysThisMonth = approvedThisMonth.Sum(r => r.LeaveDays)
        };
    }

    public async Task<LeaveRequestDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var r = await _context.LeaveRequests
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.LeaveType)
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (r == null) return null;

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .FirstOrDefaultAsync(a => a.EmployeeId == r.EmployeeId && a.IsCurrent, cancellationToken);

        var emp = r.Employee;
        return new LeaveRequestDto
        {
            Id = r.Id,
            RequestNo = r.RequestNo,
            EmployeeId = r.EmployeeId,
            EmployeeCode = emp?.EmployeeCode ?? string.Empty,
            EmployeeName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty,
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
            Documents = r.Documents.Select(d => new LeaveRequestDocumentDto
            {
                Id = d.Id,
                LeaveRequestId = d.LeaveRequestId,
                FileName = d.FileName,
                UploadedAt = d.UploadedAt
            }).ToList()
        };
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

        // Validate Leave Balance — ข้ามการตรวจสอบถ้าเป็นการบันทึกแบบร่าง (ยังไม่ได้ยื่นจริง)
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

        return (await GetByIdAsync(leaveRequest.Id, cancellationToken))!;
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

        // ถ้ากำลังจะยื่นจริงจากแบบร่างเดิม (IsDraft = false) ต้องตรวจสอบโควตาเหมือนตอนสร้างคำขอใหม่
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

        return (await GetByIdAsync(leaveRequest.Id, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> ApproveAsync(long id, long? approverId = null, CancellationToken cancellationToken = default)
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
            return (await GetByIdAsync(id, cancellationToken))!;
        }

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
                Note = $"อนุมัติคำร้องขอลาเลขที่ {request.RequestNo} ({request.LeaveDays} วัน)",
                CreatedAt = DateTime.UtcNow,
                CreatedByEmployeeId = approverId
            });
        }

        request.Status = "APPROVED";
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> RejectAsync(long id, string? reason = null, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests.FindAsync([id], cancellationToken);
        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำร้องขอลาหยุดงานรหัส ID {id}");
        }

        request.Status = "REJECTED";
        request.CancelReason = reason;
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<LeaveRequestDto> CancelAsync(long id, string? reason = null, long? cancelledBy = null, bool revertToDraftIfPending = false, CancellationToken cancellationToken = default)
    {
        var request = await _context.LeaveRequests.FindAsync([id], cancellationToken);
        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำร้องขอลาหยุดงานรหัส ID {id}");
        }

        // พนักงานถอนคำขอที่ยังรออนุมัติ (ยังไม่มีผลจริงกับโควตา) กลับไปเป็นแบบร่างแทนการยกเลิกถาวร
        // เพื่อให้แก้ไขและยื่นใหม่ได้เองในภายหลัง โดยไม่ต้องกรอกข้อมูลใหม่ทั้งหมด
        if (revertToDraftIfPending && request.Status == "PENDING")
        {
            request.Status = "DRAFT";
            request.SubmittedAt = null;
            await _context.SaveChangesAsync(cancellationToken);

            return (await GetByIdAsync(id, cancellationToken))!;
        }

        // If previously approved, reverse the deducted balance
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
        }

        request.Status = "CANCELLED";
        request.CancelledAt = DateTime.UtcNow;
        request.CancelReason = reason;
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
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

        // Cascade Delete ที่ตั้งค่าไว้ใน DbContext จะลบเอกสารแนบ (LeaveRequestDocument) ที่ผูกอยู่ให้อัตโนมัติ
        _context.LeaveRequests.Remove(request);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
