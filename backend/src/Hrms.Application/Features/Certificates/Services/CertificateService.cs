using System.Text.Json;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.Certificates.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Certificates.Services;

public class CertificateService : ICertificateService
{
    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApprovalWorkflowService _approvalWorkflow;

    public CertificateService(
        IHrmsDbContext context,
        ICurrentUserService currentUserService,
        IApprovalWorkflowService approvalWorkflow)
    {
        _context = context;
        _currentUserService = currentUserService;
        _approvalWorkflow = approvalWorkflow;
    }

    private bool IsAdmin => _currentUserService.HasRole("ADMIN") || _currentUserService.HasRole("SYSTEM_SUPER");
    private bool IsHrOrAdmin => IsAdmin
        || _currentUserService.HasPermission("APPROVAL_EMP_APPROVE")
        || _currentUserService.HasPermission("EMP_DOC_APPROVE")
        || _currentUserService.HasPermission("EMP_DOC_VIEW");

    public async Task<List<CertificateTypeDto>> GetCertificateTypesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.CertificateTypes
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .Select(t => new CertificateTypeDto
            {
                Id = t.Id,
                CertificateCode = t.CertificateCode,
                CertificateName = t.CertificateName,
                ValidityMonths = t.ValidityMonths
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<CertificateRequestDto>> GetMyRequestsAsync(CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            return new List<CertificateRequestDto>();
        }

        return await GetRequestsInternalAsync(employeeId.Value, null, cancellationToken);
    }

    public async Task<List<CertificateRequestDto>> GetAllRequestsAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        return await GetRequestsInternalAsync(null, status, cancellationToken);
    }

    public async Task<CertificateRequestDto?> GetRequestByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var r = await _context.CertificateRequests
            .AsNoTracking()
            .Include(x => x.CertificateType)
            .Include(x => x.Employee)
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

        var currentEmpId = _currentUserService.EmployeeId;
        var isHrOrAdmin = IsHrOrAdmin;

        return await MapToDtoAsync(r, assign, currentEmpId, isHrOrAdmin, cancellationToken);
    }

    public async Task<CertificateRequestDto> ApproveRequestAsync(
        long id,
        long approverId,
        string? comment = null,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.CertificateRequests
            .Include(r => r.CertificateType)
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอหนังสือรับรองรหัส {id}");
        }

        if (request.Status == "APPROVED" || request.Status == "ISSUED")
        {
            return (await GetRequestByIdAsync(id, cancellationToken))!;
        }

        bool finalizeApproval = false;

        if (request.ApprovalInstanceId.HasValue)
        {
            var workflowResult = await _approvalWorkflow.ProcessActionAsync(
                request.ApprovalInstanceId.Value,
                approverId,
                "APPROVE",
                comment,
                cancellationToken);

            if (workflowResult.IsCompleted && workflowResult.Status == "APPROVED")
            {
                finalizeApproval = true;
            }
        }
        else
        {
            finalizeApproval = true;
        }

        if (finalizeApproval)
        {
            request.Status = "APPROVED";
            request.IssuedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return (await GetRequestByIdAsync(id, cancellationToken))!;
    }

    public async Task<CertificateRequestDto> RejectRequestAsync(
        long id,
        long approverId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var request = await _context.CertificateRequests
            .Include(r => r.CertificateType)
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอหนังสือรับรองรหัส {id}");
        }

        if (request.ApprovalInstanceId.HasValue)
        {
            await _approvalWorkflow.ProcessActionAsync(
                request.ApprovalInstanceId.Value,
                approverId,
                "REJECT",
                reason,
                cancellationToken);
        }

        request.Status = "REJECTED";
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetRequestByIdAsync(id, cancellationToken))!;
    }

    private async Task<List<CertificateRequestDto>> GetRequestsInternalAsync(long? employeeId, string? status, CancellationToken cancellationToken)
    {
        var currentEmpId = _currentUserService.EmployeeId;
        var isPrivileged = IsHrOrAdmin;

        var query = _context.CertificateRequests
            .AsNoTracking()
            .Include(r => r.CertificateType)
            .Include(r => r.Employee)
            .Include(r => r.ApprovalInstance).ThenInclude(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(r => r.ApprovalInstance).ThenInclude(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(r => r.ApprovalInstance).ThenInclude(i => i.Actions).ThenInclude(a => a.ApproverEmployee)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(r => r.EmployeeId == employeeId.Value);
        }
        else if (!isPrivileged)
        {
            // ถ้าไม่ใช่ Admin/HR และเป็นการดึงรายการคำขอเพื่ออนุมัติ/ประวัติ
            // ให้แสดงเฉพาะรายการที่ผู้ใช้นี้ "อยู่ในสายการอนุมัติ" (เป็นผู้อนุมัติในขั้นตอนใดขั้นตอนหนึ่ง หรือเคยดำเนินการไปแล้ว) เท่านั้น
            if (!currentEmpId.HasValue)
            {
                return new List<CertificateRequestDto>();
            }

            var allowedInstanceIds = await _approvalWorkflow.GetInstanceIdsForApproverUserAsync(
                currentEmpId.Value,
                "CERTIFICATE_REQUEST",
                cancellationToken);

            query = query.Where(r => r.ApprovalInstanceId.HasValue && allowedInstanceIds.Contains(r.ApprovalInstanceId.Value));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status.Trim().ToUpper());
        }

        var requests = await query
            .OrderByDescending(r => r.Id)
            .ToListAsync(cancellationToken);

        var empIds = requests.Select(r => r.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var isHrOrAdmin = IsHrOrAdmin;

        var items = new List<CertificateRequestDto>();
        foreach (var r in requests)
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
            var item = await MapToDtoAsync(r, assign, currentEmpId, isHrOrAdmin, cancellationToken);
            items.Add(item);
        }

        return items;
    }

    private async Task<CertificateRequestDto> MapToDtoAsync(
        CertificateRequest r,
        EmployeeAssignment? assign,
        long? currentEmpId,
        bool isHrOrAdmin,
        CancellationToken cancellationToken)
    {
        var effectiveStatus = r.Status;
        if (r.ApprovalInstance != null && r.ApprovalInstance.Status != "PENDING")
        {
            effectiveStatus = r.ApprovalInstance.Status;
        }

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
                    "MANAGER" => "หัวหน้าทีมของผู้ยื่น",
                    "DEPARTMENT_HEAD" => "ผู้จัดการแผนก",
                    "DIVISION_HEAD" => "ผู้จัดการฝ่าย",
                    "HR" => "ฝ่ายทรัพยากรบุคคล",
                    "CEO" => "ประธานเจ้าหน้าที่บริหาร",
                    _ => step.ApproverType
                };
            }

            if (currentEmpId.HasValue && r.EmployeeId != currentEmpId.Value)
            {
                if (IsAdmin)
                {
                    isMyTurn = true;
                }
                else
                {
                    isMyTurn = await _approvalWorkflow.CanUserApproveStepAsync(instance.Id, currentEmpId.Value, cancellationToken);
                }
            }
        }
        else if (instance == null && effectiveStatus == "PENDING" && isHrOrAdmin)
        {
            isMyTurn = true;
            currentApproverDisplay = "ฝ่ายทรัพยากรบุคคล";
        }

        var hasAlreadyApproved = instance != null && currentEmpId.HasValue &&
            instance.Actions.Any(a => a.ApproverEmployeeId == currentEmpId.Value && a.ActionDecision == "APPROVE");

        var finalApproveAction = instance?.Actions
            .Where(a => a.ActionDecision == "APPROVE")
            .OrderByDescending(a => a.ActionAt)
            .FirstOrDefault();

        var lastDecisionAction = instance?.Actions
            .Where(a => a.ActionDecision == "APPROVE" || a.ActionDecision == "REJECT")
            .OrderByDescending(a => a.ActionAt)
            .FirstOrDefault();

        return new CertificateRequestDto
        {
            Id = r.Id,
            EmployeeId = r.EmployeeId,
            EmployeeCode = r.Employee.EmployeeCode,
            EmployeeName = $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
            DepartmentName = assign?.Department?.DepartmentName ?? "-",
            PositionName = assign?.Position?.PositionName ?? "-",
            CertificateTypeId = r.CertificateTypeId,
            CertificateCode = r.CertificateType?.CertificateCode ?? string.Empty,
            CertificateName = r.CertificateType?.CertificateName ?? string.Empty,
            Purpose = r.Purpose,
            Status = effectiveStatus,
            RequestedAt = r.RequestedAt,
            IssuedAt = r.IssuedAt,
            ApprovalInstanceId = r.ApprovalInstanceId,
            CurrentStepNo = currentStepNo,
            TotalSteps = totalSteps,
            CurrentApproverDisplay = currentApproverDisplay,
            IsMyTurnToApprove = isMyTurn,
            HasAlreadyApproved = hasAlreadyApproved,
            ApprovedByName = lastDecisionAction?.ApproverEmployee?.FullName ?? finalApproveAction?.ApproverEmployee?.FullName,
            ApprovedAt = instance?.CompletedAt ?? lastDecisionAction?.ActionAt ?? finalApproveAction?.ActionAt,
            CanCancel = (effectiveStatus == "PENDING" && (r.EmployeeId == currentEmpId || isHrOrAdmin)),
            CanDownload = (effectiveStatus == "APPROVED" || effectiveStatus == "ISSUED")
        };
    }

    public async Task<CertificateRequestDto> CreateRequestAsync(CreateCertificateRequestDto dto, CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");
        }

        if (dto == null || dto.CertificateTypeId <= 0)
        {
            throw new ValidationException("กรุณาเลือกประเภทหนังสือรับรอง");
        }

        var certType = await _context.CertificateTypes
            .FirstOrDefaultAsync(t => t.Id == dto.CertificateTypeId, cancellationToken);

        if (certType == null)
        {
            throw new NotFoundException($"ไม่พบประเภทหนังสือรับรองรหัส {dto.CertificateTypeId}");
        }

        // วัตถุประสงค์ไม่บังคับ — ว่างได้ หนังสือจะใช้ข้อความกลางตามประเภท ("เป็นหลักฐานแสดงการทำงาน/รายได้")
        var request = new CertificateRequest
        {
            EmployeeId = employeeId.Value,
            CertificateTypeId = dto.CertificateTypeId,
            Purpose = dto.Purpose?.Trim() ?? string.Empty,
            Status = "PENDING",
            RequestedAt = DateTime.UtcNow
        };

        _context.CertificateRequests.Add(request);
        await _context.SaveChangesAsync(cancellationToken);

        // เชื่อมโยงระบบสายการอนุมัติ (Approval Workflow Engine)
        try
        {
            var instanceId = await _approvalWorkflow.StartWorkflowAsync(
                "CERTIFICATE_REQUEST",
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
            // หากยังไม่ได้ตั้งค่า ApprovalFlow สำหรับ CERTIFICATE_REQUEST ให้ดำเนินการต่อโดยยังไม่มี ApprovalInstance
        }

        var employee = await _context.Employees.FindAsync(new object[] { employeeId.Value }, cancellationToken);
        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId.Value && a.IsCurrent, cancellationToken);

        return new CertificateRequestDto
        {
            Id = request.Id,
            EmployeeId = request.EmployeeId,
            EmployeeCode = employee?.EmployeeCode ?? "",
            EmployeeName = $"{employee?.FirstName} {employee?.LastName}".Trim(),
            DepartmentName = assignment?.Department?.DepartmentName ?? "-",
            PositionName = assignment?.Position?.PositionName ?? "-",
            CertificateTypeId = request.CertificateTypeId,
            CertificateCode = certType.CertificateCode,
            CertificateName = certType.CertificateName,
            Purpose = request.Purpose,
            Status = request.Status,
            RequestedAt = request.RequestedAt,
            ApprovalInstanceId = request.ApprovalInstanceId,
            CanCancel = true,
            CanDownload = false
        };
    }

    public async Task<bool> CancelRequestAsync(long requestId, string? reason = null, CancellationToken cancellationToken = default)
    {
        var request = await _context.CertificateRequests
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอหนังสือรับรองรหัส {requestId}");
        }

        var currentEmpId = _currentUserService.EmployeeId;
        var isHrOrAdmin = IsHrOrAdmin;

        if (request.EmployeeId != currentEmpId && !isHrOrAdmin)
        {
            throw new UnauthorizedAccessException("คุณไม่มีสิทธิ์ยกเลิกคำขอนี้");
        }

        if (request.Status != "PENDING")
        {
            throw new InvalidOperationException($"ไม่สามารถยกเลิกคำขอที่อยู่ในสถานะ {request.Status} ได้");
        }

        request.Status = "CANCELLED";

        if (request.ApprovalInstanceId.HasValue && request.ApprovalInstance != null)
        {
            request.ApprovalInstance.Status = "CANCELLED";
            request.ApprovalInstance.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<CertificateDocumentDto> GetCertificateDocumentAsync(long requestId, string? lang = "TH", CancellationToken cancellationToken = default)
    {
        var request = await _context.CertificateRequests
            .AsNoTracking()
            .Include(r => r.CertificateType)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอหนังสือรับรองรหัส {requestId}");
        }

        await EnsureCanViewDocumentAsync(request, cancellationToken);

        // หนังสือที่อนุมัติแล้ว: ใช้ฉบับที่ตรึงไว้ (เงินเดือน ตำแหน่ง โลโก้ ฯลฯ ไม่เปลี่ยนตามข้อมูลภายหลัง)
        // ยังไม่มีฉบับตรึง (อนุมัติก่อนมีระบบนี้ / เพิ่งอนุมัติ) → สร้างจากข้อมูล ณ วันที่ออก แล้วตรึงไว้
        var isThai = (lang ?? "TH").Trim().ToUpperInvariant() != "EN";
        var frozen = isThai && (request.Status == "APPROVED" || request.Status == "ISSUED");
        CertificateDocumentDto? document = null;
        if (frozen && !string.IsNullOrWhiteSpace(request.DocumentSnapshot))
        {
            try
            {
                document = JsonSerializer.Deserialize<CertificateDocumentDto>(request.DocumentSnapshot);
            }
            catch (JsonException)
            {
                document = null;
            }
        }
        if (document == null)
        {
            document = await BuildDocumentAsync(
                request.EmployeeId, request.CertificateType, request.Purpose, request.IssuedAt, request.Id, lang, cancellationToken);
            if (frozen)
            {
                document.ApprovalTimeline = null;
                document.RequestedAt = null;
                var tracked = await _context.CertificateRequests.FirstAsync(r => r.Id == request.Id, cancellationToken);
                tracked.DocumentSnapshot = JsonSerializer.Serialize(document);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        document.RequestedAt = DateTime.SpecifyKind(request.RequestedAt, DateTimeKind.Utc);
        if (request.ApprovalInstanceId.HasValue)
        {
            document.ApprovalTimeline = await _approvalWorkflow.GetTimelineAsync(request.ApprovalInstanceId.Value, cancellationToken);
        }
        return document;
    }

    public async Task<CertificateDocumentDto> PreviewCertificateDocumentAsync(
        long certificateTypeId, string? purpose, string? lang = "TH", CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");
        }

        var certType = await _context.CertificateTypes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == certificateTypeId, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบประเภทหนังสือรับรองรหัส {certificateTypeId}");

        return await BuildDocumentAsync(employeeId.Value, certType, purpose, null, 0, lang, cancellationToken);
    }

    /// <summary>ดูเอกสารได้เฉพาะเจ้าของคำขอ, ฝ่ายบุคคล/ผู้ดูแลระบบ และผู้อนุมัติในสายอนุมัติของคำขอนั้น</summary>
    private async Task EnsureCanViewDocumentAsync(CertificateRequest request, CancellationToken cancellationToken)
    {
        var me = _currentUserService.EmployeeId;
        if (me.HasValue && me.Value == request.EmployeeId) return;

        if (IsHrOrAdmin) return;

        if (me.HasValue && request.ApprovalInstanceId.HasValue
            && await _approvalWorkflow.IsUserInWorkflowAsync(request.ApprovalInstanceId.Value, me.Value, cancellationToken))
        {
            return;
        }

        throw new ForbiddenException("คุณไม่มีสิทธิ์ดูเอกสารหนังสือรับรองฉบับนี้");
    }

    /// <summary>
    /// ประกอบข้อมูลหนังสือรับรองตามรูปแบบหนังสือรับรองของบริษัทในไทย
    /// (ที่ / วันที่ / ชื่อเรื่อง / "หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า..." / วัตถุประสงค์ / ผู้ลงนาม)
    /// </summary>
    private async Task<CertificateDocumentDto> BuildDocumentAsync(
        long employeeId, CertificateType? certType, string? purpose, DateTime? issuedAt, long requestId,
        string? lang, CancellationToken cancellationToken)
    {
        var language = (lang ?? "TH").Trim().ToUpperInvariant() == "EN" ? "EN" : "TH";

        var employee = await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบข้อมูลพนักงานรหัส {employeeId}");

        var company = await _context.Companies.AsNoTracking()
            .OrderBy(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        // ข้อมูลบริษัท ณ วันที่ออกหนังสือ (โลโก้/ตราประทับ/ที่อยู่ที่เปลี่ยนภายหลังไม่มีผลกับหนังสือที่ออกไปแล้ว)
        if (issuedAt.HasValue && company != null)
        {
            var at = DateTime.SpecifyKind(issuedAt.Value, DateTimeKind.Utc);
            var profile = await _context.CompanyProfileHistories.AsNoTracking()
                              .Where(h => h.CompanyId == company.Id && h.ValidFrom <= at)
                              .OrderByDescending(h => h.ValidFrom)
                              .FirstOrDefaultAsync(cancellationToken)
                          ?? await _context.CompanyProfileHistories.AsNoTracking()
                              .Where(h => h.CompanyId == company.Id)
                              .OrderBy(h => h.ValidFrom)
                              .FirstOrDefaultAsync(cancellationToken);
            if (profile != null)
            {
                company.CompanyName = profile.CompanyName;
                company.Address = profile.Address;
                company.Phone = profile.Phone;
                company.Email = profile.Email;
                company.LogoData = profile.LogoData;
                company.SealData = profile.SealData;
            }
        }

        // ตำแหน่ง/แผนก ณ วันที่ออกหนังสือ
        var assignments = await _context.EmployeeAssignments.AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => a.EmployeeId == employeeId)
            .ToListAsync(cancellationToken);
        var assignment = Hrms.Application.Common.Utilities.AssignmentAsOf.Pick(assignments,
            issuedAt.HasValue
                ? DateOnly.FromDateTime(DateTime.SpecifyKind(issuedAt.Value, DateTimeKind.Utc).AddHours(7))
                : DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)));

        var firstContract = await _context.EmploymentContracts.AsNoTracking()
            .Where(c => c.EmployeeId == employeeId && c.Status != "CANCELLED")
            .OrderBy(c => c.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        var nowTh = DateTime.UtcNow.AddHours(7);
        // ข้อมูลในหนังสือ ณ วันที่ออก (หนังสือที่อนุมัติแล้ว) หรือวันนี้ (ตัวอย่าง/รออนุมัติ)
        var todayTh = issuedAt.HasValue
            ? DateOnly.FromDateTime(DateTime.SpecifyKind(issuedAt.Value, DateTimeKind.Utc).AddHours(7))
            : DateOnly.FromDateTime(nowTh);
        var startDate = firstContract?.StartDate
            ?? assignment?.EffectiveFrom
            ?? DateOnly.FromDateTime(employee.CreatedAt.AddHours(7));

        // ประเภทการจ้างงาน: สัญญาจ้างที่มีผลล่าสุด (เหมือนการคิดสิทธิ์การลา) ถ้าไม่มีใช้ค่าในข้อมูลตำแหน่งงาน
        var currentContract = await _context.EmploymentContracts.AsNoTracking()
            .Include(c => c.EmployeeType)
            .Where(c => c.EmployeeId == employeeId && c.Status == "ACTIVE" && c.StartDate <= todayTh)
            .OrderByDescending(c => c.StartDate)
            .FirstOrDefaultAsync(cancellationToken);
        var employmentTypeName = currentContract?.EmployeeType?.TypeName;
        if (string.IsNullOrWhiteSpace(employmentTypeName))
        {
            var typeId = currentContract?.EmployeeTypeId ?? assignment?.EmployeeTypeId;
            if (typeId.HasValue)
            {
                employmentTypeName = await _context.EmployeeTypes.AsNoTracking()
                    .Where(t => t.Id == typeId.Value)
                    .Select(t => t.TypeName)
                    .FirstOrDefaultAsync(cancellationToken);
            }
        }
        var employmentStatusText = EmploymentStatusText(employee.EmploymentStatus, currentContract, todayTh);

        var salaryRecord = await _context.EmployeeSalaries.AsNoTracking()
            .Where(s => s.EmployeeId == employeeId && s.EffectiveFrom <= todayTh
                        && (s.EffectiveTo == null || s.EffectiveTo >= todayTh))
            .OrderByDescending(s => s.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        // ผู้มีอำนาจลงนาม (ลายเซ็นที่เปิดใช้งานล่าสุด เป็นค่าเริ่มต้น)
        var activeSignature = await _context.EmployeeSignatures.AsNoTracking()
            .Include(s => s.Employee)
            .Where(s => s.IsActive)
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        string signatoryName = string.Empty;
        string signatoryPosition = language == "TH" ? "ผู้มีอำนาจลงนาม" : "Authorized Signatory";
        string? signatureBase64 = null;
        if (activeSignature != null)
        {
            signatoryName = activeSignature.Employee.FullName;
            var signAssign = await _context.EmployeeAssignments.AsNoTracking()
                .Include(a => a.Position)
                .FirstOrDefaultAsync(a => a.EmployeeId == activeSignature.EmployeeId && a.IsCurrent, cancellationToken);
            signatoryPosition = signAssign?.Position?.PositionName ?? signatoryPosition;

            if (activeSignature.SignatureData.Length > 0)
            {
                var mime = string.IsNullOrWhiteSpace(activeSignature.MimeType) ? "image/png" : activeSignature.MimeType;
                signatureBase64 = $"data:{mime};base64,{Convert.ToBase64String(activeSignature.SignatureData)}";
            }
        }

        // หากเป็นเอกสารคำขอที่อนุมัติแล้ว และมีข้อมูลผู้อนุมัติจาก ApprovalAction ให้ใช้ข้อมูลผู้อนุมัติจริงที่เซ็นอนุมัติ
        if (requestId > 0)
        {
            var certReq = await _context.CertificateRequests.AsNoTracking()
                .Include(r => r.ApprovalInstance)
                    .ThenInclude(ai => ai!.Actions)
                        .ThenInclude(a => a.ApproverEmployee)
                            .ThenInclude(e => e!.Assignments.Where(x => x.IsCurrent))
                                .ThenInclude(x => x.Position)
                .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

            if (certReq?.ApprovalInstance != null)
            {
                var finalApprove = certReq.ApprovalInstance.Actions
                    .Where(a => a.ActionDecision == "APPROVE")
                    .OrderByDescending(a => a.ActionAt)
                    .FirstOrDefault();

                if (finalApprove?.ApproverEmployee != null)
                {
                    signatoryName = finalApprove.ApproverEmployee.FullName;
                    var pos = finalApprove.ApproverEmployee.Assignments
                        .Where(x => x.IsCurrent)
                        .Select(x => x.Position?.PositionName)
                        .FirstOrDefault(p => !string.IsNullOrWhiteSpace(p));
                    if (!string.IsNullOrWhiteSpace(pos)) signatoryPosition = pos;

                    var approverSig = await _context.EmployeeSignatures.AsNoTracking()
                        .Where(s => s.EmployeeId == finalApprove.ApproverEmployeeId && s.IsActive)
                        .OrderByDescending(s => s.UpdatedAt)
                        .FirstOrDefaultAsync(cancellationToken)
                        ?? await _context.EmployeeSignatures.AsNoTracking()
                            .Where(s => s.EmployeeId == finalApprove.ApproverEmployeeId)
                            .OrderByDescending(s => s.UpdatedAt)
                            .FirstOrDefaultAsync(cancellationToken);

                    if (approverSig != null && approverSig.SignatureData.Length > 0)
                    {
                        var mime = string.IsNullOrWhiteSpace(approverSig.MimeType) ? "image/png" : approverSig.MimeType;
                        signatureBase64 = $"data:{mime};base64,{Convert.ToBase64String(approverSig.SignatureData)}";
                    }
                }
            }
        }

        string? companyLogoBase64 = null;
        if (company?.LogoData != null && company.LogoData.Length > 0)
        {
            companyLogoBase64 = $"data:image/png;base64,{Convert.ToBase64String(company.LogoData)}";
        }

        var certCode = certType?.CertificateCode ?? "CERT_WORK";
        var includeSalary = certCode.Contains("SALARY", StringComparison.OrdinalIgnoreCase);
        var salary = includeSalary ? salaryRecord?.BaseSalary : null;

        // ค่าตำแหน่งตามโครงสร้างเงินเดือน (ตำแหน่ง/ระดับ) — ใช้หลักเดียวกับการคำนวณเงินเดือน
        decimal? positionAllowance = null;
        if (salary.HasValue && assignment != null)
        {
            var positionItemActive = await _context.PayrollItems.AsNoTracking()
                .AnyAsync(i => i.ItemCode == "INC_POSITION" && i.Status == "ACTIVE", cancellationToken);
            if (positionItemActive)
            {
                var structures = await _context.SalaryStructures.AsNoTracking()
                    .Where(st => st.Status == "ACTIVE" && st.PositionId == assignment.PositionId
                                 && st.EffectiveFrom <= todayTh && (st.EffectiveTo == null || st.EffectiveTo >= todayTh))
                    .OrderByDescending(st => st.EffectiveFrom)
                    .ToListAsync(cancellationToken);
                var levelId = assignment.EmployeeLevelId ?? assignment.Position?.EmployeeLevelId;
                var structure = (levelId.HasValue ? structures.FirstOrDefault(st => st.EmployeeLevelId == levelId.Value) : null)
                                ?? structures.FirstOrDefault();
                if (structure != null && structure.PositionAllowance > 0) positionAllowance = structure.PositionAllowance;
            }
        }
        var totalIncome = salary.HasValue ? salary.Value + (positionAllowance ?? 0) : (decimal?)null;

        var fullName = employee.FullName;
        // ชื่อตำแหน่งบางรายการขึ้นต้นด้วย "ตำแหน่ง" อยู่แล้ว — ตัดออกเพื่อไม่ให้เป็น "ตำแหน่ง ตำแหน่ง..."
        var position = System.Text.RegularExpressions.Regex.Replace(assignment?.Position?.PositionName ?? "-", @"^ตำแหน่ง\s*", "");
        var department = assignment?.Department?.DepartmentName ?? "-";
        var companyName = company?.CompanyName ?? string.Empty;
        var issueDate = issuedAt ?? nowTh;
        var duration = ServiceDuration(startDate, todayTh, language);
        // ว่าง = ให้หน้าเอกสารใช้ข้อความกลางตามประเภทหนังสือ
        var purposeText = purpose?.Trim() ?? string.Empty;

        var bodyTh = $"หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า {fullName} เป็นพนักงานของ{companyName} "
                     + $"ตำแหน่ง {position} สังกัด{department} โดยเริ่มปฏิบัติงานตั้งแต่วันที่ {ThaiDate(startDate)} "
                     + $"จนถึงปัจจุบัน รวมระยะเวลา {ServiceDuration(startDate, todayTh, "TH")}"
                     + (salary.HasValue
                         ? $" ได้รับอัตราเงินเดือนเดือนละ {salary.Value:N2} บาท ({BahtText(salary.Value)}) ซึ่งอัตรานี้ไม่รวมค่าตอบแทนและเงินพิเศษอื่นๆ"
                         : string.Empty);
        var bodyEn = $"This is to certify that {fullName} has been employed by {companyName} since "
                     + $"{EnglishDate(startDate)} to the present ({ServiceDuration(startDate, todayTh, "EN")}), "
                     + $"currently holding the position of {position}, {department}"
                     + (salary.HasValue
                         ? $", and receives a monthly salary of THB {salary.Value:N2}, excluding other allowances and benefits."
                         : ".");

        return new CertificateDocumentDto
        {
            RequestId = requestId,
            IsPreview = requestId == 0,
            DocumentNumber = requestId == 0 ? "(ออกเลขเมื่ออนุมัติ)" : $"HR/{issueDate.Year + 543}/{requestId:D4}",
            IssueDate = issueDate,
            Language = language,
            CertificateCode = certCode,
            CertificateTitle = certType?.CertificateName ?? "หนังสือรับรอง",
            IncludeSalary = includeSalary,
            CompanyName = companyName,
            CompanyAddress = company?.Address,
            CompanyPhone = company?.Phone,
            CompanyEmail = company?.Email,
            CompanyLogoBase64 = companyLogoBase64,
            CompanySealBase64 = company?.SealData != null && company.SealData.Length > 0
                ? $"data:image/png;base64,{Convert.ToBase64String(company.SealData)}"
                : null,
            EmployeeId = employeeId,
            EmployeeCode = employee.EmployeeCode,
            FullName = fullName,
            CitizenIdMasked = employee.CitizenIdMasked,
            PositionName = position,
            DepartmentName = department,
            EmploymentTypeName = string.IsNullOrWhiteSpace(employmentTypeName) ? "-" : employmentTypeName.Trim(),
            EmploymentStatusText = employmentStatusText,
            StartDate = startDate.ToDateTime(TimeOnly.MinValue),
            StartDateText = language == "TH" ? ThaiDate(startDate) : EnglishDate(startDate),
            IssueDateText = language == "TH" ? ThaiDate(DateOnly.FromDateTime(issueDate)) : EnglishDate(DateOnly.FromDateTime(issueDate)),
            ValidityMonths = certType?.ValidityMonths,
            ExpiryDateText = certType?.ValidityMonths is int vm && vm > 0
                ? (language == "TH" ? ThaiDate(DateOnly.FromDateTime(issueDate).AddMonths(vm)) : EnglishDate(DateOnly.FromDateTime(issueDate).AddMonths(vm)))
                : null,
            ServiceDurationText = duration,
            BaseSalary = salary,
            SalaryText = salary.HasValue ? BahtText(salary.Value) : null,
            PositionAllowance = positionAllowance,
            TotalIncome = totalIncome,
            TotalIncomeText = totalIncome.HasValue ? BahtText(totalIncome.Value) : null,
            Purpose = purposeText,
            CertificationBodyTh = bodyTh,
            CertificationBodyEn = bodyEn,
            SignatoryName = signatoryName,
            SignatoryPosition = signatoryPosition,
            SignatureBase64 = signatureBase64
        };
    }

    private static readonly string[] ThaiMonths =
    {
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    };

    /// <summary>สถานะการเป็นพนักงานสำหรับหนังสือรับรอง</summary>
    private static string EmploymentStatusText(string? employmentStatus, EmploymentContract? contract, DateOnly today)
    {
        var status = (employmentStatus ?? string.Empty).Trim().ToUpperInvariant();
        if (status == "RESIGNED" || status == "TERMINATED") return "พ้นสภาพการเป็นพนักงาน";
        if (status != "ACTIVE") return "ไม่ได้ปฏิบัติงาน";
        var onProbation = contract != null
                          && contract.ProbationPassedDate == null
                          && contract.ProbationEndDate.HasValue
                          && contract.ProbationEndDate.Value >= today;
        return onProbation ? "อยู่ระหว่างทดลองงาน" : "ปฏิบัติงานอยู่ในปัจจุบัน";
    }

    private static string ThaiDate(DateOnly d) => $"{d.Day} {ThaiMonths[d.Month - 1]} พ.ศ. {d.Year + 543}";

    private static string EnglishDate(DateOnly d) =>
        d.ToString("d MMMM yyyy", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>อายุงานเป็นปี/เดือน เช่น "3 ปี 8 เดือน"</summary>
    private static string ServiceDuration(DateOnly start, DateOnly today, string language)
    {
        int months = (today.Year - start.Year) * 12 + today.Month - start.Month;
        if (today.Day < start.Day) months--;
        months = Math.Max(0, months);
        int y = months / 12, m = months % 12;
        if (language == "TH")
        {
            if (y == 0 && m == 0) return "ไม่ถึง 1 เดือน";
            return ((y > 0 ? $"{y} ปี " : "") + (m > 0 ? $"{m} เดือน" : "")).Trim();
        }
        if (y == 0 && m == 0) return "less than 1 month";
        return ((y > 0 ? $"{y} year{(y > 1 ? "s" : "")} " : "") + (m > 0 ? $"{m} month{(m > 1 ? "s" : "")}" : "")).Trim();
    }

    private static readonly string[] ThaiDigits = { "", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า" };
    private static readonly string[] ThaiPlaces = { "", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน" };

    /// <summary>อ่านตัวเลขเป็นภาษาไทย (รองรับหลักล้านขึ้นไป)</summary>
    private static string ReadThaiNumber(long n, bool hasHigher = false)
    {
        if (n == 0) return string.Empty;
        var result = string.Empty;
        if (n >= 1_000_000)
        {
            result = ReadThaiNumber(n / 1_000_000) + "ล้าน";
            n %= 1_000_000;
            if (n == 0) return result;
            hasHigher = true;
        }
        var s = n.ToString();
        for (int i = 0; i < s.Length; i++)
        {
            int d = s[i] - '0';
            int place = s.Length - i - 1;
            if (d == 0) continue;
            if (place == 0 && d == 1 && (s.Length > 1 || hasHigher)) result += "เอ็ด";
            else if (place == 1 && d == 2) result += "ยี่" + ThaiPlaces[1];
            else if (place == 1 && d == 1) result += ThaiPlaces[1];
            else result += ThaiDigits[d] + ThaiPlaces[place];
        }
        return result;
    }

    /// <summary>จำนวนเงินเป็นตัวอักษรไทย เช่น 16000 → "หนึ่งหมื่นหกพันบาทถ้วน"</summary>
    private static string BahtText(decimal amount)
    {
        amount = Math.Round(Math.Abs(amount), 2, MidpointRounding.AwayFromZero);
        long baht = (long)Math.Floor(amount);
        int satang = (int)Math.Round((amount - baht) * 100);
        if (baht == 0 && satang == 0) return "ศูนย์บาทถ้วน";
        var text = baht > 0 ? ReadThaiNumber(baht) + "บาท" : string.Empty;
        text += satang > 0 ? ReadThaiNumber(satang) + "สตางค์" : "ถ้วน";
        return text;
    }

    public async Task<List<EmployeeSignatureDto>> GetActiveSignaturesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.EmployeeSignatures
            .AsNoTracking()
            .Include(s => s.Employee)
            .Where(s => s.IsActive) // ประวัติลายเซ็นเก่าเก็บไว้ให้เอกสารเดิม ไม่ต้องแสดงในรายการ
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new EmployeeSignatureDto
            {
                Id = s.Id,
                EmployeeId = s.EmployeeId,
                EmployeeName = $"{s.Employee.FirstName} {s.Employee.LastName}".Trim(),
                FileName = s.FileName,
                IsActive = s.IsActive,
                UploadedAt = s.UploadedAt,
                SignatureBase64 = s.SignatureData.Length > 0
                    ? $"data:image/png;base64,{Convert.ToBase64String(s.SignatureData)}"
                    : null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<EmployeeSignatureDto> UploadSignatureAsync(SignatureUploadDto dto, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees.FindAsync(new object[] { dto.EmployeeId }, cancellationToken);
        if (employee == null)
        {
            throw new KeyNotFoundException($"ไม่พบข้อมูลพนักงานรหัส {dto.EmployeeId}");
        }

        byte[] bytes;
        try
        {
            var raw = dto.Base64Data.Contains(",") ? dto.Base64Data.Split(',')[1] : dto.Base64Data;
            bytes = Convert.FromBase64String(raw);
        }
        catch
        {
            throw new ValidationException("ข้อมูลภาพลายเซ็น (Base64) ไม่ถูกต้อง");
        }

        // หากตั้งค่าเป็น Active ให้ปิดลายเซ็นเดิมของพนักงานคนนี้ก่อน (เก็บไว้เป็นประวัติ ไม่ลบ)
        if (dto.IsActive)
        {
            var existing = await _context.EmployeeSignatures
                .Where(s => s.EmployeeId == dto.EmployeeId && s.IsActive)
                .ToListAsync(cancellationToken);
            foreach (var sig in existing)
            {
                sig.IsActive = false;
                sig.DeactivatedAt = DateTime.UtcNow;
                sig.UpdatedAt = DateTime.UtcNow;
            }
            if (existing.Count > 0) await _context.SaveChangesAsync(cancellationToken);
        }

        var signature = new EmployeeSignature
        {
            EmployeeId = dto.EmployeeId,
            SignatureData = bytes,
            FileName = dto.FileName,
            FileSize = bytes.Length,
            MimeType = dto.MimeType,
            IsActive = dto.IsActive,
            UploadedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.EmployeeSignatures.Add(signature);
        await _context.SaveChangesAsync(cancellationToken);

        return new EmployeeSignatureDto
        {
            Id = signature.Id,
            EmployeeId = signature.EmployeeId,
            EmployeeName = $"{employee.FirstName} {employee.LastName}".Trim(),
            FileName = signature.FileName,
            IsActive = signature.IsActive,
            UploadedAt = signature.UploadedAt,
            SignatureBase64 = $"data:{signature.MimeType};base64,{Convert.ToBase64String(bytes)}"
        };
    }
}
