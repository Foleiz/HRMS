using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Approvals.Services;

public class ApprovalWorkflowService : IApprovalWorkflowService
{
    private readonly IHrmsDbContext _context;

    public ApprovalWorkflowService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<long?> StartWorkflowAsync(string documentType, long sourceDocumentId, long requesterEmployeeId, CancellationToken cancellationToken = default)
    {
        // 1. ค้นหาข้อมูลสังกัดของผู้ยื่นเพื่อนำไปจับคู่ ApprovalFlow
        var assignment = await GetAssignmentAsync(requesterEmployeeId, cancellationToken);

        var departmentId = assignment?.DepartmentId;
        var levelId = assignment?.EmployeeLevelId;

        // 2. ดึง Active Flows ทั้งหมดของประเภทเอกสารนี้
        var candidateFlows = await _context.ApprovalFlows
            .AsNoTracking()
            .Include(f => f.Steps)
            .Where(f => f.DocumentType == documentType && f.Status == "ACTIVE")
            .ToListAsync(cancellationToken);

        if (!candidateFlows.Any())
        {
            return null;
        }

        // 3. จัดลำดับความเฉพาะเจาะจง (Specificity Score)
        // Match ทั้ง Department และ Level (Score 3) -> Match Department (Score 2) -> Match Level (Score 1) -> General (Score 0)
        var selectedFlow = candidateFlows
            .Select(f => new
            {
                Flow = f,
                Score = (f.DepartmentId.HasValue && f.DepartmentId == departmentId ? 2 : 0) +
                        (f.LevelId.HasValue && f.LevelId == levelId ? 1 : 0),
                IsMatch = (!f.DepartmentId.HasValue || f.DepartmentId == departmentId) &&
                          (!f.LevelId.HasValue || f.LevelId == levelId)
            })
            .Where(x => x.IsMatch)
            .OrderByDescending(x => x.Score)
            .Select(x => x.Flow)
            .FirstOrDefault();

        if (selectedFlow == null || !selectedFlow.Steps.Any())
        {
            return null;
        }

        // ขั้นแรกที่มีผู้อนุมัติ (ขั้นที่ตั้ง "ข้าม" และหาผู้อนุมัติไม่เจอจะถูกข้าม)
        var firstStep = await FindNextActionableStepAsync(selectedFlow.Steps, int.MinValue, requesterEmployeeId, assignment, cancellationToken)
                        ?? selectedFlow.Steps.OrderBy(s => s.StepNo).First();

        var instance = new ApprovalInstance
        {
            ApprovalFlowId = selectedFlow.Id,
            DocumentType = documentType,
            SourceDocumentId = sourceDocumentId,
            CurrentStepNo = firstStep.StepNo,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow
        };

        _context.ApprovalInstances.Add(instance);
        await _context.SaveChangesAsync(cancellationToken);

        // ซิงค์ ApprovalInstanceId กลับไปยังเอกสารต้นทางเสมอ เพื่อป้องกันข้อมูลตกหล่น
        await SyncSourceDocumentApprovalInstanceIdAsync(documentType, sourceDocumentId, instance.Id, cancellationToken);

        // แจ้งเตือนผู้อนุมัติขั้นตอนแรก
        await NotifyStepApproversAsync(instance, firstStep, requesterEmployeeId, cancellationToken);

        return instance.Id;
    }

    private async Task SyncSourceDocumentApprovalInstanceIdAsync(string documentType, long sourceDocumentId, long instanceId, CancellationToken cancellationToken)
    {
        try
        {
            if (documentType == "LEAVE_REQUEST")
            {
                var doc = await _context.LeaveRequests.FirstOrDefaultAsync(r => r.Id == sourceDocumentId, cancellationToken);
                if (doc != null && doc.ApprovalInstanceId != instanceId)
                {
                    doc.ApprovalInstanceId = instanceId;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            else if (documentType == "CERTIFICATE_REQUEST")
            {
                var doc = await _context.CertificateRequests.FirstOrDefaultAsync(r => r.Id == sourceDocumentId, cancellationToken);
                if (doc != null && doc.ApprovalInstanceId != instanceId)
                {
                    doc.ApprovalInstanceId = instanceId;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            else if (documentType == "RESIGNATION_REQUEST")
            {
                var doc = await _context.ResignationRequests.FirstOrDefaultAsync(r => r.Id == sourceDocumentId, cancellationToken);
                if (doc != null && doc.ApprovalInstanceId != instanceId)
                {
                    doc.ApprovalInstanceId = instanceId;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            else if (documentType == "GENERAL_REQUEST")
            {
                var doc = await _context.GeneralRequests.FirstOrDefaultAsync(r => r.Id == sourceDocumentId, cancellationToken);
                if (doc != null && doc.ApprovalInstanceId != instanceId)
                {
                    doc.ApprovalInstanceId = instanceId;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            else if (documentType == "TRANSFER_REQUEST")
            {
                var doc = await _context.EmployeeTransferRequests.FirstOrDefaultAsync(r => r.Id == sourceDocumentId, cancellationToken);
                if (doc != null && doc.ApprovalInstanceId != instanceId)
                {
                    doc.ApprovalInstanceId = instanceId;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            else if (documentType == "BENEFIT_CLAIM")
            {
                var doc = await _context.EmployeeBenefitClaims.FirstOrDefaultAsync(r => r.Id == sourceDocumentId, cancellationToken);
                if (doc != null && doc.ApprovalInstanceId != instanceId)
                {
                    doc.ApprovalInstanceId = instanceId;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
        }
        catch
        {
            // การซิงค์สำรองไม่ควรทำให้ workflow ล้มเหลว
        }
    }

    /// <summary>หา Employee ID ของผู้ยื่นเอกสารต้นทางของ workflow</summary>
    private async Task<long?> GetRequesterEmployeeIdAsync(ApprovalInstance instance, CancellationToken cancellationToken)
    {
        long? requesterId = null;
        if (instance.DocumentType == "LEAVE_REQUEST")
        {
            var leaveReq = await _context.LeaveRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);
            requesterId = leaveReq?.EmployeeId;
        }
        else if (instance.DocumentType == "CERTIFICATE_REQUEST")
        {
            var certReq = await _context.CertificateRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);
            requesterId = certReq?.EmployeeId;
        }
        else if (instance.DocumentType == "RESIGNATION_REQUEST")
        {
            var resignReq = await _context.ResignationRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);
            requesterId = resignReq?.EmployeeId;
        }
        else if (instance.DocumentType == "TRANSFER_REQUEST")
        {
            var transferReq = await _context.EmployeeTransferRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);
            requesterId = transferReq?.EmployeeId;
        }
        else if (instance.DocumentType == "GENERAL_REQUEST")
        {
            var generalReq = await _context.GeneralRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);
            requesterId = generalReq?.EmployeeId;
        }
        else if (instance.DocumentType == "BENEFIT_CLAIM")
        {
            requesterId = await _context.EmployeeBenefitClaims
                .AsNoTracking()
                .Where(c => c.Id == instance.SourceDocumentId)
                .Select(c => (long?)c.EmployeeId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return requesterId;
    }

    // ===================== การหาผู้อนุมัติ (ใช้ร่วมกันทุกจุด) =====================
    // ผู้อนุมัติของแต่ละขั้นคำนวณจาก "ผู้ยื่น" ทุกครั้ง → สายเดียวใช้ได้ทุกแผนก
    // กฎร่วม: ตัดผู้ยื่นออก (ห้ามอนุมัติของตัวเอง), ตัดคนที่ไม่มีบัญชีผู้ใช้ออก, ถ้าไม่เหลือใครใช้ทางสำรองของขั้น

    private static readonly string[] HrRoleCodes = { "HR_MGR", "HR_ADMIN", "HR" };
    private static readonly string[] CeoRoleCodes = { "CEO", "EXECUTIVE" };

    /// <summary>ผู้อนุมัติ (Employee Id) ของขั้นนี้สำหรับผู้ยื่นคนนี้ — หลังใช้ทางสำรองแล้ว (ว่าง = ไม่มีใคร / ข้ามขั้น)</summary>
    private async Task<HashSet<long>> ResolveApproverEmployeeIdsAsync(
        ApprovalStep step,
        bool isLastStep,
        long? requesterEmployeeId,
        EmployeeAssignment? requesterAssignment,
        CancellationToken cancellationToken)
    {
        var scope = step.ApproverType == "ROLE" ? (step.ApproverScope ?? "ORG") : "ORG";
        var set = await ResolveCleanAsync(step.ApproverType, step.ApproverEmployeeId, step.ApproverRoleId, scope, requesterEmployeeId, requesterAssignment, cancellationToken);

        // ผู้อนุมัติแทน: ALWAYS = อนุมัติได้คู่กับผู้อนุมัติหลักตลอด
        //               WHEN_ABSENT = เมื่อผู้อนุมัติหลักทุกคนลา (อนุมัติแล้ว) ในวันนี้ หรือหาผู้อนุมัติหลักไม่เจอ
        if (!string.IsNullOrWhiteSpace(step.DelegateType))
        {
            var delegates = await ResolveCleanAsync(
                step.DelegateType!, step.DelegateEmployeeId, step.DelegateRoleId,
                step.DelegateType == "ROLE" ? (step.DelegateScope ?? "ORG") : "ORG",
                requesterEmployeeId, requesterAssignment, cancellationToken);

            if (delegates.Count > 0)
            {
                var always = string.Equals(step.DelegateMode, "ALWAYS", StringComparison.OrdinalIgnoreCase);
                if (always || set.Count == 0 || await AreAllOnLeaveTodayAsync(set, cancellationToken))
                {
                    set.UnionWith(delegates); // ผู้อนุมัติหลักยังกดได้ (เช่น กลับมาทำงานก่อน)
                    return set;
                }
            }
        }

        if (set.Count > 0) return set;

        var fallback = (step.FallbackAction ?? "HR").ToUpperInvariant();
        // ขั้นสุดท้ายห้ามข้าม (กันคำขอผ่านโดยไม่มีใครพิจารณา) → ส่งให้ฝ่ายบุคคลแทน
        if (fallback == "SKIP" && isLastStep) fallback = "HR";

        if (fallback == "ESCALATE")
        {
            foreach (var (type, nextScope) in EscalationChain(step.ApproverType, scope))
            {
                set = await ResolveCleanAsync(type, step.ApproverEmployeeId, step.ApproverRoleId, nextScope, requesterEmployeeId, requesterAssignment, cancellationToken);
                if (set.Count > 0) return set;
            }
            fallback = "HR";
        }

        if (fallback == "HR" && step.ApproverType != "HR")
        {
            return await ResolveCleanAsync("HR", null, null, "ORG", requesterEmployeeId, requesterAssignment, cancellationToken);
        }

        return set; // SKIP / WAIT → ว่าง
    }

    /// <summary>ผู้อนุมัติทุกคนในชุดนี้มีใบลาที่อนุมัติแล้วครอบคลุมวันนี้ (เวลาไทย)</summary>
    private async Task<bool> AreAllOnLeaveTodayAsync(HashSet<long> employeeIds, CancellationToken cancellationToken)
    {
        if (employeeIds.Count == 0) return false;
        var thaiToday = DateTime.UtcNow.AddHours(7).Date;
        var dayStartUtc = DateTime.SpecifyKind(thaiToday.AddHours(-7), DateTimeKind.Utc);
        var dayEndUtc = dayStartUtc.AddDays(1);
        var ids = employeeIds.ToList();

        var onLeave = await _context.LeaveRequests.AsNoTracking()
            .Where(r => r.Status == "APPROVED" && ids.Contains(r.EmployeeId)
                        && r.StartDatetime < dayEndUtc && r.EndDatetime >= dayStartUtc)
            .Select(r => r.EmployeeId)
            .Distinct()
            .CountAsync(cancellationToken);
        return onLeave >= ids.Count;
    }

    /// <summary>ขยายขึ้นหนึ่งระดับตามลำดับ (ขั้นสุดท้ายคือฝ่ายบุคคล)</summary>
    private static IEnumerable<(string Type, string Scope)> EscalationChain(string approverType, string scope)
    {
        switch (approverType)
        {
            case "ROLE":
                if (scope == "DEPARTMENT") yield return ("ROLE", "DIVISION");
                if (scope is "DEPARTMENT" or "DIVISION") yield return ("ROLE", "ORG");
                break;
            case "MANAGER":
                yield return ("DEPARTMENT_HEAD", "ORG");
                yield return ("DIVISION_HEAD", "ORG");
                break;
            case "DEPARTMENT_HEAD":
                yield return ("DIVISION_HEAD", "ORG");
                break;
            case "DIVISION_HEAD":
                yield return ("CEO", "ORG");
                break;
        }
    }

    private async Task<HashSet<long>> ResolveCleanAsync(
        string approverType,
        long? approverEmployeeId,
        long? approverRoleId,
        string scope,
        long? requesterEmployeeId,
        EmployeeAssignment? requesterAssignment,
        CancellationToken cancellationToken)
    {
        var ids = await ResolveBaseAsync(approverType, approverEmployeeId, approverRoleId, scope, requesterAssignment, cancellationToken);
        if (requesterEmployeeId.HasValue) ids.Remove(requesterEmployeeId.Value);
        if (ids.Count == 0) return ids;

        // ต้องมีบัญชีผู้ใช้ที่ใช้งานอยู่ ถึงจะกดอนุมัติได้
        var idList = ids.ToList();
        var withAccount = await _context.UserAccounts.AsNoTracking()
            .Where(u => u.Status == "ACTIVE" && idList.Contains(u.EmployeeId))
            .Select(u => u.EmployeeId)
            .Distinct()
            .ToListAsync(cancellationToken);
        return withAccount.ToHashSet();
    }

    private async Task<HashSet<long>> ResolveBaseAsync(
        string approverType,
        long? approverEmployeeId,
        long? approverRoleId,
        string scope,
        EmployeeAssignment? requesterAssignment,
        CancellationToken cancellationToken)
    {
        var activeUsers = _context.UserAccounts.AsNoTracking().Where(u => u.Status == "ACTIVE");

        switch (approverType)
        {
            case "EMPLOYEE":
                return approverEmployeeId.HasValue ? new HashSet<long> { approverEmployeeId.Value } : new HashSet<long>();

            case "ROLE":
            {
                if (!approverRoleId.HasValue) return new HashSet<long>();
                var holders = await activeUsers
                    .Where(u => u.UserRoles.Any(ur => ur.RoleId == approverRoleId.Value))
                    .Select(u => u.EmployeeId)
                    .Distinct()
                    .ToListAsync(cancellationToken);
                return await FilterByScopeAsync(holders, scope, requesterAssignment, cancellationToken);
            }

            case "MANAGER":
                return requesterAssignment?.ManagerEmployeeId is { } managerId
                    ? new HashSet<long> { managerId }
                    : new HashSet<long>();

            case "DEPARTMENT_HEAD":
            {
                if (requesterAssignment == null) return new HashSet<long>();
                var result = new HashSet<long>();
                var headId = await _context.Departments.AsNoTracking()
                    .Where(d => d.Id == requesterAssignment.DepartmentId)
                    .Select(d => d.HeadEmployeeId)
                    .FirstOrDefaultAsync(cancellationToken);
                if (headId.HasValue) result.Add(headId.Value);
                // ผู้มีบทบาทผู้จัดการแผนก (DEPT_MGR) ในแผนกเดียวกัน
                var managers = await activeUsers
                    .Where(u => u.UserRoles.Any(ur => ur.Role.RoleCode == "DEPT_MGR"))
                    .Select(u => u.EmployeeId)
                    .ToListAsync(cancellationToken);
                result.UnionWith(await FilterByScopeAsync(managers, "DEPARTMENT", requesterAssignment, cancellationToken));
                return result;
            }

            case "DIVISION_HEAD":
            {
                if (requesterAssignment == null) return new HashSet<long>();
                var result = new HashSet<long>();
                var headId = await _context.Divisions.AsNoTracking()
                    .Where(d => d.Id == requesterAssignment.DivisionId)
                    .Select(d => d.HeadEmployeeId)
                    .FirstOrDefaultAsync(cancellationToken);
                if (headId.HasValue) result.Add(headId.Value);
                var managers = await activeUsers
                    .Where(u => u.UserRoles.Any(ur => ur.Role.RoleCode == "DIV_MGR"))
                    .Select(u => u.EmployeeId)
                    .ToListAsync(cancellationToken);
                result.UnionWith(await FilterByScopeAsync(managers, "DIVISION", requesterAssignment, cancellationToken));
                return result;
            }

            case "HR":
                return (await activeUsers
                    .Where(u => u.UserRoles.Any(ur => HrRoleCodes.Contains(ur.Role.RoleCode)))
                    .Select(u => u.EmployeeId)
                    .ToListAsync(cancellationToken)).ToHashSet();

            case "CEO":
                return (await activeUsers
                    .Where(u => u.UserRoles.Any(ur => CeoRoleCodes.Contains(ur.Role.RoleCode)))
                    .Select(u => u.EmployeeId)
                    .ToListAsync(cancellationToken)).ToHashSet();

            default:
                return new HashSet<long>();
        }
    }

    /// <summary>กรองพนักงานให้อยู่ในหน่วยงานเดียวกับผู้ยื่นตามขอบเขต (ORG = ไม่กรอง)</summary>
    private async Task<HashSet<long>> FilterByScopeAsync(
        List<long> employeeIds,
        string scope,
        EmployeeAssignment? requesterAssignment,
        CancellationToken cancellationToken)
    {
        if (employeeIds.Count == 0) return new HashSet<long>();
        if (scope == "ORG") return employeeIds.ToHashSet();
        if (requesterAssignment == null) return new HashSet<long>();

        var query = _context.EmployeeAssignments.AsNoTracking()
            .Where(a => a.IsCurrent && employeeIds.Contains(a.EmployeeId));
        query = scope == "DEPARTMENT"
            ? query.Where(a => a.DepartmentId == requesterAssignment.DepartmentId)
            : query.Where(a => a.DivisionId == requesterAssignment.DivisionId);

        return (await query.Select(a => a.EmployeeId).Distinct().ToListAsync(cancellationToken)).ToHashSet();
    }

    /// <summary>
    /// ขั้นแรกที่มีผู้อนุมัติ เริ่มจาก fromStepNo — ขั้นที่ตั้ง "ข้าม" และหาผู้อนุมัติไม่เจอจะถูกข้ามไป
    /// (ขั้นสุดท้ายไม่ถูกข้าม) คืน null เมื่อไม่มีขั้นเหลือ
    /// </summary>
    private async Task<ApprovalStep?> FindNextActionableStepAsync(
        IEnumerable<ApprovalStep> steps,
        int fromStepNo,
        long? requesterEmployeeId,
        EmployeeAssignment? requesterAssignment,
        CancellationToken cancellationToken)
    {
        var all = steps.OrderBy(s => s.StepNo).ToList();
        var lastStepNo = all.Count > 0 ? all[^1].StepNo : 0;
        foreach (var step in all.Where(s => s.StepNo >= fromStepNo))
        {
            var isLast = step.StepNo == lastStepNo;
            if (!isLast && string.Equals(step.FallbackAction, "SKIP", StringComparison.OrdinalIgnoreCase))
            {
                var approvers = await ResolveApproverEmployeeIdsAsync(step, isLast, requesterEmployeeId, requesterAssignment, cancellationToken);
                if (approvers.Count == 0) continue;
            }
            return step;
        }
        return null;
    }

    private async Task<int> GetLastStepNoAsync(long flowId, CancellationToken cancellationToken) =>
        await _context.ApprovalSteps.AsNoTracking()
            .Where(s => s.FlowId == flowId)
            .Select(s => (int?)s.StepNo)
            .MaxAsync(cancellationToken) ?? 0;

    private async Task<EmployeeAssignment?> GetAssignmentAsync(long? employeeId, CancellationToken cancellationToken) =>
        employeeId.HasValue
            ? await _context.EmployeeAssignments.AsNoTracking()
                .Where(a => a.EmployeeId == employeeId.Value && a.IsCurrent)
                .OrderByDescending(a => a.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

    private async Task<bool> IsUserEligibleForStepAsync(
        ApprovalStep step,
        bool isLastStep,
        long employeeId,
        long? requesterEmployeeId,
        EmployeeAssignment? requesterAssignment,
        CancellationToken cancellationToken)
    {
        if (requesterEmployeeId == employeeId) return false; // ห้ามอนุมัติคำขอของตัวเอง
        var approvers = await ResolveApproverEmployeeIdsAsync(step, isLastStep, requesterEmployeeId, requesterAssignment, cancellationToken);
        return approvers.Contains(employeeId);
    }

    public async Task<bool> CanUserApproveStepAsync(long instanceId, long employeeId, CancellationToken cancellationToken = default)
    {
        var instance = await _context.ApprovalInstances
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken);

        if (instance == null || instance.Status != "PENDING" || !instance.CurrentStepNo.HasValue)
        {
            return false;
        }

        // 0. ห้ามอนุมัติคำขอของตัวเอง (รวมถึงผู้ดูแลระบบ)
        var requesterEmployeeId = await GetRequesterEmployeeIdAsync(instance, cancellationToken);
        if (requesterEmployeeId == employeeId)
        {
            return false;
        }

        // 1. ตรวจสอบว่าพนักงานคนนี้มีบทบาท ADMIN หรือไม่ (SuperAdmin อนุมัติแทนได้ทุกขั้นตอน)
        var userAccount = await _context.UserAccounts
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.EmployeeId == employeeId && u.Status == "ACTIVE", cancellationToken);

        if (userAccount != null && userAccount.UserRoles.Any(ur => ur.Role.RoleCode == "ADMIN" || ur.RoleId == 1))
        {
            return true;
        }

        // 2. ดึงข้อมูลขั้นตอนปัจจุบัน
        var step = await _context.ApprovalSteps
            .AsNoTracking()
            .Include(s => s.ApproverRole)
            .FirstOrDefaultAsync(s => s.FlowId == instance.ApprovalFlowId && s.StepNo == instance.CurrentStepNo.Value, cancellationToken);

        if (step == null)
        {
            return false;
        }

        // 3. หาผู้อนุมัติของขั้นนี้จากสังกัดของผู้ยื่น
        var requesterAssignment = await GetAssignmentAsync(requesterEmployeeId, cancellationToken);
        var isLast = step.StepNo >= await GetLastStepNoAsync(instance.ApprovalFlowId, cancellationToken);

        return await IsUserEligibleForStepAsync(step, isLast, employeeId, requesterEmployeeId, requesterAssignment, cancellationToken);
    }

    public async Task<WorkflowActionResult> ProcessActionAsync(
        long instanceId,
        long approverEmployeeId,
        string actionDecision,
        string? comment = null,
        CancellationToken cancellationToken = default)
    {
        var instance = await _context.ApprovalInstances
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken);

        if (instance == null)
        {
            throw new KeyNotFoundException($"ไม่พบรายการคำขออนุมัติรหัส ID {instanceId}");
        }

        if (instance.Status != "PENDING")
        {
            throw new InvalidOperationException($"คำขออนุมัตินี้ไม่ได้อยู่ในสถานะรอดำเนินการ (สถานะปัจจุบัน: {instance.Status})");
        }

        var hasPermission = await CanUserApproveStepAsync(instanceId, approverEmployeeId, cancellationToken);
        if (!hasPermission)
        {
            throw new UnauthorizedAccessException("คุณไม่มีสิทธิ์ดำเนินการในขั้นตอนการอนุมัตินี้");
        }

        var currentStep = instance.ApprovalFlow.Steps.FirstOrDefault(s => s.StepNo == instance.CurrentStepNo);

        // 1. บันทึก ApprovalAction
        var action = new ApprovalAction
        {
            ApprovalInstanceId = instance.Id,
            ApprovalStepId = currentStep?.Id,
            ApproverEmployeeId = approverEmployeeId,
            ActionDecision = actionDecision,
            Comment = comment,
            ActionAt = DateTime.UtcNow
        };

        _context.ApprovalActions.Add(action);

        // 2. ประมวลผลสถานะ Workflow
        if (actionDecision == "REJECT")
        {
            instance.Status = "REJECTED";
            instance.CompletedAt = DateTime.UtcNow;
            await SyncSourceDocumentStatusAsync(instance, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // แจ้งผู้ยื่นว่าคำขอไม่ได้รับการอนุมัติ
            await NotifyRequesterResultAsync(instance, approved: false, comment, cancellationToken);

            return new WorkflowActionResult
            {
                Success = true,
                Status = "REJECTED",
                CurrentStepNo = instance.CurrentStepNo,
                IsCompleted = true,
                Message = "ปฏิเสธคำขอเรียบร้อยแล้ว"
            };
        }

        if (actionDecision == "CANCEL")
        {
            instance.Status = "CANCELLED";
            instance.CompletedAt = DateTime.UtcNow;
            await SyncSourceDocumentStatusAsync(instance, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return new WorkflowActionResult
            {
                Success = true,
                Status = "CANCELLED",
                CurrentStepNo = instance.CurrentStepNo,
                IsCompleted = true,
                Message = "ยกเลิกคำขอเรียบร้อยแล้ว"
            };
        }

        // กรณี APPROVE: ตรวจสอบว่ามีขั้นตอนถัดไปหรือไม่
        var requesterId = await GetRequesterEmployeeIdAsync(instance, cancellationToken);
        var nextStep = await FindNextActionableStepAsync(
            instance.ApprovalFlow.Steps,
            (instance.CurrentStepNo ?? 0) + 1,
            requesterId,
            await GetAssignmentAsync(requesterId, cancellationToken),
            cancellationToken);

        if (nextStep != null)
        {
            // เลื่อนสู่ขั้นตอนถัดไป
            instance.CurrentStepNo = nextStep.StepNo;
            await _context.SaveChangesAsync(cancellationToken);

            // แจ้งผู้อนุมัติขั้นตอนถัดไป
            await NotifyStepApproversAsync(instance, nextStep, null, cancellationToken);

            return new WorkflowActionResult
            {
                Success = true,
                Status = "PENDING",
                CurrentStepNo = nextStep.StepNo,
                IsCompleted = false,
                Message = $"อนุมัติขั้นตอนที่ {currentStep?.StepNo} เรียบร้อยแล้ว (ส่งต่อขั้นตอนที่ {nextStep.StepNo})"
            };
        }

        // ขั้นตอนสุดท้ายสมบูรณ์แล้ว -> เปลี่ยนสถานะเป็น APPROVED
        instance.Status = "APPROVED";
        instance.CompletedAt = DateTime.UtcNow;
        await SyncSourceDocumentStatusAsync(instance, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // แจ้งผู้ยื่นว่าคำขอได้รับการอนุมัติครบทุกขั้นตอนแล้ว
        await NotifyRequesterResultAsync(instance, approved: true, comment, cancellationToken);

        return new WorkflowActionResult
        {
            Success = true,
            Status = "APPROVED",
            CurrentStepNo = instance.CurrentStepNo,
            IsCompleted = true,
            Message = "อนุมัติคำขอครบถ้วนทุกขั้นตอนเรียบร้อยแล้ว"
        };
    }

    public async Task<ApprovalTimelineDto?> GetTimelineAsync(long instanceId, CancellationToken cancellationToken = default)
    {
        var instance = await _context.ApprovalInstances
            .AsNoTracking()
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(i => i.Actions).ThenInclude(a => a.ApproverEmployee)
                .ThenInclude(e => e!.Assignments.Where(x => x.IsCurrent)).ThenInclude(x => x.Position)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken);

        if (instance == null || instance.ApprovalFlow == null)
        {
            return null;
        }

        return BuildTimelineDto(instance);
    }

    public async Task<ApprovalTimelineDto?> GetTimelineByDocumentAsync(string documentType, long sourceDocumentId, CancellationToken cancellationToken = default)
    {
        var instance = await _context.ApprovalInstances
            .AsNoTracking()
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(i => i.Actions).ThenInclude(a => a.ApproverEmployee)
                .ThenInclude(e => e!.Assignments.Where(x => x.IsCurrent)).ThenInclude(x => x.Position)
            .OrderByDescending(i => i.Id)
            .FirstOrDefaultAsync(i => i.DocumentType == documentType && i.SourceDocumentId == sourceDocumentId, cancellationToken);

        if (instance == null || instance.ApprovalFlow == null)
        {
            return null;
        }

        return BuildTimelineDto(instance);
    }

    public async Task<List<long>> GetPendingInstanceIdsForUserAsync(long employeeId, string? documentType = null, CancellationToken cancellationToken = default)
    {
        var query = _context.ApprovalInstances
            .AsNoTracking()
            .Where(i => i.Status == "PENDING");

        if (!string.IsNullOrWhiteSpace(documentType))
        {
            query = query.Where(i => i.DocumentType == documentType);
        }

        var instances = await query.ToListAsync(cancellationToken);
        var result = new List<long>();

        foreach (var inst in instances)
        {
            if (await CanUserApproveStepAsync(inst.Id, employeeId, cancellationToken))
            {
                result.Add(inst.Id);
            }
        }

        return result;
    }

    public async Task<bool> IsUserInWorkflowAsync(long instanceId, long employeeId, CancellationToken cancellationToken = default)
    {
        var instance = await _context.ApprovalInstances
            .AsNoTracking()
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(i => i.ApprovalFlow).ThenInclude(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(i => i.Actions)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken);

        if (instance == null || instance.ApprovalFlow == null)
        {
            return false;
        }

        // 1. ตรวจสอบว่าพนักงานคนนี้มีบทบาท ADMIN หรือไม่
        var userAccount = await _context.UserAccounts
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.EmployeeId == employeeId && u.Status == "ACTIVE", cancellationToken);

        if (userAccount != null && userAccount.UserRoles.Any(ur => ur.Role.RoleCode == "ADMIN" || ur.RoleId == 1))
        {
            return true;
        }

        // 2. ถ้าผู้ใช้คนนี้เคยดำเนินการ (Actioned) ในคำขอนี้แล้ว ถือว่าอยู่ในสายอนุมัตินี้
        if (instance.Actions.Any(a => a.ApproverEmployeeId == employeeId))
        {
            return true;
        }

        // 3. ดึงข้อมูลสังกัดของผู้ยื่นคำขอ
        var requesterEmployeeId = await GetRequesterEmployeeIdAsync(instance, cancellationToken);
        var requesterAssignment = await GetAssignmentAsync(requesterEmployeeId, cancellationToken);
        var lastStepNo = instance.ApprovalFlow.Steps.Count > 0 ? instance.ApprovalFlow.Steps.Max(s => s.StepNo) : 0;

        // 4. ตรวจสอบว่าผู้ใช้นี้เป็นผู้อนุมัติของขั้นตอนใดขั้นตอนหนึ่งหรือไม่
        foreach (var step in instance.ApprovalFlow.Steps)
        {
            if (await IsUserEligibleForStepAsync(step, step.StepNo == lastStepNo, employeeId, requesterEmployeeId, requesterAssignment, cancellationToken))
            {
                return true;
            }
        }

        return false;
    }

    public async Task<List<long>> GetInstanceIdsForApproverUserAsync(long employeeId, string? documentType = null, CancellationToken cancellationToken = default)
    {
        var userAccount = await _context.UserAccounts
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.EmployeeId == employeeId && u.Status == "ACTIVE", cancellationToken);

        var isAdmin = userAccount != null && userAccount.UserRoles.Any(ur => ur.Role.RoleCode == "ADMIN" || ur.RoleId == 1);

        var query = _context.ApprovalInstances
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(documentType))
        {
            query = query.Where(i => i.DocumentType == documentType);
        }

        var instanceIds = await query
            .Select(i => i.Id)
            .ToListAsync(cancellationToken);

        if (isAdmin)
        {
            return instanceIds;
        }

        var allowed = new List<long>();
        foreach (var id in instanceIds)
        {
            if (await IsUserInWorkflowAsync(id, employeeId, cancellationToken))
            {
                allowed.Add(id);
            }
        }

        return allowed;
    }

    private static ApprovalTimelineDto BuildTimelineDto(ApprovalInstance instance)
    {
        var steps = instance.ApprovalFlow.Steps
            .OrderBy(s => s.StepNo)
            .ToList();

        var timelineSteps = new List<ApprovalTimelineStepDto>();

        foreach (var step in steps)
        {
            // หา action ที่ตรงกับขั้นตอนนี้โดยตรงตาม ApprovalStepId
            var action = instance.Actions
                .Where(a => a.ApprovalStepId == step.Id)
                .OrderByDescending(a => a.ActionAt)
                .FirstOrDefault();

            string status;
            if (action != null)
            {
                status = action.ActionDecision switch
                {
                    "APPROVE" => "COMPLETED",
                    "REJECT" => "REJECTED",
                    "CANCEL" => "CANCELLED",
                    _ => "COMPLETED"
                };
            }
            else if (instance.Status == "PENDING" && step.StepNo == instance.CurrentStepNo)
            {
                status = "WAITING";
            }
            else if (string.Equals(step.FallbackAction, "SKIP", StringComparison.OrdinalIgnoreCase)
                     && (instance.Status == "APPROVED" || (instance.CurrentStepNo.HasValue && step.StepNo < instance.CurrentStepNo.Value)))
            {
                // ขั้นที่ตั้ง "ข้าม" และผ่านไปโดยไม่มีผู้อนุมัติ
                status = "SKIPPED";
            }
            else if (instance.Status == "APPROVED" || (instance.CurrentStepNo.HasValue && step.StepNo < instance.CurrentStepNo.Value))
            {
                status = "COMPLETED";
            }
            else
            {
                status = "PENDING_FUTURE";
            }

            var title = step.ApproverType switch
            {
                "ROLE" => (step.ApproverRole?.RoleName ?? "บทบาทตามระบบ") + step.ApproverScope switch
                {
                    "DEPARTMENT" => " (แผนกเดียวกับผู้ยื่น)",
                    "DIVISION" => " (ฝ่ายเดียวกับผู้ยื่น)",
                    _ => ""
                },
                "EMPLOYEE" => step.ApproverEmployee?.FullName ?? "พนักงานระบุตัวบุคคล",
                "MANAGER" => "หัวหน้างานโดยตรงของผู้ยื่น",
                "DEPARTMENT_HEAD" => "หัวหน้าแผนกของผู้ยื่น",
                "DIVISION_HEAD" => "หัวหน้าฝ่ายของผู้ยื่น",
                "HR" => "ฝ่ายทรัพยากรบุคคล (HR)",
                "CEO" => "ประธานเจ้าหน้าที่บริหาร (CEO)",
                _ => step.ApproverType
            };

            timelineSteps.Add(new ApprovalTimelineStepDto
            {
                StepNo = step.StepNo,
                ApproverTitle = title,
                ApproverType = step.ApproverType,
                DesignatedApproverName = step.ApproverEmployee?.FullName,
                Status = status,
                ActionByEmployeeId = action?.ApproverEmployeeId,
                ActionByEmployeeName = action?.ApproverEmployee?.FullName,
                ActionByPositionName = action?.ApproverEmployee?.Assignments
                    .Where(x => x.IsCurrent)
                    .Select(x => x.Position?.PositionName)
                    .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
                ActionDecision = action?.ActionDecision,
                ActionAt = action?.ActionAt,
                Comment = action?.Comment
            });
        }

        return new ApprovalTimelineDto
        {
            InstanceId = instance.Id,
            FlowId = instance.ApprovalFlowId,
            FlowName = instance.ApprovalFlow.FlowName,
            FlowCode = instance.ApprovalFlow.FlowCode,
            DocumentType = instance.DocumentType,
            SourceDocumentId = instance.SourceDocumentId,
            CurrentStepNo = instance.CurrentStepNo,
            TotalSteps = steps.Count,
            Status = instance.Status,
            CreatedAt = instance.CreatedAt,
            CompletedAt = instance.CompletedAt,
            Steps = timelineSteps
        };
    }

    private async Task SyncSourceDocumentStatusAsync(ApprovalInstance instance, CancellationToken cancellationToken)
    {
        if (instance.DocumentType == "CERTIFICATE_REQUEST")
        {
            var cert = await _context.CertificateRequests
                .FirstOrDefaultAsync(c => c.Id == instance.SourceDocumentId, cancellationToken);

            if (cert != null)
            {
                cert.Status = instance.Status;
                if (instance.Status == "APPROVED")
                {
                    cert.IssuedAt = DateTime.UtcNow;
                }
            }
        }
        else if (instance.DocumentType == "RESIGNATION_REQUEST")
        {
            var resign = await _context.ResignationRequests
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);

            if (resign != null)
            {
                resign.Status = instance.Status;
                if (instance.Status == "APPROVED")
                {
                    resign.ApprovedAt = DateTime.UtcNow;
                    var lastAction = instance.Actions
                        .OrderByDescending(a => a.ActionAt)
                        .FirstOrDefault();
                    if (lastAction != null)
                    {
                        resign.ApprovedByEmployeeId = lastAction.ApproverEmployeeId;
                    }
                }
                else if (instance.Status == "CANCELLED")
                {
                    resign.CancelledAt ??= DateTime.UtcNow;
                }
            }
        }
        else if (instance.DocumentType == "GENERAL_REQUEST")
        {
            var general = await _context.GeneralRequests
                .FirstOrDefaultAsync(g => g.Id == instance.SourceDocumentId, cancellationToken);

            if (general != null)
            {
                general.Status = instance.Status;
                general.CompletedAt ??= DateTime.UtcNow;

                // อนุมัติครบแล้ว → เก็บไฟล์เข้าแฟ้มเอกสารพนักงาน
                if (instance.Status == "APPROVED")
                {
                    // action ล่าสุดเพิ่งถูก Add (ยังไม่ SaveChanges) — หาใน Local ก่อน
                    var lastApprover = _context.ApprovalActions.Local
                        .Concat(instance.Actions)
                        .Where(a => a.ApprovalInstanceId == instance.Id && a.ActionDecision == "APPROVE")
                        .OrderByDescending(a => a.ActionAt)
                        .FirstOrDefault()?.ApproverEmployeeId;
                    await Hrms.Application.Features.EmployeeDocuments.Services.EmployeeDocumentArchiver
                        .ArchiveGeneralRequestAsync(_context, general, lastApprover, cancellationToken);
                }
            }
        }
        else if (instance.DocumentType == "BENEFIT_CLAIM")
        {
            var claim = await _context.EmployeeBenefitClaims
                .FirstOrDefaultAsync(c => c.Id == instance.SourceDocumentId, cancellationToken);

            if (claim != null)
            {
                claim.Status = instance.Status;
                claim.CompletedAt ??= DateTime.UtcNow;
                claim.UpdatedAt = DateTime.UtcNow;
                if (instance.Status == "APPROVED")
                {
                    // action ล่าสุดเพิ่งถูก Add (ยังไม่ SaveChanges) — หาใน Local ก่อน
                    claim.ApprovedAt = DateTime.UtcNow;
                    claim.PaymentStatus = Hrms.Application.Features.MasterData.Services.BenefitPayCode.InitialPaymentStatus(
                        await _context.BenefitItems.Where(b => b.Id == claim.BenefitItemId).Select(b => b.PayoutType).FirstOrDefaultAsync(cancellationToken));
                    claim.ApprovedByEmployeeId = _context.ApprovalActions.Local
                        .Concat(instance.Actions)
                        .Where(a => a.ApprovalInstanceId == instance.Id && a.ActionDecision == "APPROVE")
                        .OrderByDescending(a => a.ActionAt)
                        .FirstOrDefault()?.ApproverEmployeeId;
                }
            }
        }
    }

    // ===================== In-app Notifications =====================

    private static readonly Dictionary<string, string> DocumentTypeLabels = new()
    {
        ["LEAVE_REQUEST"] = "คำขอลา",
        ["RESIGNATION_REQUEST"] = "คำขอลาออก",
        ["CERTIFICATE_REQUEST"] = "คำขอหนังสือรับรอง",
        ["ATTENDANCE_ADJUSTMENT"] = "คำขอปรับปรุงเวลาเข้า-ออกงาน",
        ["EMPLOYMENT_CONTRACT"] = "สัญญาจ้างงาน",
        ["PAYROLL_PERIOD"] = "รอบเงินเดือน",
        ["TRANSFER_REQUEST"] = "คำขอย้ายแผนก/เลื่อนตำแหน่ง",
        ["GENERAL_REQUEST"] = "คำขอเอกสารทั่วไป",
        ["BENEFIT_CLAIM"] = "คำขอเบิกสวัสดิการ",
    };

    private static string GetDocumentLabel(string documentType) =>
        DocumentTypeLabels.TryGetValue(documentType, out var label) ? label : "เอกสาร";

    /// <summary>แจ้งเตือนผู้มีสิทธิ์อนุมัติของขั้นตอนที่คำขอเพิ่งเข้ามาถึง</summary>
    /// <summary>
    /// เตือนผู้อนุมัติรายการที่ค้างอยู่ในขั้นเดิมนานเกิน remindAfterDays วัน (เตือนซ้ำทุก remindAfterDays วัน)
    /// </summary>
    public async Task<int> SendPendingRemindersAsync(int remindAfterDays, CancellationToken cancellationToken = default)
    {
        if (remindAfterDays < 1) remindAfterDays = 1;
        var now = DateTime.UtcNow;
        var threshold = now.AddDays(-remindAfterDays);

        var due = await _context.ApprovalInstances.AsNoTracking()
            .Where(i => i.Status == "PENDING" && i.CurrentStepNo != null
                        && (i.LastRemindedAt == null || i.LastRemindedAt <= threshold))
            .Select(i => new
            {
                i.Id,
                // ขั้นปัจจุบันเริ่มเมื่อมีการอนุมัติขั้นก่อนหน้าครั้งล่าสุด (ถ้าไม่มี = ตอนยื่น)
                StepStartedAt = i.Actions.Select(a => (DateTime?)a.ActionAt).Max() ?? i.CreatedAt
            })
            .Where(x => x.StepStartedAt <= threshold)
            .ToListAsync(cancellationToken);
        if (due.Count == 0) return 0;

        var dueIds = due.Select(x => x.Id).ToList();
        var startedAt = due.ToDictionary(x => x.Id, x => x.StepStartedAt);
        var instances = await _context.ApprovalInstances
            .Include(i => i.ApprovalFlow).ThenInclude(f => f!.Steps)
            .Where(i => dueIds.Contains(i.Id))
            .ToListAsync(cancellationToken);

        var reminded = 0;
        foreach (var instance in instances)
        {
            var item = new { StepStartedAt = startedAt[instance.Id] };
            var step = instance.ApprovalFlow?.Steps.FirstOrDefault(s => s.StepNo == instance.CurrentStepNo);
            if (step == null) continue;

            var waitingDays = Math.Max(1, (int)Math.Floor((now - item.StepStartedAt).TotalDays));
            await NotifyStepApproversAsync(instance, step, null, cancellationToken, waitingDays);
            instance.LastRemindedAt = now;
            reminded++;
        }

        if (reminded > 0) await _context.SaveChangesAsync(cancellationToken);
        return reminded;
    }

    private async Task NotifyStepApproversAsync(ApprovalInstance instance, ApprovalStep step, long? requesterEmployeeId, CancellationToken cancellationToken, int? reminderWaitingDays = null)
    {
        try
        {
            requesterEmployeeId ??= await GetRequesterEmployeeIdAsync(instance, cancellationToken);
            var requesterAssignment = await GetAssignmentAsync(requesterEmployeeId, cancellationToken);
            var isLast = step.StepNo >= await GetLastStepNoAsync(instance.ApprovalFlowId, cancellationToken);

            var approverEmployeeIds = (await ResolveApproverEmployeeIdsAsync(step, isLast, requesterEmployeeId, requesterAssignment, cancellationToken)).ToList();
            var approverUserIds = await _context.UserAccounts.AsNoTracking()
                .Where(u => u.Status == "ACTIVE" && approverEmployeeIds.Contains(u.EmployeeId))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            // ไม่ต้องแจ้งเตือนผู้ยื่นเอง (กรณีผู้ยื่นมีบทบาทเดียวกับผู้อนุมัติ)
            if (requesterEmployeeId.HasValue)
            {
                var requesterUserIds = await _context.UserAccounts.AsNoTracking()
                    .Where(u => u.EmployeeId == requesterEmployeeId.Value)
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);
                approverUserIds = approverUserIds.Except(requesterUserIds).ToList();
            }

            var requesterName = requesterEmployeeId.HasValue
                ? await _context.Employees.AsNoTracking()
                    .Where(e => e.Id == requesterEmployeeId.Value)
                    .Select(e => (e.FirstName + " " + e.LastName).Trim())
                    .FirstOrDefaultAsync(cancellationToken)
                : null;

            var label = GetDocumentLabel(instance.DocumentType);
            var isReminder = reminderWaitingDays.HasValue;
            await AddNotificationsAsync(
                approverUserIds,
                "APPROVAL",
                isReminder ? $"เตือน: {label}รอการอนุมัติมา {reminderWaitingDays} วัน" : $"มี{label}รอการอนุมัติ",
                isReminder
                    ? $"{label}ของ {requesterName ?? "พนักงาน"} ยังรอคุณพิจารณา (ขั้นตอนที่ {step.StepNo})"
                    : $"{requesterName ?? "พนักงาน"} ยื่น{label} รอคุณพิจารณา (ขั้นตอนที่ {step.StepNo})",
                instance.DocumentType,
                instance.SourceDocumentId,
                cancellationToken);
        }
        catch
        {
            // การแจ้งเตือนต้องไม่ทำให้ขั้นตอนอนุมัติล้มเหลว
        }
    }

    /// <summary>แจ้งผู้ยื่นเมื่อคำขอได้รับการอนุมัติครบ หรือถูกปฏิเสธ</summary>
    private async Task NotifyRequesterResultAsync(ApprovalInstance instance, bool approved, string? comment, CancellationToken cancellationToken)
    {
        try
        {
            var requesterEmployeeId = await GetRequesterEmployeeIdAsync(instance, cancellationToken);
            if (!requesterEmployeeId.HasValue) return;

            var userIds = await _context.UserAccounts.AsNoTracking()
                .Where(u => u.EmployeeId == requesterEmployeeId.Value && u.Status == "ACTIVE")
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            var label = GetDocumentLabel(instance.DocumentType);
            var title = approved ? $"{label}ของคุณได้รับการอนุมัติแล้ว" : $"{label}ของคุณไม่ได้รับการอนุมัติ";
            var message = approved
                ? $"{label}ของคุณผ่านการอนุมัติครบทุกขั้นตอนแล้ว"
                : string.IsNullOrWhiteSpace(comment) ? $"{label}ของคุณถูกปฏิเสธ" : $"เหตุผล: {comment.Trim()}";

            await AddNotificationsAsync(userIds, "REQUEST_RESULT", title, message, instance.DocumentType, instance.SourceDocumentId, cancellationToken);
        }
        catch
        {
            // การแจ้งเตือนต้องไม่ทำให้ขั้นตอนอนุมัติล้มเหลว
        }
    }

    private async Task AddNotificationsAsync(
        IEnumerable<long> userIds,
        string type,
        string title,
        string? message,
        string referenceType,
        long referenceId,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var notifications = userIds.Distinct().Select(uid => new Notification
        {
            UserId = uid,
            NotificationType = type,
            Title = title.Length > 255 ? title[..255] : title,
            Message = message,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            IsRead = false,
            CreatedAt = now
        }).ToList();

        if (!notifications.Any()) return;

        _context.Notifications.AddRange(notifications);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // ถอนรายการที่บันทึกไม่สำเร็จออกจาก context เพื่อไม่ให้กระทบการ SaveChanges ครั้งถัดไปของเอกสารต้นทาง
            foreach (var n in notifications)
            {
                _context.Notifications.Remove(n);
            }
            throw;
        }
    }
}
