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
        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.EmployeeId == requesterEmployeeId && a.IsCurrent, cancellationToken);

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

        var firstStep = selectedFlow.Steps.OrderBy(s => s.StepNo).First();

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

        return instance.Id;
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

        // 1. ตรวจสอบว่าพนักงานคนนี้มีบทบาท ADMIN หรือไม่ (SuperAdmin อนุมัติได้ทุกขั้นตอน)
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

        // 3. ดึงข้อมูลผู้ยื่นคำขอ
        long? requesterId = null;
        if (instance.DocumentType == "LEAVE_REQUEST")
        {
            var leaveReq = await _context.LeaveRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == instance.SourceDocumentId, cancellationToken);
            requesterId = leaveReq?.EmployeeId;
        }

        var requesterAssignment = requesterId.HasValue
            ? await _context.EmployeeAssignments.AsNoTracking().FirstOrDefaultAsync(a => a.EmployeeId == requesterId.Value && a.IsCurrent, cancellationToken)
            : null;

        var userRoles = userAccount?.UserRoles ?? new List<UserRole>();

        // 4. ตรวจสอบตาม ApproverType
        switch (step.ApproverType)
        {
            case "EMPLOYEE":
                return step.ApproverEmployeeId == employeeId;

            case "ROLE":
                return userRoles.Any(ur => ur.RoleId == step.ApproverRoleId ||
                                          (step.ApproverRole != null && ur.Role.RoleCode == step.ApproverRole.RoleCode));

            case "MANAGER":
                return requesterAssignment?.ManagerEmployeeId == employeeId;

            case "DEPARTMENT_HEAD":
                if (requesterAssignment != null)
                {
                    var dept = await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == requesterAssignment.DepartmentId, cancellationToken);
                    if (dept?.HeadEmployeeId == employeeId) return true;
                }
                return userRoles.Any(ur => ur.Role.RoleCode == "DEPT_MGR");

            case "DIVISION_HEAD":
                if (requesterAssignment != null)
                {
                    var div = await _context.Divisions.AsNoTracking().FirstOrDefaultAsync(d => d.Id == requesterAssignment.DivisionId, cancellationToken);
                    if (div?.HeadEmployeeId == employeeId) return true;
                }
                return userRoles.Any(ur => ur.Role.RoleCode == "DIV_MGR" || ur.Role.RoleCode == "DEPT_MGR");

            case "HR":
                return userRoles.Any(ur => ur.Role.RoleCode == "HR_MGR" || ur.Role.RoleCode == "HR_ADMIN" || ur.Role.RoleCode == "HR");

            case "CEO":
                return userRoles.Any(ur => ur.Role.RoleCode == "CEO" || ur.Role.RoleCode == "EXECUTIVE");

            default:
                return false;
        }
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
        var nextStep = instance.ApprovalFlow.Steps
            .Where(s => s.StepNo > instance.CurrentStepNo)
            .OrderBy(s => s.StepNo)
            .FirstOrDefault();

        if (nextStep != null)
        {
            // เลื่อนสู่ขั้นตอนถัดไป
            instance.CurrentStepNo = nextStep.StepNo;
            await _context.SaveChangesAsync(cancellationToken);

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
                "ROLE" => step.ApproverRole?.RoleName ?? "บทบาทตามระบบ",
                "EMPLOYEE" => step.ApproverEmployee?.FullName ?? "พนักงานระบุตัวบุคคล",
                "MANAGER" => "หัวหน้างานโดยตรง (Direct Manager)",
                "DEPARTMENT_HEAD" => "ผู้จัดการแผนก (Department Head)",
                "DIVISION_HEAD" => "ผู้จัดการฝ่าย (Division Head)",
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
    }
}
