using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Approvals.Services;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

/// <summary>
/// คำขอเบิกสวัสดิการที่พนักงานยื่นเอง — สถานะ PENDING กันวงเงินไว้ก่อน, อนุมัติครบแล้วจึงนับเป็นยอดใช้สิทธิ์
/// </summary>
public class BenefitClaimRequestService : IBenefitClaimRequestService
{
    public const string DocumentTypeCode = "BENEFIT_CLAIM";
    private const long MaxFileBytes = 5 * 1024 * 1024;

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IApprovalWorkflowService _approvalWorkflow;

    public BenefitClaimRequestService(IHrmsDbContext context, ICurrentUserService currentUser, IApprovalWorkflowService approvalWorkflow)
    {
        _context = context;
        _currentUser = currentUser;
        _approvalWorkflow = approvalWorkflow;
    }

    private bool IsAdmin => _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER");

    /// <summary>ฝ่ายบุคคล/ผู้ดูแลสวัสดิการ — พิจารณาคำขอที่ไม่มีสายการอนุมัติ</summary>
    private bool IsHrApprover => IsAdmin
        || _currentUser.HasPermission("ORG_BENEFIT_APPROVE")
        || _currentUser.HasPermission("ORG_BENEFIT_EDIT")
        || _currentUser.HasPermission("APPROVAL_EMP_APPROVE");

    private long RequireMe() => _currentUser.EmployeeId
        ?? throw new ForbiddenException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");

    // ───────────────────────── ยื่นเบิก ─────────────────────────

    public async Task<BenefitClaimRequestDto> SubmitAsync(SubmitBenefitClaimRequest dto, CancellationToken cancellationToken = default)
    {
        var me = RequireMe();

        if (dto.Amount <= 0)
            throw new ValidationException("จำนวนเงินที่ขอเบิกต้องมากกว่า 0 บาท");

        var claimDate = ParseDate(dto.ClaimDate) ?? DateOnly.FromDateTime(DateTime.Now);
        if (claimDate > DateOnly.FromDateTime(DateTime.Now))
            throw new ValidationException("วันที่ใช้สิทธิ์ต้องไม่เป็นวันในอนาคต");

        var item = await _context.BenefitItems.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == dto.BenefitItemId, cancellationToken)
            ?? throw new ValidationException("ไม่พบสวัสดิการที่เลือก");
        if (item.Status != "ACTIVE")
            throw new ValidationException("สวัสดิการนี้ถูกปิดใช้งานแล้ว");
        if (item.Category == "ALLOWANCE" || item.IsStatutory)
            throw new ValidationException($"\"{item.BenefitName}\" จ่ายอัตโนมัติผ่านเงินเดือน/ตามกฎหมาย ไม่ต้องยื่นเบิก");

        var coverage = await GetCoverageAsync(me, item.Id, cancellationToken)
            ?? throw new ValidationException($"ประเภทพนักงานของคุณไม่ได้รับสิทธิ์ \"{item.BenefitName}\"");

        int year = claimDate.Year;
        if (coverage > 0)
        {
            // ยอดที่อนุมัติแล้ว + ที่รออนุมัติ (กันวงเงินไว้แล้ว)
            var reserved = await _context.EmployeeBenefitClaims
                .Where(c => c.EmployeeId == me && c.BenefitItemId == item.Id && c.ClaimYear == year
                            && (c.Status == "APPROVED" || c.Status == "PENDING"))
                .SumAsync(c => c.Amount, cancellationToken);
            var remaining = coverage - reserved;
            if (dto.Amount > remaining)
                throw new ValidationException(
                    $"ยอดขอเบิก ({dto.Amount:N2} บาท) เกินวงเงินคงเหลือ ({Math.Max(0, remaining):N2} บาท จากวงเงิน {coverage:N2} บาท/ปี — รวมรายการที่รออนุมัติแล้ว)");
        }

        var claim = new EmployeeBenefitClaim
        {
            EmployeeId = me,
            BenefitItemId = item.Id,
            ClaimYear = year,
            ClaimDate = claimDate,
            Amount = dto.Amount,
            ReceiptNumber = Trim(dto.ReceiptNumber, 100),
            ServiceProvider = Trim(dto.ServiceProvider, 200),
            Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? null : dto.Remarks.Trim(),
            Status = "PENDING",
            RequestedByEmployeeId = me,
            ApprovedAt = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrWhiteSpace(dto.FileData))
        {
            var (bytes, mime) = FileDataDecoder.Decode(dto.FileData, dto.FileName);
            if (bytes.LongLength > MaxFileBytes)
                throw new ValidationException("ไฟล์ใบเสร็จต้องมีขนาดไม่เกิน 5 MB");
            claim.FileData = bytes;
            claim.FileSize = bytes.LongLength;
            claim.FileMimeType = mime;
            claim.FileName = string.IsNullOrWhiteSpace(dto.FileName) ? "receipt" : Path.GetFileName(dto.FileName.Trim());
        }
        else if (item.IsDocumentRequired)
        {
            throw new ValidationException("สวัสดิการประเภทนี้ บังคับแนบเอกสารประกอบหรือใบรับรองแพทย์");
        }

        _context.EmployeeBenefitClaims.Add(claim);
        await _context.SaveChangesAsync(cancellationToken);

        var th = DateTime.UtcNow.AddHours(7);
        claim.RequestNo = $"BC-{th:yyyyMM}-{claim.Id:D4}";

        try
        {
            var instanceId = await _approvalWorkflow.StartWorkflowAsync(DocumentTypeCode, claim.Id, me, cancellationToken);
            if (instanceId.HasValue) claim.ApprovalInstanceId = instanceId.Value;
        }
        catch
        {
            // ไม่มีสายการอนุมัติที่ตรงเงื่อนไข — รอฝ่ายบุคคลพิจารณา
        }
        await _context.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(claim.Id, cancellationToken);
    }

    // ───────────────────────── รายการสำหรับผู้อนุมัติ ─────────────────────────

    public async Task<List<BenefitClaimRequestDto>> GetForApprovalAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId;
        // เฉพาะคำขอที่พนักงานยื่นเอง (รายการที่ฝ่ายบุคคลบันทึกให้ไม่ต้องอนุมัติ)
        var query = _context.EmployeeBenefitClaims.AsNoTracking().Where(c => c.RequestedByEmployeeId != null);

        if (!IsAdmin)
        {
            if (!me.HasValue) return new List<BenefitClaimRequestDto>();
            var allowed = await _approvalWorkflow.GetInstanceIdsForApproverUserAsync(me.Value, DocumentTypeCode, cancellationToken);
            var hr = IsHrApprover;
            query = query.Where(c =>
                (c.ApprovalInstanceId.HasValue && allowed.Contains(c.ApprovalInstanceId.Value))
                || (hr && !c.ApprovalInstanceId.HasValue));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim().ToUpperInvariant();
            query = query.Where(c => c.Status == s);
        }

        var ids = await query.OrderByDescending(c => c.Id).Select(c => c.Id).Take(500).ToListAsync(cancellationToken);
        return await MapAsync(ids, cancellationToken);
    }

    // ───────────────────────── อนุมัติ / ไม่อนุมัติ / ยกเลิก ─────────────────────────

    public async Task<BenefitClaimRequestDto> ApproveAsync(long id, string? comment, CancellationToken cancellationToken = default)
    {
        var me = RequireMe();
        var claim = await LoadPendingAsync(id, cancellationToken);

        if (claim.ApprovalInstanceId.HasValue)
        {
            // สถานะคำขอถูกอัปเดตใน workflow เมื่ออนุมัติครบทุกขั้น
            await _approvalWorkflow.ProcessActionAsync(claim.ApprovalInstanceId.Value, me, "APPROVE", comment, cancellationToken);
        }
        else
        {
            if (!IsHrApprover) throw new ForbiddenException("คำขอนี้ต้องให้ฝ่ายบุคคลเป็นผู้อนุมัติ");
            if (claim.EmployeeId == me) throw new ForbiddenException("ไม่สามารถอนุมัติคำขอของตัวเองได้");
            claim.Status = "APPROVED";
            claim.ApprovedAt = DateTime.UtcNow;
            claim.ApprovedByEmployeeId = me;
            claim.ApprovedByUserId = _currentUser.UserId;
            claim.CompletedAt = DateTime.UtcNow;
            claim.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task<BenefitClaimRequestDto> RejectAsync(long id, string reason, CancellationToken cancellationToken = default)
    {
        var me = RequireMe();
        if (string.IsNullOrWhiteSpace(reason))
            throw new ValidationException("กรุณาระบุเหตุผลที่ไม่อนุมัติ");

        var claim = await LoadPendingAsync(id, cancellationToken);

        if (claim.ApprovalInstanceId.HasValue)
        {
            await _approvalWorkflow.ProcessActionAsync(claim.ApprovalInstanceId.Value, me, "REJECT", reason.Trim(), cancellationToken);
        }
        else
        {
            if (!IsHrApprover) throw new ForbiddenException("คำขอนี้ต้องให้ฝ่ายบุคคลเป็นผู้พิจารณา");
            if (claim.EmployeeId == me) throw new ForbiddenException("ไม่สามารถพิจารณาคำขอของตัวเองได้");
        }

        claim.Status = "REJECTED";
        claim.RejectReason = reason.Trim();
        claim.CompletedAt ??= DateTime.UtcNow;
        claim.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, cancellationToken);
    }

    public async Task<bool> CancelAsync(long id, CancellationToken cancellationToken = default)
    {
        var claim = await _context.EmployeeBenefitClaims
            .Include(c => c.ApprovalInstance)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("คำขอเบิกสวัสดิการ", id);

        var me = _currentUser.EmployeeId;
        if (claim.EmployeeId != me && !IsHrApprover)
            throw new ForbiddenException("คุณไม่มีสิทธิ์ยกเลิกคำขอนี้");
        if (claim.Status != "PENDING")
            throw new BusinessRuleException("ยกเลิกได้เฉพาะคำขอที่รออนุมัติ");

        claim.Status = "CANCELLED";
        claim.CompletedAt = DateTime.UtcNow;
        claim.UpdatedAt = DateTime.UtcNow;
        if (claim.ApprovalInstance != null && claim.ApprovalInstance.Status == "PENDING")
        {
            claim.ApprovalInstance.Status = "CANCELLED";
            claim.ApprovalInstance.CompletedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<BenefitClaimAttachment> GetAttachmentAsync(long id, CancellationToken cancellationToken = default)
    {
        var claim = await _context.EmployeeBenefitClaims.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("คำขอเบิกสวัสดิการ", id);

        var me = _currentUser.EmployeeId;
        var allowed = claim.EmployeeId == me || IsHrApprover
            || (me.HasValue && claim.ApprovalInstanceId.HasValue
                && await _approvalWorkflow.IsUserInWorkflowAsync(claim.ApprovalInstanceId.Value, me.Value, cancellationToken));
        if (!allowed) throw new ForbiddenException("คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์แนบของคำขอนี้");

        if (claim.FileData == null || claim.FileData.Length == 0)
            throw new NotFoundException("คำขอนี้ไม่มีไฟล์แนบ");

        return new BenefitClaimAttachment
        {
            FileName = claim.FileName ?? "receipt",
            MimeType = claim.FileMimeType ?? "application/octet-stream",
            Data = claim.FileData
        };
    }

    // ───────────────────────── helpers ─────────────────────────

    private async Task<EmployeeBenefitClaim> LoadPendingAsync(long id, CancellationToken cancellationToken)
    {
        var claim = await _context.EmployeeBenefitClaims.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("คำขอเบิกสวัสดิการ", id);
        if (claim.Status != "PENDING")
            throw new BusinessRuleException($"คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ (สถานะปัจจุบัน: {claim.Status})");
        return claim;
    }

    /// <summary>วงเงิน/ปี ของสวัสดิการตามประเภทพนักงานปัจจุบัน — null = ไม่มีสิทธิ์, 0 = ไม่จำกัดวงเงิน</summary>
    private async Task<decimal?> GetCoverageAsync(long employeeId, long benefitItemId, CancellationToken cancellationToken)
    {
        var typeId = await _context.EmployeeAssignments.AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.IsCurrent)
            .OrderByDescending(a => a.EffectiveFrom)
            .Select(a => a.EmployeeTypeId)
            .FirstOrDefaultAsync(cancellationToken);
        if (!typeId.HasValue) return null;

        var tb = await _context.EmployeeTypeBenefits.AsNoTracking()
            .Where(t => t.EmployeeTypeId == typeId.Value && t.BenefitItemId == benefitItemId && t.IsActive)
            .Select(t => (decimal?)t.CoverageAmount)
            .FirstOrDefaultAsync(cancellationToken);
        return tb;
    }

    private async Task<BenefitClaimRequestDto> GetDtoAsync(long id, CancellationToken cancellationToken) =>
        (await MapAsync(new List<long> { id }, cancellationToken)).First();

    private sealed class ClaimRow
    {
        public long Id { get; set; }
        public string? RequestNo { get; set; }
        public long EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public long BenefitItemId { get; set; }
        public string BenefitName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateOnly ClaimDate { get; set; }
        public int ClaimYear { get; set; }
        public decimal Amount { get; set; }
        public string? ReceiptNumber { get; set; }
        public string? ServiceProvider { get; set; }
        public string? Remarks { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public long? ApprovalInstanceId { get; set; }
        public string? ApprovedByEmployeeName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? RejectReason { get; set; }
    }

    private async Task<List<BenefitClaimRequestDto>> MapAsync(List<long> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0) return new List<BenefitClaimRequestDto>();

        // ไม่ดึง file_data มาในรายการ
        var rows = await _context.EmployeeBenefitClaims.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .Select(c => new ClaimRow
            {
                Id = c.Id,
                RequestNo = c.RequestNo,
                EmployeeId = c.EmployeeId,
                EmployeeCode = c.Employee.EmployeeCode,
                EmployeeName = ((c.Employee.Prefix ?? "") + " " + c.Employee.FirstName + " " + c.Employee.LastName).Trim(),
                BenefitItemId = c.BenefitItemId,
                BenefitName = c.BenefitItem.BenefitName,
                Category = c.BenefitItem.Category,
                ClaimDate = c.ClaimDate,
                ClaimYear = c.ClaimYear,
                Amount = c.Amount,
                ReceiptNumber = c.ReceiptNumber,
                ServiceProvider = c.ServiceProvider,
                Remarks = c.Remarks,
                FileName = c.FileName,
                FileSize = c.FileSize,
                Status = c.Status,
                CreatedAt = c.CreatedAt,
                ApprovalInstanceId = c.ApprovalInstanceId,
                ApprovedByEmployeeName = c.ApprovedByEmployee != null
                    ? ((c.ApprovedByEmployee.Prefix ?? "") + " " + c.ApprovedByEmployee.FirstName + " " + c.ApprovedByEmployee.LastName).Trim()
                    : null,
                ApprovedAt = c.ApprovedAt,
                CompletedAt = c.CompletedAt,
                RejectReason = c.RejectReason
            })
            .ToListAsync(cancellationToken);

        var instanceIds = rows.Where(r => r.ApprovalInstanceId.HasValue).Select(r => r.ApprovalInstanceId!.Value).Distinct().ToList();
        var instances = instanceIds.Count == 0
            ? new Dictionary<long, ApprovalInstance>()
            : await _context.ApprovalInstances.AsNoTracking()
                .Include(i => i.ApprovalFlow).ThenInclude(f => f!.Steps).ThenInclude(s => s.ApproverRole)
                .Include(i => i.ApprovalFlow).ThenInclude(f => f!.Steps).ThenInclude(s => s.ApproverEmployee)
                .Include(i => i.Actions).ThenInclude(a => a.ApproverEmployee)
                .Where(i => instanceIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id, cancellationToken);

        var empIds = rows.Select(r => r.EmployeeId).Distinct().ToList();
        var assignments = (await _context.EmployeeAssignments.AsNoTracking()
                .Include(a => a.Department)
                .Include(a => a.Position)
                .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
                .ToListAsync(cancellationToken))
            .GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.EffectiveFrom).First());

        // วงเงินตามประเภทพนักงาน + ยอดอนุมัติแล้วในปี (ช่วยผู้อนุมัติตัดสินใจ)
        var typeIds = assignments.Values.Where(a => a.EmployeeTypeId.HasValue).Select(a => a.EmployeeTypeId!.Value).Distinct().ToList();
        var coverages = await _context.EmployeeTypeBenefits.AsNoTracking()
            .Where(t => typeIds.Contains(t.EmployeeTypeId) && t.IsActive)
            .Select(t => new { t.EmployeeTypeId, t.BenefitItemId, t.CoverageAmount })
            .ToListAsync(cancellationToken);
        var benefitIds = rows.Select(r => r.BenefitItemId).Distinct().ToList();
        var years = rows.Select(r => r.ClaimYear).Distinct().ToList();
        var approved = await _context.EmployeeBenefitClaims.AsNoTracking()
            .Where(c => empIds.Contains(c.EmployeeId) && benefitIds.Contains(c.BenefitItemId)
                        && years.Contains(c.ClaimYear) && c.Status == "APPROVED")
            .Select(c => new { c.Id, c.EmployeeId, c.BenefitItemId, c.ClaimYear, c.Amount })
            .ToListAsync(cancellationToken);

        var me = _currentUser.EmployeeId;
        var isHr = IsHrApprover;
        var byId = new Dictionary<long, BenefitClaimRequestDto>();

        foreach (var r in rows)
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
            ApprovalInstance? instance = null;
            if (r.ApprovalInstanceId.HasValue) instances.TryGetValue(r.ApprovalInstanceId.Value, out instance);

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
                isMyTurn = isHr && r.EmployeeId != me;
            }

            var lastApprove = instance?.Actions.Where(a => a.ActionDecision == "APPROVE").OrderByDescending(a => a.ActionAt).FirstOrDefault();
            var lastReject = instance?.Actions.Where(a => a.ActionDecision == "REJECT").OrderByDescending(a => a.ActionAt).FirstOrDefault();

            var quota = assign?.EmployeeTypeId is long tid
                ? coverages.Where(c => c.EmployeeTypeId == tid && c.BenefitItemId == r.BenefitItemId).Select(c => c.CoverageAmount).FirstOrDefault()
                : 0m;
            var approvedUsed = approved
                .Where(c => c.Id != r.Id && c.EmployeeId == r.EmployeeId && c.BenefitItemId == r.BenefitItemId && c.ClaimYear == r.ClaimYear)
                .Sum(c => c.Amount);

            byId[r.Id] = new BenefitClaimRequestDto
            {
                Id = r.Id,
                RequestNo = string.IsNullOrEmpty(r.RequestNo) ? $"BC-{r.Id:D4}" : r.RequestNo,
                EmployeeId = r.EmployeeId,
                EmployeeCode = r.EmployeeCode,
                EmployeeName = r.EmployeeName,
                DepartmentName = assign?.Department?.DepartmentName ?? "-",
                PositionName = assign?.Position?.PositionName ?? "-",
                BenefitItemId = r.BenefitItemId,
                BenefitName = r.BenefitName,
                Category = r.Category,
                ClaimDate = r.ClaimDate.ToString("yyyy-MM-dd"),
                ClaimYear = r.ClaimYear,
                Amount = r.Amount,
                ReceiptNumber = r.ReceiptNumber,
                ServiceProvider = r.ServiceProvider,
                Remarks = r.Remarks,
                FileName = r.FileName,
                FileSize = r.FileSize,
                QuotaAmount = quota,
                ApprovedUsedAmount = approvedUsed,
                Status = status,
                SubmittedAt = r.CreatedAt,
                ApprovalInstanceId = r.ApprovalInstanceId,
                CurrentStepNo = instance?.CurrentStepNo,
                TotalSteps = instance?.ApprovalFlow?.Steps.Count ?? 0,
                CurrentApproverDisplay = currentApprover,
                IsMyTurnToApprove = isMyTurn,
                HasAlreadyApproved = me.HasValue && instance != null
                    && instance.Actions.Any(a => a.ApproverEmployeeId == me.Value && a.ActionDecision == "APPROVE"),
                ApprovedByName = (status == "REJECTED" ? lastReject?.ApproverEmployee?.FullName : lastApprove?.ApproverEmployee?.FullName)
                                 ?? r.ApprovedByEmployeeName,
                ApprovedAt = r.ApprovedAt ?? r.CompletedAt ?? instance?.CompletedAt,
                RejectReason = r.RejectReason ?? lastReject?.Comment,
                CanCancel = status == "PENDING" && (r.EmployeeId == me || isHr)
            };
        }

        return ids.Where(byId.ContainsKey).Select(i => byId[i]).ToList();
    }

    private static string? Trim(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        return v.Length <= max ? v : v[..max];
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d)
            ? d
            : null;
}
