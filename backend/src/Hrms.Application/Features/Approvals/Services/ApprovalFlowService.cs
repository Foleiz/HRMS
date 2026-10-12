using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Approvals.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Approvals.Services;

public class ApprovalFlowService : IApprovalFlowService
{
    private readonly IHrmsDbContext _context;

    // ค่าที่อนุญาตต้องตรงกับ hrms."approval_document_type_enum" ใน schema.sql เป๊ะ ๆ
    // (native PostgreSQL enum) — ตรวจสอบตั้งแต่ชั้น Application ก่อนยิงลง DB เพื่อให้ error อ่านง่ายกว่า
    private static readonly HashSet<string> ValidDocumentTypes = new()
    {
        "ATTENDANCE_ADJUSTMENT", "LEAVE_REQUEST", "RESIGNATION_REQUEST",
        "CERTIFICATE_REQUEST", "EMPLOYMENT_CONTRACT", "PAYROLL_PERIOD",
        "TRANSFER_REQUEST", "GENERAL_REQUEST", "BENEFIT_CLAIM"
    };

    /// <summary>ประเภทผู้อนุมัติที่เลือกได้เมื่อสร้าง/แก้ไขสายการอนุมัติ</summary>
    /// <summary>
    /// ประเภทผู้อนุมัติที่ตั้งค่าได้ — แบบอ้างอิงผู้ยื่น (MANAGER / DEPARTMENT_HEAD / DIVISION_HEAD) ทำให้ใช้สายเดียวได้ทุกแผนก
    /// </summary>
    private static readonly HashSet<string> ConfigurableApproverTypes = new() { "EMPLOYEE", "ROLE", "MANAGER", "DEPARTMENT_HEAD", "DIVISION_HEAD", "HR", "CEO" };
    private static readonly HashSet<string> ApproverScopes = new() { "ORG", "DIVISION", "DEPARTMENT" };
    private static readonly HashSet<string> FallbackActions = new() { "HR", "SKIP", "ESCALATE", "WAIT" };
    private static readonly HashSet<string> DelegateModes = new() { "WHEN_ABSENT", "ALWAYS" };

    public ApprovalFlowService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<ApprovalFlowDto>> GetAllAsync(string? documentType = null, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.ApprovalFlows
            .AsNoTracking()
            .Include(f => f.Department)
            .Include(f => f.Level)
            .Include(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(f => f.Steps).ThenInclude(s => s.DelegateEmployee)
            .Include(f => f.Steps).ThenInclude(s => s.DelegateRole)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(documentType))
        {
            query = query.Where(f => f.DocumentType == documentType);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(f => f.Status == status);
        }

        var flows = await query.OrderBy(f => f.Id).ToListAsync(cancellationToken);
        return flows.Select(MapToDto).ToList();
    }

    public async Task<ApprovalFlowDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var flow = await _context.ApprovalFlows
            .AsNoTracking()
            .Include(f => f.Department)
            .Include(f => f.Level)
            .Include(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(f => f.Steps).ThenInclude(s => s.DelegateEmployee)
            .Include(f => f.Steps).ThenInclude(s => s.DelegateRole)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

        return flow == null ? null : MapToDto(flow);
    }

    public async Task<ApprovalFlowDto> CreateAsync(CreateApprovalFlowRequest request, CancellationToken cancellationToken = default)
    {
        // รหัสรันอัตโนมัติ (AF001, AF002, ...) ถ้าไม่ได้ระบุมา
        var flowCode = string.IsNullOrWhiteSpace(request.FlowCode)
            ? await CodeGenerator.NextAsync(_context.ApprovalFlows.Select(f => f.FlowCode), "AF", 3, cancellationToken)
            : request.FlowCode.Trim().ToUpper();
        var exists = await _context.ApprovalFlows.AnyAsync(f => f.FlowCode == flowCode, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"รหัสสายการอนุมัติ '{flowCode}' มีอยู่ในระบบแล้ว");
        }

        ValidateDocumentType(request.DocumentType);
        var steps = ValidateAndBuildSteps(request.Steps);

        var flow = new ApprovalFlow
        {
            FlowCode = flowCode,
            FlowName = request.FlowName.Trim(),
            DocumentType = request.DocumentType,
            DepartmentId = request.DepartmentId,
            LevelId = request.LevelId,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.ToUpper(),
            CreatedAt = DateTime.UtcNow,
            Steps = steps
        };

        _context.ApprovalFlows.Add(flow);
        await _context.SaveChangesAsync(cancellationToken);

        var created = await GetByIdAsync(flow.Id, cancellationToken);
        return created!;
    }

    public async Task<ApprovalFlowDto> UpdateAsync(long id, UpdateApprovalFlowRequest request, CancellationToken cancellationToken = default)
    {
        var flow = await _context.ApprovalFlows
            .Include(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

        if (flow == null)
        {
            throw new KeyNotFoundException($"ไม่พบสายการอนุมัติรหัส ID {id}");
        }

        ValidateDocumentType(request.DocumentType);
        var newSteps = ValidateAndBuildSteps(request.Steps);

        flow.FlowName = request.FlowName.Trim();
        flow.DocumentType = request.DocumentType;
        flow.DepartmentId = request.DepartmentId;
        flow.LevelId = request.LevelId;
        flow.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.ToUpper();

        // บันทึก snapshot สายการอนุมัติเดิมเก็บไว้ให้กับทุก ApprovalInstance เดิมที่ยังไม่มี snapshot
        // เพื่อป้องกันไม่ให้การแก้ไขสายอนุมัตินี้ส่งผลกระทบต่อเอกสารเดิมหรือเอกสารที่อนุมัติไปแล้ว
        var instancesNeedingSnapshot = await _context.ApprovalInstances
            .Where(i => i.ApprovalFlowId == id && string.IsNullOrEmpty(i.FlowSnapshotJson))
            .ToListAsync(cancellationToken);

        if (instancesNeedingSnapshot.Any())
        {
            var oldSnapshotJson = ApprovalWorkflowService.SerializeFlowSnapshot(flow);
            foreach (var inst in instancesNeedingSnapshot)
            {
                inst.FlowSnapshotJson = oldSnapshotJson;
            }
        }

        // อัปเดตขั้นตอนเดิม หรือเพิ่มขั้นตอนใหม่ แทนที่จะลบทั้งชุด (ป้องกัน FK constraint violation กับ approval_action)
        var existingStepsList = flow.Steps.OrderBy(s => s.StepNo).ToList();
        var newStepsList = newSteps.OrderBy(s => s.StepNo).ToList();

        int commonCount = Math.Min(existingStepsList.Count, newStepsList.Count);
        for (int i = 0; i < commonCount; i++)
        {
            var existing = existingStepsList[i];
            var incoming = newStepsList[i];

            existing.StepNo = incoming.StepNo;
            existing.ApproverType = incoming.ApproverType;
            existing.ApproverEmployeeId = incoming.ApproverEmployeeId;
            existing.ApproverRoleId = incoming.ApproverRoleId;
            existing.IsRequired = incoming.IsRequired;
            existing.ApproverScope = incoming.ApproverScope;
            existing.FallbackAction = incoming.FallbackAction;
            existing.DelegateType = incoming.DelegateType;
            existing.DelegateEmployeeId = incoming.DelegateEmployeeId;
            existing.DelegateRoleId = incoming.DelegateRoleId;
            existing.DelegateScope = incoming.DelegateScope;
            existing.DelegateMode = incoming.DelegateMode;
        }

        for (int i = commonCount; i < newStepsList.Count; i++)
        {
            flow.Steps.Add(newStepsList[i]);
        }

        for (int i = commonCount; i < existingStepsList.Count; i++)
        {
            var stepToDelete = existingStepsList[i];
            var actionsReferencing = await _context.ApprovalActions
                .Where(a => a.ApprovalStepId == stepToDelete.Id)
                .ToListAsync(cancellationToken);
            foreach (var act in actionsReferencing)
            {
                act.ApprovalStepId = null;
            }
            _context.ApprovalSteps.Remove(stepToDelete);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var updated = await GetByIdAsync(flow.Id, cancellationToken);
        return updated!;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var flow = await _context.ApprovalFlows.FindAsync([id], cancellationToken);
        if (flow == null) return false;

        _context.ApprovalFlows.Remove(flow); // Cascade delete ApprovalStep ที่ผูกอยู่โดยอัตโนมัติ
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    // ─── Helpers ────────────────────────────────────────────────

    private static void ValidateDocumentType(string documentType)
    {
        if (!ValidDocumentTypes.Contains(documentType))
        {
            throw new InvalidOperationException(
                $"ประเภทเอกสาร '{documentType}' ไม่ถูกต้อง ต้องเป็นหนึ่งใน: {string.Join(", ", ValidDocumentTypes)}");
        }
    }

    /// <summary>จำนวนขั้นตอนอนุมัติสูงสุดของทุกสายการอนุมัติ (ต้องตรงกับ frontend: MAX_APPROVAL_STEPS)</summary>
    public const int MaxApprovalSteps = 4;

    private static List<ApprovalStep> ValidateAndBuildSteps(List<ApprovalStepInput> inputs)
    {
        if (inputs == null || inputs.Count == 0)
        {
            throw new InvalidOperationException("สายการอนุมัติต้องมีอย่างน้อย 1 ขั้นตอน");
        }

        if (inputs.Count > MaxApprovalSteps)
        {
            throw new InvalidOperationException($"สายการอนุมัติกำหนดได้สูงสุด {MaxApprovalSteps} ขั้นตอน (ส่งมา {inputs.Count} ขั้นตอน)");
        }

        var stepNumbers = new HashSet<int>();
        var steps = new List<ApprovalStep>();

        foreach (var input in inputs.OrderBy(s => s.StepNo))
        {
            if (!stepNumbers.Add(input.StepNo))
            {
                throw new InvalidOperationException($"ลำดับขั้นตอนที่ {input.StepNo} ซ้ำกัน กรุณาจัดลำดับใหม่");
            }

            if (!ConfigurableApproverTypes.Contains(input.ApproverType))
            {
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ประเภทผู้อนุมัติ '{input.ApproverType}' ไม่ถูกต้อง");
            }

            var scope = string.IsNullOrWhiteSpace(input.ApproverScope) ? "ORG" : input.ApproverScope.Trim().ToUpperInvariant();
            if (!ApproverScopes.Contains(scope))
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ขอบเขตผู้อนุมัติ '{input.ApproverScope}' ไม่ถูกต้อง");
            var fallback = string.IsNullOrWhiteSpace(input.FallbackAction) ? "HR" : input.FallbackAction.Trim().ToUpperInvariant();
            if (!FallbackActions.Contains(fallback))
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: การจัดการเมื่อไม่พบผู้อนุมัติ '{input.FallbackAction}' ไม่ถูกต้อง");

            // ผู้อนุมัติแทน (ไม่บังคับ)
            var delegateType = string.IsNullOrWhiteSpace(input.DelegateType) ? null : input.DelegateType.Trim().ToUpperInvariant();
            if (delegateType is not null and not "EMPLOYEE" and not "ROLE")
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ประเภทผู้อนุมัติแทน '{input.DelegateType}' ไม่ถูกต้อง");
            if (delegateType == "EMPLOYEE" && input.DelegateEmployeeId is null)
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: กรุณาเลือกพนักงานผู้อนุมัติแทน");
            if (delegateType == "ROLE" && input.DelegateRoleId is null)
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: กรุณาเลือกบทบาทผู้อนุมัติแทน");
            if (delegateType == "EMPLOYEE" && input.ApproverType == "EMPLOYEE" && input.DelegateEmployeeId == input.ApproverEmployeeId)
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ผู้อนุมัติแทนต้องไม่ใช่คนเดียวกับผู้อนุมัติหลัก");
            var delegateScope = string.IsNullOrWhiteSpace(input.DelegateScope) ? "ORG" : input.DelegateScope.Trim().ToUpperInvariant();
            if (!ApproverScopes.Contains(delegateScope))
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ขอบเขตผู้อนุมัติแทน '{input.DelegateScope}' ไม่ถูกต้อง");
            var delegateMode = string.IsNullOrWhiteSpace(input.DelegateMode) ? "WHEN_ABSENT" : input.DelegateMode.Trim().ToUpperInvariant();
            if (!DelegateModes.Contains(delegateMode))
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: เงื่อนไขการอนุมัติแทน '{input.DelegateMode}' ไม่ถูกต้อง");

            if (input.ApproverType == "EMPLOYEE" && input.ApproverEmployeeId is null)
            {
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ต้องระบุพนักงานผู้อนุมัติเมื่อเลือกประเภท 'ระบุตัวบุคคล'");
            }

            if (input.ApproverType == "ROLE" && input.ApproverRoleId is null)
            {
                throw new InvalidOperationException($"ขั้นตอนที่ {input.StepNo}: ต้องระบุบทบาทผู้อนุมัติเมื่อเลือกประเภท 'ระบุตามบทบาท'");
            }

            steps.Add(new ApprovalStep
            {
                StepNo = input.StepNo,
                ApproverType = input.ApproverType,
                // เก็บเฉพาะ FK ที่เกี่ยวข้องกับ ApproverType นั้นจริง ๆ ป้องกันข้อมูลค้างจากการสลับประเภทไปมาในหน้า UI
                ApproverEmployeeId = input.ApproverType == "EMPLOYEE" ? input.ApproverEmployeeId : null,
                ApproverRoleId = input.ApproverType == "ROLE" ? input.ApproverRoleId : null,
                IsRequired = fallback != "SKIP",
                // ขอบเขตใช้กับแบบ ROLE เท่านั้น — แบบอื่นอ้างอิงผู้ยื่นอยู่แล้ว
                ApproverScope = input.ApproverType == "ROLE" ? scope : "ORG",
                FallbackAction = fallback,
                DelegateType = delegateType,
                DelegateEmployeeId = delegateType == "EMPLOYEE" ? input.DelegateEmployeeId : null,
                DelegateRoleId = delegateType == "ROLE" ? input.DelegateRoleId : null,
                DelegateScope = delegateType == "ROLE" ? delegateScope : "ORG",
                DelegateMode = delegateMode
            });
        }

        return steps;
    }

    public async Task<WorkflowSimulationResultDto> SimulateWorkflowAsync(WorkflowSimulationRequest request, CancellationToken cancellationToken = default)
    {
        var effectiveDate = request.EffectiveDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        // 1. Get Requester with current assignment
        var requester = await _context.Employees
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Division)
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Position)
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.EmployeeLevel)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);

        if (requester == null)
        {
            return new WorkflowSimulationResultDto
            {
                Success = false,
                Message = $"ไม่พบข้อมูลพนักงานรหัส ID {request.EmployeeId}",
                DocumentType = request.DocumentType
            };
        }

        var currentAssignment = requester.Assignments.FirstOrDefault(a => a.IsCurrent);

        var requesterDto = new SimulatedApproverDto
        {
            EmployeeId = requester.Id,
            EmployeeCode = requester.EmployeeCode,
            FullName = requester.FullName,
            PositionName = currentAssignment?.Position?.PositionName,
            DepartmentName = currentAssignment?.Department?.DepartmentName
        };

        // 2. Find matching ApprovalFlow
        var candidateFlows = await _context.ApprovalFlows
            .Include(f => f.Steps).ThenInclude(s => s.ApproverEmployee)
            .Include(f => f.Steps).ThenInclude(s => s.ApproverRole)
            .Include(f => f.Steps).ThenInclude(s => s.DelegateEmployee)
            .Include(f => f.Steps).ThenInclude(s => s.DelegateRole)
            .Where(f => f.DocumentType == request.DocumentType && f.Status == "ACTIVE")
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        ApprovalFlow? matchedFlow = null;
        if (currentAssignment != null)
        {
            matchedFlow = candidateFlows.FirstOrDefault(f => f.DepartmentId == currentAssignment.DepartmentId && f.LevelId == currentAssignment.EmployeeLevelId)
                       ?? candidateFlows.FirstOrDefault(f => f.DepartmentId == currentAssignment.DepartmentId && f.LevelId == null)
                       ?? candidateFlows.FirstOrDefault(f => f.DepartmentId == null && f.LevelId == currentAssignment.EmployeeLevelId)
                       ?? candidateFlows.FirstOrDefault(f => f.DepartmentId == null && f.LevelId == null);
        }
        else
        {
            matchedFlow = candidateFlows.FirstOrDefault(f => f.DepartmentId == null && f.LevelId == null)
                       ?? candidateFlows.FirstOrDefault();
        }

        if (matchedFlow == null)
        {
            return new WorkflowSimulationResultDto
            {
                Success = false,
                Message = $"ไม่พบสายการอนุมัติที่เปิดใช้งานสำหรับประเภทเอกสาร '{request.DocumentType}' ที่ตรงกับแผนกหรือระดับตำแหน่งของพนักงาน",
                DocumentType = request.DocumentType,
                Requester = requesterDto
            };
        }

        // 3. Resolve each step
        var steps = matchedFlow.Steps.OrderBy(s => s.StepNo).ToList();
        var simulatedSteps = new List<SimulatedStepDto>();

        foreach (var step in steps)
        {
            SimulatedApproverDto? approver = null;

            switch (step.ApproverType)
            {
                case "EMPLOYEE":
                    if (step.ApproverEmployee != null)
                    {
                        approver = await GetSimulatedApproverAsync(step.ApproverEmployee.Id, cancellationToken);
                    }
                    break;

                case "MANAGER":
                    if (currentAssignment?.TeamId.HasValue == true)
                    {
                        var teamLeadId = await _context.Teams.AsNoTracking()
                            .Where(t => t.Id == currentAssignment.TeamId.Value)
                            .Select(t => t.LeadEmployeeId)
                            .FirstOrDefaultAsync(cancellationToken);
                        if (teamLeadId.HasValue)
                        {
                            approver = await GetSimulatedApproverAsync(teamLeadId.Value, cancellationToken);
                            break;
                        }
                    }
                    if (currentAssignment?.ManagerEmployeeId.HasValue == true)
                    {
                        approver = await GetSimulatedApproverAsync(currentAssignment.ManagerEmployeeId.Value, cancellationToken);
                    }
                    break;

                case "DEPARTMENT_HEAD":
                    if (currentAssignment?.DepartmentId != null)
                    {
                        var dept = await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == currentAssignment.DepartmentId, cancellationToken);
                        if (dept?.HeadEmployeeId.HasValue == true)
                        {
                            approver = await GetSimulatedApproverAsync(dept.HeadEmployeeId.Value, cancellationToken);
                        }
                    }
                    break;

                case "DIVISION_HEAD":
                    if (currentAssignment?.DivisionId != null)
                    {
                        var div = await _context.Divisions.AsNoTracking().FirstOrDefaultAsync(d => d.Id == currentAssignment.DivisionId, cancellationToken);
                        if (div?.HeadEmployeeId.HasValue == true)
                        {
                            approver = await GetSimulatedApproverAsync(div.HeadEmployeeId.Value, cancellationToken);
                        }
                    }
                    break;

                case "ROLE":
                    if (step.ApproverRoleId.HasValue)
                    {
                        var userRole = await _context.UserRoles
                            .Include(ur => ur.User)
                            .Where(ur => ur.RoleId == step.ApproverRoleId.Value && ur.User.EmployeeId > 0)
                            .FirstOrDefaultAsync(cancellationToken);
                        if (userRole?.User != null && userRole.User.EmployeeId > 0)
                        {
                            approver = await GetSimulatedApproverAsync(userRole.User.EmployeeId, cancellationToken);
                        }
                    }
                    break;

                case "HR":
                    var hrUser = await _context.UserRoles
                        .Include(ur => ur.User)
                        .Include(ur => ur.Role)
                        .Where(ur => (ur.Role.RoleCode == "HR_MGR" || ur.Role.RoleCode == "HR_ADMIN" || ur.Role.RoleCode == "HR") && ur.User.EmployeeId > 0)
                        .FirstOrDefaultAsync(cancellationToken);
                    if (hrUser?.User != null && hrUser.User.EmployeeId > 0)
                    {
                        approver = await GetSimulatedApproverAsync(hrUser.User.EmployeeId, cancellationToken);
                    }
                    break;

                case "CEO":
                    var ceoUser = await _context.UserRoles
                        .Include(ur => ur.User)
                        .Include(ur => ur.Role)
                        .Where(ur => (ur.Role.RoleCode == "CEO" || ur.Role.RoleCode == "EXECUTIVE") && ur.User.EmployeeId > 0)
                        .FirstOrDefaultAsync(cancellationToken);
                    if (ceoUser?.User != null && ceoUser.User.EmployeeId > 0)
                    {
                        approver = await GetSimulatedApproverAsync(ceoUser.User.EmployeeId, cancellationToken);
                    }
                    else
                    {
                        var ceoEmp = await _context.Employees
                            .Where(e => e.IsTopLevel)
                            .FirstOrDefaultAsync(cancellationToken);
                        if (ceoEmp != null)
                        {
                            approver = await GetSimulatedApproverAsync(ceoEmp.Id, cancellationToken);
                        }
                    }
                    break;
            }

            simulatedSteps.Add(new SimulatedStepDto
            {
                StepNo = step.StepNo,
                ApproverType = step.ApproverType,
                ApproverTypeLabel = GetApproverTypeLabel(step.ApproverType),
                ApproverRoleName = step.ApproverRole?.RoleName,
                IsRequired = step.IsRequired,
                Approver = approver
            });
        }

        return new WorkflowSimulationResultDto
        {
            Success = true,
            Message = "จำลองสายการอนุมัติสำเร็จ",
            FlowId = matchedFlow.Id,
            FlowCode = matchedFlow.FlowCode,
            FlowName = matchedFlow.FlowName,
            DocumentType = request.DocumentType,
            Requester = requesterDto,
            Steps = simulatedSteps
        };
    }

    private async Task<SimulatedApproverDto?> GetSimulatedApproverAsync(long employeeId, CancellationToken cancellationToken)
    {
        var emp = await _context.Employees
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Position)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        if (emp == null) return null;

        var assign = emp.Assignments.FirstOrDefault(a => a.IsCurrent);
        return new SimulatedApproverDto
        {
            EmployeeId = emp.Id,
            EmployeeCode = emp.EmployeeCode,
            FullName = emp.FullName,
            PositionName = assign?.Position?.PositionName,
            DepartmentName = assign?.Department?.DepartmentName
        };
    }

    private static string GetApproverTypeLabel(string approverType)
    {
        return approverType switch
        {
            "MANAGER" => "หัวหน้าทีมของผู้ยื่น",
            "DEPARTMENT_HEAD" => "ผู้จัดการแผนก",
            "DIVISION_HEAD" => "หัวหน้าฝ่าย",
            "HR" => "ฝ่ายบุคคล",
            "CEO" => "ประธานเจ้าหน้าที่บริหาร",
            "ROLE" => "ระบุตามบทบาท",
            "EMPLOYEE" => "ระบุตัวบุคคล",
            _ => approverType
        };
    }

    private static ApprovalFlowDto MapToDto(ApprovalFlow flow)
    {
        return new ApprovalFlowDto
        {
            Id = flow.Id,
            FlowCode = flow.FlowCode,
            FlowName = flow.FlowName,
            DocumentType = flow.DocumentType,
            DepartmentId = flow.DepartmentId,
            DepartmentName = flow.Department?.DepartmentName,
            LevelId = flow.LevelId,
            LevelName = flow.Level?.LevelName,
            Status = flow.Status,
            CreatedAt = flow.CreatedAt,
            Steps = flow.Steps
                .OrderBy(s => s.StepNo)
                .Select(s => new ApprovalStepDto
                {
                    Id = s.Id,
                    StepNo = s.StepNo,
                    ApproverType = s.ApproverType,
                    ApproverEmployeeId = s.ApproverEmployeeId,
                    ApproverEmployeeName = s.ApproverEmployee?.FullName,
                    ApproverRoleId = s.ApproverRoleId,
                    ApproverRoleName = s.ApproverRole?.RoleName,
                    IsRequired = s.IsRequired,
                    ApproverScope = s.ApproverScope,
                    FallbackAction = s.FallbackAction,
                    DelegateType = s.DelegateType,
                    DelegateEmployeeId = s.DelegateEmployeeId,
                    DelegateEmployeeName = s.DelegateEmployee?.FullName,
                    DelegateRoleId = s.DelegateRoleId,
                    DelegateRoleName = s.DelegateRole?.RoleName,
                    DelegateScope = s.DelegateScope,
                    DelegateMode = s.DelegateMode
                })
                .ToList()
        };
    }
}
