using Hrms.Application.Common.Interfaces;
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
        "TRANSFER_REQUEST"
    };

    private static readonly HashSet<string> ValidApproverTypes = new()
    {
        "EMPLOYEE", "ROLE", "MANAGER", "DEPARTMENT_HEAD", "DIVISION_HEAD", "HR", "CEO"
    };

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
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

        return flow == null ? null : MapToDto(flow);
    }

    public async Task<ApprovalFlowDto> CreateAsync(CreateApprovalFlowRequest request, CancellationToken cancellationToken = default)
    {
        var flowCode = request.FlowCode.Trim().ToUpper();
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
            .Include(f => f.Steps)
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

        // แทนที่ขั้นตอนอนุมัติทั้งชุดทุกครั้งที่บันทึก — ยังไม่มีการอ้างอิงจาก approval_action มาถึง step
        // เดิม (Approval Execution Engine ยังไม่เชื่อมใช้งานจริงในเฟสนี้) จึงลบแล้วสร้างใหม่ได้อย่างปลอดภัย
        _context.ApprovalSteps.RemoveRange(flow.Steps);
        flow.Steps = newSteps;

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

    private static List<ApprovalStep> ValidateAndBuildSteps(List<ApprovalStepInput> inputs)
    {
        if (inputs == null || inputs.Count == 0)
        {
            throw new InvalidOperationException("สายการอนุมัติต้องมีอย่างน้อย 1 ขั้นตอน");
        }

        var stepNumbers = new HashSet<int>();
        var steps = new List<ApprovalStep>();

        foreach (var input in inputs.OrderBy(s => s.StepNo))
        {
            if (!stepNumbers.Add(input.StepNo))
            {
                throw new InvalidOperationException($"ลำดับขั้นตอนที่ {input.StepNo} ซ้ำกัน กรุณาจัดลำดับใหม่");
            }

            if (!ValidApproverTypes.Contains(input.ApproverType))
            {
                throw new InvalidOperationException(
                    $"ประเภทผู้อนุมัติ '{input.ApproverType}' ไม่ถูกต้อง ต้องเป็นหนึ่งใน: {string.Join(", ", ValidApproverTypes)}");
            }

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
                IsRequired = input.IsRequired
            });
        }

        return steps;
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
                    IsRequired = s.IsRequired
                })
                .ToList()
        };
    }
}
