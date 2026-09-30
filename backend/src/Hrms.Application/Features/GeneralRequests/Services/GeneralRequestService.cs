using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.GeneralRequests.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.GeneralRequests.Services;

/// <summary>
/// คำขออื่นๆ — ยื่นคำขอทั่วไปถึงฝ่ายบุคคล ผ่านสายการอนุมัติประเภท GENERAL_REQUEST
/// (ถ้ายังไม่ได้ตั้งสายการอนุมัติ ฝ่ายบุคคล/แอดมินเป็นผู้อนุมัติ)
/// </summary>
public class GeneralRequestService : IGeneralRequestService
{
    public const string DocumentTypeCode = "GENERAL_REQUEST";
    private const long MaxFileBytes = 5 * 1024 * 1024;

    private static readonly string[] AdminRoles = { "ADMIN", "SUPER_ADMIN", "SYS_ADMIN", "SYSTEM_SUPER" };
    private static readonly string[] HrRoles = { "HR", "HR_ADMIN", "HR_MGR" };

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IApprovalWorkflowService _approvalWorkflow;

    public GeneralRequestService(IHrmsDbContext context, ICurrentUserService currentUser, IApprovalWorkflowService approvalWorkflow)
    {
        _context = context;
        _currentUser = currentUser;
        _approvalWorkflow = approvalWorkflow;
    }

    private bool IsAdmin => AdminRoles.Any(_currentUser.HasRole);
    private bool IsHrOrAdmin => IsAdmin || HrRoles.Any(_currentUser.HasRole);

    private IQueryable<GeneralRequest> BaseQuery() => _context.GeneralRequests
        .AsNoTracking()
        .Include(r => r.Employee)
        .Include(r => r.ApprovalInstance).ThenInclude(i => i!.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
        .Include(r => r.ApprovalInstance).ThenInclude(i => i!.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
        .Include(r => r.ApprovalInstance).ThenInclude(i => i!.Actions).ThenInclude(a => a.ApproverEmployee);

    public async Task<List<GeneralRequestDto>> GetMyRequestsAsync(CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId;
        if (!me.HasValue) return new List<GeneralRequestDto>();
        var list = await BaseQuery().Where(r => r.EmployeeId == me.Value)
            .OrderByDescending(r => r.Id).ToListAsync(cancellationToken);
        return await MapListAsync(list, cancellationToken);
    }

    public async Task<List<GeneralRequestDto>> GetAllRequestsAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId;
        var query = BaseQuery();

        if (!IsAdmin)
        {
            if (!me.HasValue) return new List<GeneralRequestDto>();
            var allowed = await _approvalWorkflow.GetInstanceIdsForApproverUserAsync(me.Value, DocumentTypeCode, cancellationToken);
            var hr = IsHrOrAdmin;
            // ผู้อนุมัติเห็นเฉพาะคำขอในสายของตน / ฝ่ายบุคคลเห็นคำขอที่ไม่มีสายการอนุมัติด้วย (ต้องพิจารณาเอง)
            query = query.Where(r =>
                (r.ApprovalInstanceId.HasValue && allowed.Contains(r.ApprovalInstanceId.Value))
                || (hr && !r.ApprovalInstanceId.HasValue));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim().ToUpperInvariant();
            query = query.Where(r => r.Status == s);
        }

        var list = await query.OrderByDescending(r => r.Id).ToListAsync(cancellationToken);
        return await MapListAsync(list, cancellationToken);
    }

    public async Task<GeneralRequestDto> CreateRequestAsync(CreateGeneralRequestDto dto, CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId
            ?? throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");

        if (string.IsNullOrWhiteSpace(dto.DocumentType))
            throw new ValidationException("กรุณาเลือกประเภทคำขอ");
        if (string.IsNullOrWhiteSpace(dto.Purpose))
            throw new ValidationException("กรุณาระบุรายละเอียดของคำขอ");

        var request = new GeneralRequest
        {
            EmployeeId = me,
            RequestType = dto.DocumentType.Trim(),
            Purpose = dto.Purpose.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            IssueDate = ParseDate(dto.IssueDate),
            ExpiryDate = ParseDate(dto.ExpiryDate),
            Status = "PENDING",
            RequestedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrWhiteSpace(dto.FileData))
        {
            var (bytes, mime) = DecodeFile(dto.FileData, dto.FileName);
            if (bytes.LongLength > MaxFileBytes)
                throw new ValidationException("ไฟล์แนบต้องมีขนาดไม่เกิน 5 MB");
            request.FileData = bytes;
            request.FileSize = bytes.LongLength;
            request.FileMimeType = mime;
            request.FileName = string.IsNullOrWhiteSpace(dto.FileName) ? "attachment" : Path.GetFileName(dto.FileName.Trim());
        }

        _context.GeneralRequests.Add(request);
        await _context.SaveChangesAsync(cancellationToken);

        var th = DateTime.UtcNow.AddHours(7);
        request.RequestNo = $"GR-{th:yyyyMM}-{request.Id:D4}";

        // เริ่มสายการอนุมัติ (ถ้ายังไม่ได้ตั้งค่า ฝ่ายบุคคลเป็นผู้พิจารณา)
        try
        {
            var instanceId = await _approvalWorkflow.StartWorkflowAsync(DocumentTypeCode, request.Id, me, cancellationToken);
            if (instanceId.HasValue) request.ApprovalInstanceId = instanceId.Value;
        }
        catch
        {
            // ไม่มีสายการอนุมัติที่ตรงเงื่อนไข — คงสถานะรอฝ่ายบุคคลพิจารณา
        }
        await _context.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(request.Id, cancellationToken);
    }

    public async Task<GeneralRequestDto> ApproveRequestAsync(long id, string? comment, CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId
            ?? throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");
        var request = await _context.GeneralRequests.FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบคำขอรหัส {id}");

        if (request.Status != "PENDING")
            throw new InvalidOperationException($"คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ (สถานะปัจจุบัน: {request.Status})");

        if (request.ApprovalInstanceId.HasValue)
        {
            // สถานะคำขอถูกอัปเดตใน workflow เมื่ออนุมัติครบทุกขั้น
            await _approvalWorkflow.ProcessActionAsync(request.ApprovalInstanceId.Value, me, "APPROVE", comment, cancellationToken);
        }
        else
        {
            if (!IsHrOrAdmin) throw new ForbiddenException("คำขอนี้ต้องให้ฝ่ายบุคคลเป็นผู้อนุมัติ");
            request.Status = "APPROVED";
            request.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task<GeneralRequestDto> RejectRequestAsync(long id, string reason, CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId
            ?? throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");
        if (string.IsNullOrWhiteSpace(reason))
            throw new ValidationException("กรุณาระบุเหตุผลที่ไม่อนุมัติ");

        var request = await _context.GeneralRequests.FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบคำขอรหัส {id}");

        if (request.Status != "PENDING")
            throw new InvalidOperationException($"คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ (สถานะปัจจุบัน: {request.Status})");

        if (request.ApprovalInstanceId.HasValue)
        {
            await _approvalWorkflow.ProcessActionAsync(request.ApprovalInstanceId.Value, me, "REJECT", reason.Trim(), cancellationToken);
        }
        else if (!IsHrOrAdmin)
        {
            throw new ForbiddenException("คำขอนี้ต้องให้ฝ่ายบุคคลเป็นผู้พิจารณา");
        }

        request.Status = "REJECTED";
        request.RejectReason = reason.Trim();
        request.CompletedAt ??= DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task<bool> CancelRequestAsync(long id, CancellationToken cancellationToken = default)
    {
        var request = await _context.GeneralRequests
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบคำขอรหัส {id}");

        var me = _currentUser.EmployeeId;
        if (request.EmployeeId != me && !IsHrOrAdmin)
            throw new ForbiddenException("คุณไม่มีสิทธิ์ยกเลิกคำขอนี้");
        if (request.Status != "PENDING")
            throw new InvalidOperationException($"ไม่สามารถยกเลิกคำขอที่อยู่ในสถานะ {request.Status} ได้");

        request.Status = "CANCELLED";
        request.CompletedAt = DateTime.UtcNow;
        if (request.ApprovalInstance != null && request.ApprovalInstance.Status == "PENDING")
        {
            request.ApprovalInstance.Status = "CANCELLED";
            request.ApprovalInstance.CompletedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<GeneralRequestAttachment> GetAttachmentAsync(long id, CancellationToken cancellationToken = default)
    {
        var request = await _context.GeneralRequests.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"ไม่พบคำขอรหัส {id}");

        var me = _currentUser.EmployeeId;
        var allowed = request.EmployeeId == me || IsHrOrAdmin
            || (me.HasValue && request.ApprovalInstanceId.HasValue
                && await _approvalWorkflow.IsUserInWorkflowAsync(request.ApprovalInstanceId.Value, me.Value, cancellationToken));
        if (!allowed) throw new ForbiddenException("คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์แนบของคำขอนี้");

        if (request.FileData == null || request.FileData.Length == 0)
            throw new KeyNotFoundException("คำขอนี้ไม่มีไฟล์แนบ");

        return new GeneralRequestAttachment
        {
            FileName = request.FileName ?? "attachment",
            MimeType = request.FileMimeType ?? "application/octet-stream",
            Data = request.FileData
        };
    }

    // ───────────────────────── helpers ─────────────────────────

    private async Task<GeneralRequestDto> GetDtoAsync(long id, CancellationToken cancellationToken)
    {
        var r = await BaseQuery().FirstAsync(x => x.Id == id, cancellationToken);
        return (await MapListAsync(new List<GeneralRequest> { r }, cancellationToken))[0];
    }

    private async Task<List<GeneralRequestDto>> MapListAsync(List<GeneralRequest> requests, CancellationToken cancellationToken)
    {
        var me = _currentUser.EmployeeId;
        var isHr = IsHrOrAdmin;
        var empIds = requests.Select(r => r.EmployeeId).Distinct().ToList();
        var assignments = (await _context.EmployeeAssignments.AsNoTracking()
                .Include(a => a.Department)
                .Include(a => a.Position)
                .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
                .ToListAsync(cancellationToken))
            .GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.EffectiveFrom).First());

        var result = new List<GeneralRequestDto>();
        foreach (var r in requests)
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
            var instance = r.ApprovalInstance;
            var status = r.Status;
            if (instance != null && instance.Status != "PENDING" && status == "PENDING") status = instance.Status;

            string? currentApprover = null;
            bool isMyTurn = false;
            if (instance != null && instance.Status == "PENDING")
            {
                var step = instance.ApprovalFlow?.Steps.FirstOrDefault(s => s.StepNo == instance.CurrentStepNo);
                if (step != null)
                {
                    currentApprover = step.ApproverType switch
                    {
                        "ROLE" => step.ApproverRole?.RoleName ?? "บทบาทตามระบบ",
                        "EMPLOYEE" => step.ApproverEmployee?.FullName ?? "พนักงานระบุตัวบุคคล",
                        "MANAGER" => "หัวหน้างานโดยตรง",
                        "DEPARTMENT_HEAD" => "หัวหน้าแผนก",
                        "DIVISION_HEAD" => "หัวหน้าฝ่าย",
                        "HR" => "ฝ่ายทรัพยากรบุคคล",
                        "CEO" => "ผู้บริหารสูงสุด",
                        _ => step.ApproverType
                    };
                }
                if (me.HasValue)
                    isMyTurn = await _approvalWorkflow.CanUserApproveStepAsync(instance.Id, me.Value, cancellationToken);
            }
            else if (instance == null && status == "PENDING")
            {
                currentApprover = "ฝ่ายทรัพยากรบุคคล";
                isMyTurn = isHr;
            }

            var lastApprove = instance?.Actions
                .Where(a => a.ActionDecision == "APPROVE")
                .OrderByDescending(a => a.ActionAt)
                .FirstOrDefault();
            var lastReject = instance?.Actions
                .Where(a => a.ActionDecision == "REJECT")
                .OrderByDescending(a => a.ActionAt)
                .FirstOrDefault();

            result.Add(new GeneralRequestDto
            {
                Id = r.Id,
                RequestNo = string.IsNullOrEmpty(r.RequestNo) ? $"GR-{r.Id:D4}" : r.RequestNo,
                EmployeeId = r.EmployeeId,
                EmployeeCode = r.Employee.EmployeeCode,
                EmployeeName = r.Employee.FullName,
                DepartmentName = assign?.Department?.DepartmentName ?? "-",
                PositionName = assign?.Position?.PositionName ?? "-",
                DocumentType = r.RequestType,
                Purpose = r.Purpose,
                Notes = r.Notes,
                IssueDate = r.IssueDate?.ToString("yyyy-MM-dd"),
                ExpiryDate = r.ExpiryDate?.ToString("yyyy-MM-dd"),
                FileName = r.FileName,
                FileSize = r.FileSize,
                Status = status,
                SubmittedAt = r.RequestedAt,
                ApprovalInstanceId = r.ApprovalInstanceId,
                CurrentStepNo = instance?.CurrentStepNo,
                TotalSteps = instance?.ApprovalFlow?.Steps.Count ?? 0,
                CurrentApproverDisplay = currentApprover,
                IsMyTurnToApprove = isMyTurn,
                CanApprove = isMyTurn,
                CanReject = isMyTurn,
                HasAlreadyApproved = me.HasValue && instance != null
                    && instance.Actions.Any(a => a.ApproverEmployeeId == me.Value && a.ActionDecision == "APPROVE"),
                ApprovedByName = (status == "REJECTED" ? lastReject : lastApprove)?.ApproverEmployee?.FullName,
                ApprovedAt = r.CompletedAt ?? instance?.CompletedAt,
                RejectReason = r.RejectReason ?? lastReject?.Comment,
                CanCancel = status == "PENDING" && (r.EmployeeId == me || isHr)
            });
        }
        return result;
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d)
            ? d
            : null;

    private static (byte[] Bytes, string Mime) DecodeFile(string data, string? fileName)
    {
        var mime = "application/octet-stream";
        var payload = data.Trim();
        if (payload.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var comma = payload.IndexOf(',');
            if (comma > 0)
            {
                var header = payload[5..comma];
                var semi = header.IndexOf(';');
                if (semi > 0) mime = header[..semi];
                payload = payload[(comma + 1)..];
            }
        }
        else if (!string.IsNullOrWhiteSpace(fileName))
        {
            mime = Path.GetExtension(fileName).ToLowerInvariant() switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => mime
            };
        }

        try
        {
            return (Convert.FromBase64String(payload), mime);
        }
        catch (FormatException)
        {
            throw new ValidationException("ไฟล์แนบไม่ถูกต้อง");
        }
    }
}
