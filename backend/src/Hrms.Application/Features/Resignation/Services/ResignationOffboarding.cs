using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Resignation.Services;

/// <summary>
/// ขั้นตอนหลังอนุมัติใบลาออก
/// 1) ตอนอนุมัติครบ: กำหนดวันสิ้นสุดสัญญา + บันทึกประวัติสถานะ RESIGNED (ใช้คิดเงินเดือน/เวลาถึงวันทำงานวันสุดท้าย)
/// 2) เมื่อพ้นวันทำงานวันสุดท้าย (งานเบื้องหลัง): ปิดสัญญา, พนักงาน INACTIVE, ระงับบัญชีผู้ใช้
/// 3) เก็บ PDF ใบลาออกเข้าแฟ้มเอกสารพนักงาน + แจ้ง HR/หัวหน้างาน ตอนอนุมัติ และเตือนเคลียร์ก่อนวันสุดท้าย 3 วัน
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

        // เก็บใบลาออกเข้าแฟ้ม + แจ้ง HR/หัวหน้างาน — ผิดพลาดก็ไม่ให้การอนุมัติล้ม
        try { await ArchiveAsync(context, request, cancellationToken); } catch (Exception) { /* ข้ามการเก็บไฟล์ */ }
        try { await NotifyApprovedAsync(context, request, cancellationToken); } catch (Exception) { /* ข้ามการแจ้งเตือน */ }

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

    // ===================== เก็บใบลาออกเข้าแฟ้มเอกสาร =====================

    /// <summary>ตัวสร้าง PDF (ตั้งค่าตอนเริ่มระบบใน Program.cs) — null = ข้ามการเก็บไฟล์</summary>
    public static IResignationPdfRenderer? PdfRenderer { get; set; }

    public const string ResignationDocumentCode = "DOC_RESIGNATION";
    public const string ResignationDocumentName = "ใบลาออก";
    public const string HrNotificationType = "RESIGNATION_HR";
    public const string ClearanceNotificationType = "RESIGNATION_CLEARANCE";
    public const int ClearanceReminderDays = 3;
    private static readonly string[] HrRoleCodes = { "HR", "HR_ADMIN", "HR_MGR" };
    private static readonly System.Globalization.CultureInfo Thai = new("th-TH");

    private static string FileNameOf(ResignationRequest r) => $"ใบลาออก_{r.RequestNo}.pdf";

    /// <summary>สร้าง PDF ใบลาออกแล้วเพิ่มเข้าแฟ้มเอกสารพนักงาน (ยังไม่ SaveChanges)</summary>
    public static async Task ArchiveAsync(IHrmsDbContext context, ResignationRequest request, CancellationToken cancellationToken)
    {
        if (PdfRenderer == null) return;
        var fileName = FileNameOf(request);
        if (await context.EmployeeDocuments.AnyAsync(d => d.EmployeeId == request.EmployeeId && d.FileName == fileName, cancellationToken))
            return;

        var model = await BuildModelAsync(context, request, cancellationToken);
        var bytes = PdfRenderer.Render(model);

        var type = await context.DocumentTypes.FirstOrDefaultAsync(
            d => d.DocumentCode == ResignationDocumentCode || d.DocumentName == ResignationDocumentName, cancellationToken);
        if (type == null)
        {
            type = new DocumentType
            {
                DocumentCode = ResignationDocumentCode,
                DocumentName = ResignationDocumentName,
                IsExpiryRequired = false,
                Status = "ACTIVE",
            };
            context.DocumentTypes.Add(type);
        }

        var doc = new EmployeeDocument
        {
            EmployeeId = request.EmployeeId,
            FileName = fileName,
            FileMimeType = "application/pdf",
            FileSize = bytes.LongLength,
            FileData = bytes,
            IssuedDate = DateOnly.FromDateTime((request.ApprovedAt ?? DateTime.UtcNow).AddHours(7)),
            ExpiryDate = null,
            Remarks = $"จากคำขอลาออก {request.RequestNo} · วันทำงานวันสุดท้าย {request.RequestedLastWorkingDate.ToString("d MMM yyyy", Thai)}",
            UploadedAt = DateTime.UtcNow,
            UploadedByEmployeeId = request.ApprovedByEmployeeId,
        };
        if (type.Id > 0) doc.DocumentTypeId = type.Id;
        else doc.DocumentType = type;
        context.EmployeeDocuments.Add(doc);
    }

    private static async Task<ResignationDocumentModel> BuildModelAsync(IHrmsDbContext context, ResignationRequest request, CancellationToken cancellationToken)
    {
        var employee = await context.Employees.AsNoTracking().FirstAsync(e => e.Id == request.EmployeeId, cancellationToken);
        var assignment = await context.EmployeeAssignments.AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => a.EmployeeId == request.EmployeeId)
            .OrderByDescending(a => a.IsCurrent).ThenByDescending(a => a.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        string? category = null, detail = request.Reason, handover = null, contact = null;
        try
        {
            using var json = System.Text.Json.JsonDocument.Parse(request.Reason ?? "{}");
            string? Get(string n) => json.RootElement.TryGetProperty(n, out var v) && v.ValueKind == System.Text.Json.JsonValueKind.String ? v.GetString() : null;
            category = Get("Category"); detail = Get("Detail"); handover = Get("Handover"); contact = Get("Contact");
        }
        catch (System.Text.Json.JsonException) { /* เหตุผลแบบข้อความธรรมดา */ }

        var actions = new List<ApprovalAction>();
        if (request.ApprovalInstanceId is { } instanceId)
        {
            actions.AddRange(await context.ApprovalActions.AsNoTracking()
                .Where(a => a.ApprovalInstanceId == instanceId).ToListAsync(cancellationToken));
            actions.AddRange(context.ApprovalActions.Local.Where(a => a.ApprovalInstanceId == instanceId && a.Id == 0));
        }
        var approverIds = actions.Where(a => a.ApproverEmployeeId.HasValue).Select(a => a.ApproverEmployeeId!.Value).Distinct().ToList();
        var approvers = await context.Employees.AsNoTracking().Where(e => approverIds.Contains(e.Id)).ToListAsync(cancellationToken);
        var stepIds = actions.Where(a => a.ApprovalStepId.HasValue).Select(a => a.ApprovalStepId!.Value).Distinct().ToList();
        var steps = await context.ApprovalSteps.AsNoTracking().Where(s => stepIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.StepNo, cancellationToken);

        return new ResignationDocumentModel
        {
            RequestNo = request.RequestNo,
            EmployeeCode = employee.EmployeeCode,
            EmployeeName = employee.FullName,
            DepartmentName = assignment?.Department?.DepartmentName,
            PositionName = assignment?.Position?.PositionName,
            SubmittedAt = request.SubmittedAt,
            LastWorkingDate = request.RequestedLastWorkingDate,
            ReasonCategory = category,
            ReasonDetail = detail,
            Handover = handover,
            ContactAfterResignation = contact,
            Approvals = actions.OrderBy(a => a.ActionAt).Select(a => new ResignationApprovalLine
            {
                StepNo = a.ApprovalStepId is { } sid && steps.TryGetValue(sid, out var no) ? no : 0,
                ApproverName = approvers.FirstOrDefault(e => e.Id == a.ApproverEmployeeId)?.FullName ?? "-",
                Decision = a.ActionDecision,
                ActionAt = a.ActionAt,
                Comment = a.Comment,
            }).ToList(),
        };
    }

    // ===================== แจ้งเตือนฝ่ายบุคคล / หัวหน้างาน =====================

    private static async Task<List<long>> GetRecipientUserIdsAsync(IHrmsDbContext context, long employeeId, CancellationToken cancellationToken)
    {
        var managerId = await context.EmployeeAssignments.AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.IsCurrent)
            .Select(a => a.ManagerEmployeeId)
            .FirstOrDefaultAsync(cancellationToken);

        return await context.UserAccounts.AsNoTracking()
            .Where(u => u.Status == "ACTIVE" && u.EmployeeId != employeeId &&
                        (u.UserRoles.Any(ur => HrRoleCodes.Contains(ur.Role.RoleCode)) ||
                         (managerId.HasValue && u.EmployeeId == managerId.Value)))
            .Select(u => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    private static void AddNotifications(IHrmsDbContext context, IEnumerable<long> userIds, string type, string title, string message, long referenceId)
    {
        var now = DateTime.UtcNow;
        foreach (var uid in userIds)
        {
            context.Notifications.Add(new Notification
            {
                UserId = uid,
                NotificationType = type,
                Title = title.Length > 255 ? title[..255] : title,
                Message = message,
                ReferenceType = "RESIGNATION_REQUEST",
                ReferenceId = referenceId,
                IsRead = false,
                CreatedAt = now,
            });
        }
    }

    private static async Task<string> DescribeEmployeeAsync(IHrmsDbContext context, long employeeId, CancellationToken cancellationToken)
    {
        var emp = await context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);
        var dept = await context.EmployeeAssignments.AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.IsCurrent)
            .Select(a => a.Department != null ? a.Department.DepartmentName : null)
            .FirstOrDefaultAsync(cancellationToken);
        if (emp == null) return $"พนักงาน #{employeeId}";
        return dept != null ? $"{emp.FullName} ({emp.EmployeeCode} · {dept})" : $"{emp.FullName} ({emp.EmployeeCode})";
    }

    /// <summary>แจ้ง HR + หัวหน้างาน ตอนอนุมัติลาออกครบ (ยังไม่ SaveChanges)</summary>
    public static async Task NotifyApprovedAsync(IHrmsDbContext context, ResignationRequest request, CancellationToken cancellationToken)
    {
        var recipients = await GetRecipientUserIdsAsync(context, request.EmployeeId, cancellationToken);
        if (recipients.Count == 0) return;
        var who = await DescribeEmployeeAsync(context, request.EmployeeId, cancellationToken);
        AddNotifications(context, recipients, HrNotificationType,
            $"อนุมัติลาออก: {who}",
            $"วันทำงานวันสุดท้าย {request.RequestedLastWorkingDate.ToString("d MMM yyyy", Thai)} · เลขที่ {request.RequestNo} — ระบบจะระงับบัญชีผู้ใช้ให้อัตโนมัติหลังวันดังกล่าว",
            request.Id);
    }

    /// <summary>งานเบื้องหลัง: เตือนเคลียร์ทรัพย์สิน/เงินค้างจ่าย ก่อนวันสุดท้าย 3 วัน (ครั้งเดียวต่อใบลาออก)</summary>
    public static async Task<int> SendClearanceRemindersAsync(IHrmsDbContext context, CancellationToken cancellationToken)
    {
        var today = ThaiToday();
        var until = today.AddDays(ClearanceReminderDays);
        var due = await context.ResignationRequests.AsNoTracking()
            .Where(r => r.Status == "APPROVED" && r.RequestedLastWorkingDate >= today && r.RequestedLastWorkingDate <= until)
            .ToListAsync(cancellationToken);
        if (due.Count == 0) return 0;

        var dueIds = due.Select(r => r.Id).ToList();
        var already = await context.Notifications.AsNoTracking()
            .Where(n => n.NotificationType == ClearanceNotificationType && n.ReferenceId.HasValue && dueIds.Contains(n.ReferenceId.Value))
            .Select(n => n.ReferenceId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        int sent = 0;
        foreach (var r in due.Where(r => !already.Contains(r.Id)))
        {
            var recipients = await GetRecipientUserIdsAsync(context, r.EmployeeId, cancellationToken);
            if (recipients.Count == 0) continue;

            var year = r.RequestedLastWorkingDate.Year;
            var annualLeft = await context.LeaveBalances.AsNoTracking()
                .Where(b => b.EmployeeId == r.EmployeeId && b.Year == year && b.LeaveType != null &&
                            (b.LeaveType.LeaveCode == "ANNUAL" || b.LeaveType.LeaveName.Contains("พักร้อน")))
                .SumAsync(b => (decimal?)b.NetRemainingLeaveDays, cancellationToken) ?? 0m;
            var benefitPending = await context.EmployeeBenefitClaims.AsNoTracking()
                .CountAsync(c => c.EmployeeId == r.EmployeeId &&
                                 (c.Status == "PENDING" || (c.Status == "APPROVED" && c.PaymentStatus == "UNPAID")), cancellationToken);

            var items = new List<string>
            {
                annualLeft > 0 ? $"วันลาพักร้อนคงเหลือ {annualLeft:0.##} วัน (จ่ายแทน/ให้ใช้ก่อนออก)" : "ไม่มีวันลาพักร้อนคงเหลือ",
                benefitPending > 0 ? $"คำขอเบิกสวัสดิการค้าง {benefitPending} รายการ" : "ไม่มีคำขอเบิกสวัสดิการค้าง",
                "คิดเงินเดือนงวดสุดท้ายตามสัดส่วนถึงวันสุดท้าย",
                "รับคืนทรัพย์สิน (บัตรพนักงาน อุปกรณ์ กุญแจ)",
            };
            var who = await DescribeEmployeeAsync(context, r.EmployeeId, cancellationToken);
            var daysLeft = r.RequestedLastWorkingDate.DayNumber - today.DayNumber;
            AddNotifications(context, recipients, ClearanceNotificationType,
                $"เตรียมเคลียร์ก่อนลาออก: {who}",
                $"วันสุดท้าย {r.RequestedLastWorkingDate.ToString("d MMM yyyy", Thai)} (อีก {daysLeft} วัน) — " + string.Join(" · ", items),
                r.Id);
            sent++;
        }
        if (sent > 0) await context.SaveChangesAsync(cancellationToken);
        return sent;
    }
}
