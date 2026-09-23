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

    public async Task<List<CertificateTypeDto>> GetCertificateTypesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.CertificateTypes
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .Select(t => new CertificateTypeDto
            {
                Id = t.Id,
                CertificateCode = t.CertificateCode,
                CertificateName = t.CertificateName
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
        var list = await GetRequestsInternalAsync(null, null, cancellationToken);
        return list.FirstOrDefault(x => x.Id == id);
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

        var currentEmpId = _currentUserService.EmployeeId;
        var isHrOrAdmin = _currentUserService.HasRole("HR_MGR") ||
                          _currentUserService.HasRole("HR_ADMIN") ||
                          _currentUserService.HasRole("HR") ||
                          _currentUserService.HasRole("ADMIN") ||
                          _currentUserService.HasRole("SUPER_ADMIN") ||
                          _currentUserService.HasRole("SYS_ADMIN");

        var items = new List<CertificateRequestDto>();
        foreach (var r in requests)
        {
            assignments.TryGetValue(r.EmployeeId, out var assign);
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
                        "MANAGER" => "หัวหน้างานโดยตรง (Direct Manager)",
                        "DEPARTMENT_HEAD" => "ผู้จัดการแผนก (Department Head)",
                        "DIVISION_HEAD" => "ผู้จัดการฝ่าย (Division Head)",
                        "HR" => "ฝ่ายทรัพยากรบุคคล (HR)",
                        "CEO" => "ประธานเจ้าหน้าที่บริหาร (CEO)",
                        _ => step.ApproverType
                    };
                }

                if (currentEmpId.HasValue)
                {
                    isMyTurn = await _approvalWorkflow.CanUserApproveStepAsync(instance.Id, currentEmpId.Value, cancellationToken);
                }
            }

            var hasAlreadyApproved = instance != null && currentEmpId.HasValue &&
                instance.Actions.Any(a => a.ApproverEmployeeId == currentEmpId.Value && a.ActionDecision == "APPROVE");

            var finalApproveAction = instance?.Actions
                .Where(a => a.ActionDecision == "APPROVE")
                .OrderByDescending(a => a.ActionAt)
                .FirstOrDefault();

            items.Add(new CertificateRequestDto
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
                ApprovedByName = finalApproveAction?.ApproverEmployee?.FullName,
                ApprovedAt = instance?.CompletedAt ?? finalApproveAction?.ActionAt,
                CanCancel = (effectiveStatus == "PENDING" && (r.EmployeeId == currentEmpId || isHrOrAdmin)),
                CanDownload = (effectiveStatus == "APPROVED" || effectiveStatus == "ISSUED")
            });
        }

        return items;
    }

    public async Task<CertificateRequestDto> CreateRequestAsync(CreateCertificateRequestDto dto, CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานปัจจุบัน");
        }

        var certType = await _context.CertificateTypes
            .FirstOrDefaultAsync(t => t.Id == dto.CertificateTypeId, cancellationToken);

        if (certType == null)
        {
            throw new KeyNotFoundException($"ไม่พบประเภทหนังสือรับรองรหัส {dto.CertificateTypeId}");
        }

        if (string.IsNullOrWhiteSpace(dto.Purpose))
        {
            throw new ValidationException("กรุณาระบุวัตถุประสงค์ในการขอหนังสือรับรอง");
        }

        var request = new CertificateRequest
        {
            EmployeeId = employeeId.Value,
            CertificateTypeId = dto.CertificateTypeId,
            Purpose = dto.Purpose.Trim(),
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
        var isHrOrAdmin = _currentUserService.HasRole("HR_MGR") ||
                          _currentUserService.HasRole("HR_ADMIN") ||
                          _currentUserService.HasRole("SUPER_ADMIN");

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
            .Include(r => r.Employee)
            .Include(r => r.ApprovalInstance)
            .FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);

        if (request == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอหนังสือรับรองรหัส {requestId}");
        }

        var language = (lang ?? "TH").Trim().ToUpper() == "EN" ? "EN" : "TH";

        // Company Master
        var company = await _context.Companies
            .AsNoTracking()
            .OrderBy(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        // Employee Assignment & Start Date
        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.IsCurrent, cancellationToken);

        var firstContract = await _context.EmploymentContracts
            .AsNoTracking()
            .Where(c => c.EmployeeId == request.EmployeeId)
            .OrderBy(c => c.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        var startDate = firstContract != null
            ? firstContract.StartDate.ToDateTime(TimeOnly.MinValue)
            : request.Employee.CreatedAt;

        // Current Base Salary
        var todayDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var salaryRecord = await _context.EmployeeSalaries
            .AsNoTracking()
            .Where(s => s.EmployeeId == request.EmployeeId && (s.EffectiveTo == null || s.EffectiveTo >= todayDate))
            .OrderByDescending(s => s.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        // Authorized Signatory Signature
        var activeSignature = await _context.EmployeeSignatures
            .AsNoTracking()
            .Include(s => s.Employee)
            .Where(s => s.IsActive)
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        string signatoryName = "นางพิมพ์ใจ กิตติพาณิชย์";
        string signatoryPosition = "ผู้จัดการฝ่ายทรัพยากรบุคคล";
        string? signatureBase64 = null;

        if (activeSignature != null)
        {
            signatoryName = $"{activeSignature.Employee.FirstName} {activeSignature.Employee.LastName}".Trim();
            var signAssign = await _context.EmployeeAssignments
                .AsNoTracking()
                .Include(a => a.Position)
                .FirstOrDefaultAsync(a => a.EmployeeId == activeSignature.EmployeeId && a.IsCurrent, cancellationToken);

            signatoryPosition = signAssign?.Position?.PositionName ?? "ผู้มีอำนาจลงนามแทนนายจ้าง";

            if (activeSignature.SignatureData.Length > 0)
            {
                var mime = string.IsNullOrWhiteSpace(activeSignature.MimeType) ? "image/png" : activeSignature.MimeType;
                signatureBase64 = $"data:{mime};base64,{Convert.ToBase64String(activeSignature.SignatureData)}";
            }
        }

        string? companyLogoBase64 = null;
        if (company?.LogoData != null && company.LogoData.Length > 0)
        {
            companyLogoBase64 = $"data:image/png;base64,{Convert.ToBase64String(company.LogoData)}";
        }

        // Calculate service duration
        var serviceDays = (DateTime.UtcNow - startDate).Days;
        var years = serviceDays / 365;
        var months = (serviceDays % 365) / 30;
        var durationText = language == "TH"
            ? (years > 0 ? $"{years} ปี " : "") + $"{months} เดือน"
            : (years > 0 ? $"{years} Year(s) " : "") + $"{months} Month(s)";

        var docNumber = $"CERT-{DateTime.UtcNow.Year}-{request.Id:D5}";
        var certCode = request.CertificateType?.CertificateCode ?? "CERT_WORK";
        var isSalaryCert = certCode == "CERT_SALARY";

        var fullNameTh = $"{request.Employee.FirstName} {request.Employee.LastName}".Trim();
        var positionTh = assignment?.Position?.PositionName ?? "พนักงาน";
        var departmentTh = assignment?.Department?.DepartmentName ?? "สำนักงานใหญ่";
        var companyNameTh = company?.CompanyName ?? "บริษัท ตัวอย่าง จำกัด (มหาชน)";

        string bodyTh;
        string bodyEn;
        string salaryFormatted = salaryRecord != null ? salaryRecord.BaseSalary.ToString("N2") : "0.00";

        if (isSalaryCert)
        {
            bodyTh = $"ขอรับรองว่า {fullNameTh} เป็นพนักงานประจำของ {companyNameTh} จริง โดยเริ่มเข้าปฏิบัติงานตั้งแต่วันที่ {startDate:d MMMM yyyy} เป็นต้นมา จนถึงปัจจุบันดำรงตำแหน่ง {positionTh} สังกัด {departmentTh} โดยได้รับเงินเดือนประจำในอัตราเดือนละ {salaryFormatted} บาท ทั้งนี้พนักงานเป็นผู้มีความประพฤติดีและปฏิบัติหน้าที่ด้วยความเรียบร้อยสม่ำเสมอ";
            bodyEn = $"This is to certify that {fullNameTh} is an active, permanent employee of {companyNameTh}, having commenced employment on {startDate:dd MMMM yyyy}. Currently holding the position of {positionTh} within the {departmentTh} Department, receiving a regular gross monthly salary of THB {salaryFormatted}. The employee has consistently performed duties with integrity and diligence.";
        }
        else
        {
            bodyTh = $"ขอรับรองว่า {fullNameTh} เป็นพนักงานของ {companyNameTh} จริง โดยเริ่มเข้าปฏิบัติงานตั้งแต่วันที่ {startDate:d MMMM yyyy} เป็นต้นมา จนถึงปัจจุบันดำรงตำแหน่ง {positionTh} สังกัด {departmentTh} ปฏิบัติหน้าที่ด้วยความวิริยะอุตสาหะและเป็นไปตามระเบียบข้อบังคับของบริษัทฯ";
            bodyEn = $"This is to certify that {fullNameTh} is currently employed with {companyNameTh}, having joined on {startDate:dd MMMM yyyy}. Currently assigned as {positionTh} in the {departmentTh} Department, performing assigned responsibilities in accordance with corporate standards.";
        }

        return new CertificateDocumentDto
        {
            RequestId = request.Id,
            DocumentNumber = docNumber,
            IssueDate = request.IssuedAt ?? DateTime.UtcNow,
            Language = language,
            CertificateCode = certCode,
            CertificateTitle = request.CertificateType?.CertificateName ?? "หนังสือรับรอง",
            CompanyName = companyNameTh,
            CompanyAddress = company?.Address ?? "เลขที่ 123 อาคารสำนักงาน ถนนสาทร แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500",
            CompanyPhone = company?.Phone ?? "02-123-4567",
            CompanyEmail = company?.Email ?? "hr@company.co.th",
            CompanyLogoBase64 = companyLogoBase64,
            EmployeeId = request.EmployeeId,
            EmployeeCode = request.Employee.EmployeeCode,
            FullName = fullNameTh,
            CitizenIdMasked = request.Employee.CitizenIdMasked,
            PositionName = positionTh,
            DepartmentName = departmentTh,
            StartDate = startDate,
            ServiceDurationText = durationText,
            BaseSalary = isSalaryCert ? salaryRecord?.BaseSalary : null,
            SalaryText = isSalaryCert ? $"{salaryFormatted} บาท" : null,
            Purpose = string.IsNullOrWhiteSpace(request.Purpose) ? "เพื่อเป็นหลักฐานแสดงการทำงาน" : request.Purpose,
            CertificationBodyTh = bodyTh,
            CertificationBodyEn = bodyEn,
            SignatoryName = signatoryName,
            SignatoryPosition = signatoryPosition,
            SignatureBase64 = signatureBase64
        };
    }

    public async Task<List<EmployeeSignatureDto>> GetActiveSignaturesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.EmployeeSignatures
            .AsNoTracking()
            .Include(s => s.Employee)
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

        // หากตั้งค่าเป็น Active ให้ปิดอันเดิมก่อน
        if (dto.IsActive)
        {
            var existing = await _context.EmployeeSignatures.Where(s => s.IsActive).ToListAsync(cancellationToken);
            foreach (var sig in existing)
            {
                sig.IsActive = false;
                sig.UpdatedAt = DateTime.UtcNow;
            }
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
