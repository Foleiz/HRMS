using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

public class BenefitService : IBenefitService
{
    private readonly IHrmsDbContext _context;

    public BenefitService(IHrmsDbContext _context)
    {
        this._context = _context;
    }

    public async Task<List<BenefitItemDto>> GetAllAsync(string? category = null, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.BenefitItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) && category.ToUpper() != "ALL")
        {
            query = query.Where(b => b.Category.ToUpper() == category.Trim().ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(status) && status.ToUpper() != "ALL")
        {
            query = query.Where(b => b.Status.ToUpper() == status.Trim().ToUpper());
        }

        // Count assignments per benefit
        var assignmentCounts = await _context.EmployeeTypeBenefits
            .AsNoTracking()
            .Where(etb => etb.IsActive)
            .GroupBy(etb => etb.BenefitItemId)
            .Select(g => new { BenefitItemId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BenefitItemId, x => x.Count, cancellationToken);

        var benefits = await query
            .OrderByDescending(b => b.IsStatutory)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

        return benefits.Select(b => new BenefitItemDto
        {
            Id = b.Id,
            BenefitCode = b.BenefitCode,
            BenefitName = b.BenefitName,
            Category = b.Category,
            Description = b.Description,
            IsStatutory = b.IsStatutory,
            IsDocumentRequired = b.IsDocumentRequired,
            DefaultCoverageAmount = b.DefaultCoverageAmount,
            DefaultFrequency = b.DefaultFrequency,
            PayoutType = b.PayoutType,
            Status = b.Status,
            AssignedTypesCount = assignmentCounts.GetValueOrDefault(b.Id, 0),
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt
        }).ToList();
    }

    public async Task<BenefitItemDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var benefit = await _context.BenefitItems
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (benefit == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {id}");

        var count = await _context.EmployeeTypeBenefits
            .AsNoTracking()
            .CountAsync(etb => etb.BenefitItemId == id && etb.IsActive, cancellationToken);

        return new BenefitItemDto
        {
            Id = benefit.Id,
            BenefitCode = benefit.BenefitCode,
            BenefitName = benefit.BenefitName,
            Category = benefit.Category,
            Description = benefit.Description,
            IsStatutory = benefit.IsStatutory,
            IsDocumentRequired = benefit.IsDocumentRequired,
            DefaultCoverageAmount = benefit.DefaultCoverageAmount,
            DefaultFrequency = benefit.DefaultFrequency,
            PayoutType = benefit.PayoutType,
            Status = benefit.Status,
            AssignedTypesCount = count,
            CreatedAt = benefit.CreatedAt,
            UpdatedAt = benefit.UpdatedAt
        };
    }


    public async Task<BenefitItemDto> CreateAsync(CreateBenefitItemRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.BenefitName))
            throw new ValidationException("กรุณาระบุชื่อสิทธิประโยชน์/สวัสดิการ");

        // รหัสรันอัตโนมัติ (BNF001, BNF002, ...) ถ้าไม่ได้ระบุมา
        var normalizedCode = string.IsNullOrWhiteSpace(request.BenefitCode)
            ? await CodeGenerator.NextAsync(_context.BenefitItems.Select(b => b.BenefitCode), "BNF", 3, cancellationToken)
            : request.BenefitCode.Trim().ToUpper();

        var exists = await _context.BenefitItems
            .AnyAsync(b => b.BenefitCode == normalizedCode, cancellationToken);

        if (exists)
            throw new ValidationException($"รหัสสิทธิประโยชน์ '{normalizedCode}' มีอยู่ในระบบแล้ว");

        var benefit = new BenefitItem
        {
            BenefitCode = normalizedCode,
            BenefitName = request.BenefitName.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "OTHER" : request.Category.Trim().ToUpper(),
            Description = request.Description?.Trim(),
            IsStatutory = request.IsStatutory,
            IsDocumentRequired = request.IsDocumentRequired,
            DefaultCoverageAmount = request.DefaultCoverageAmount,
            DefaultFrequency = string.IsNullOrWhiteSpace(request.DefaultFrequency) ? "YEARLY" : request.DefaultFrequency.Trim().ToUpper(),
            PayoutType = string.IsNullOrWhiteSpace(request.PayoutType) ? "REIMBURSEMENT" : request.PayoutType.Trim().ToUpper(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpper(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.BenefitItems.Add(benefit);
        await _context.SaveChangesAsync(cancellationToken);

        return new BenefitItemDto
        {
            Id = benefit.Id,
            BenefitCode = benefit.BenefitCode,
            BenefitName = benefit.BenefitName,
            Category = benefit.Category,
            Description = benefit.Description,
            IsStatutory = benefit.IsStatutory,
            IsDocumentRequired = benefit.IsDocumentRequired,
            DefaultCoverageAmount = benefit.DefaultCoverageAmount,
            DefaultFrequency = benefit.DefaultFrequency,
            PayoutType = benefit.PayoutType,
            Status = benefit.Status,
            AssignedTypesCount = 0,
            CreatedAt = benefit.CreatedAt,
            UpdatedAt = benefit.UpdatedAt
        };
    }

    public async Task<BenefitItemDto> UpdateAsync(long id, UpdateBenefitItemRequest request, CancellationToken cancellationToken = default)
    {
        var benefit = await _context.BenefitItems
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (benefit == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {id}");

        if (string.IsNullOrWhiteSpace(request.BenefitName))
            throw new ValidationException("กรุณาระบุชื่อสิทธิประโยชน์/สวัสดิการ");

        benefit.BenefitName = request.BenefitName.Trim();
        benefit.Category = string.IsNullOrWhiteSpace(request.Category) ? "OTHER" : request.Category.Trim().ToUpper();
        benefit.Description = request.Description?.Trim();
        benefit.IsStatutory = request.IsStatutory;
        benefit.IsDocumentRequired = request.IsDocumentRequired;
        benefit.DefaultCoverageAmount = request.DefaultCoverageAmount;
        if (!string.IsNullOrWhiteSpace(request.DefaultFrequency))
            benefit.DefaultFrequency = request.DefaultFrequency.Trim().ToUpper();
        if (!string.IsNullOrWhiteSpace(request.PayoutType))
            benefit.PayoutType = request.PayoutType.Trim().ToUpper();
        benefit.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim().ToUpper();
        benefit.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var count = await _context.EmployeeTypeBenefits
            .AsNoTracking()
            .CountAsync(etb => etb.BenefitItemId == id && etb.IsActive, cancellationToken);

        return new BenefitItemDto
        {
            Id = benefit.Id,
            BenefitCode = benefit.BenefitCode,
            BenefitName = benefit.BenefitName,
            Category = benefit.Category,
            Description = benefit.Description,
            IsStatutory = benefit.IsStatutory,
            IsDocumentRequired = benefit.IsDocumentRequired,
            DefaultCoverageAmount = benefit.DefaultCoverageAmount,
            DefaultFrequency = benefit.DefaultFrequency,
            PayoutType = benefit.PayoutType,
            Status = benefit.Status,
            AssignedTypesCount = count,
            CreatedAt = benefit.CreatedAt,
            UpdatedAt = benefit.UpdatedAt
        };
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var benefit = await _context.BenefitItems
            .Include(b => b.EmployeeTypeBenefits)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (benefit == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {id}");

        if (benefit.IsStatutory)
            throw new ValidationException("ไม่สามารถลบสิทธิประโยชน์ที่เป็นสิทธิตามกฎหมายได้ (สามารถเลือกปิดการใช้งานแทนได้)");

        if (benefit.EmployeeTypeBenefits.Any())
            throw new ValidationException("ไม่สามารถลบสิทธิประโยชน์นี้ได้ เนื่องจากถูกผูกอยู่กับประเภทสัญญาจ้างงานแล้ว กรุณาปลดการผูกสิทธิ์ก่อน");

        _context.BenefitItems.Remove(benefit);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<EmployeeBenefitUsageSummaryDto> GetEmployeeUsageSummaryAsync(long employeeId, int? year = null, CancellationToken cancellationToken = default)
    {
        int targetYear = year ?? DateTime.UtcNow.Year;

        var employee = await _context.Employees
            .Include(e => e.Assignments)
                .ThenInclude(a => a.EmployeeType)
                    .ThenInclude(et => et!.EmployeeTypeBenefits)
                        .ThenInclude(etb => etb.BenefitItem)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        if (employee == null)
            throw new NotFoundException($"ไม่พบข้อมูลพนักงานรหัส ID: {employeeId}");

        var currentAssignment = employee.Assignments?.FirstOrDefault(a => a.IsCurrent) 
            ?? employee.Assignments?.FirstOrDefault();

        var empType = currentAssignment?.EmployeeType;

        // Active benefits assigned to this employee type
        var typeBenefits = empType?.EmployeeTypeBenefits?
            .Where(etb => etb.IsActive && etb.BenefitItem != null && etb.BenefitItem.Status == "ACTIVE")
            .ToList() ?? new List<EmployeeTypeBenefit>();

        // Query all claims for this employee in the target year
        var claims = await _context.EmployeeBenefitClaims
            .AsNoTracking()
            .Where(c => c.EmployeeId == employeeId && c.ClaimYear == targetYear && c.Status == "APPROVED")
            .Select(c => new EmployeeBenefitClaim { Id = c.Id, BenefitItemId = c.BenefitItemId, Amount = c.Amount, ClaimDate = c.ClaimDate })
            .ToListAsync(cancellationToken);

        // ยอดที่ยื่นเบิกแล้วรออนุมัติ — กันวงเงินไว้ (ยังไม่นับเป็นยอดใช้)
        var pendingByBenefit = await _context.EmployeeBenefitClaims
            .AsNoTracking()
            .Where(c => c.EmployeeId == employeeId && c.ClaimYear == targetYear && c.Status == "PENDING")
            .GroupBy(c => c.BenefitItemId)
            .Select(g => new { BenefitItemId = g.Key, Amount = g.Sum(c => c.Amount) })
            .ToDictionaryAsync(x => x.BenefitItemId, x => x.Amount, cancellationToken);

        var claimsByBenefit = claims
            .GroupBy(c => c.BenefitItemId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var benefitItemsDto = new List<BenefitUsageItemDto>();

        foreach (var tb in typeBenefits)
        {
            var bItem = tb.BenefitItem;
            var itemClaims = claimsByBenefit.GetValueOrDefault(bItem.Id, new List<EmployeeBenefitClaim>());
            decimal used = itemClaims.Sum(c => c.Amount);
            decimal pending = pendingByBenefit.GetValueOrDefault(bItem.Id);
            decimal quota = tb.CoverageAmount;
            decimal remaining = quota > 0 ? Math.Max(0, quota - used - pending) : 0;
            decimal percentage = quota > 0 ? Math.Min(100, Math.Round((used / quota) * 100, 1)) : (used > 0 ? 100 : 0);
            bool isMaxed = quota > 0 && used >= quota;

            string statusText = "ได้รับสิทธิ์ตามระเบียบบริษัท";
            if (tb.Frequency == "YEARLY" || quota > 0)
            {
                if (isMaxed)
                    statusText = "ใช้เต็มโควตาแล้ว (100%)";
                else if (percentage >= 70)
                    statusText = $"ใกล้ครบโควตา ({percentage}%)";
                else if (used > 0)
                    statusText = $"ยังไม่ครบโควตา ({percentage}%)";
                else
                    statusText = "ยังไม่ได้ใช้สิทธิ์";
            }
            else if (bItem.Category == "ALLOWANCE")
            {
                statusText = "คำนวณอัตโนมัติผ่านเงินเดือน";
            }

            benefitItemsDto.Add(new BenefitUsageItemDto
            {
                BenefitItemId = bItem.Id,
                BenefitCode = bItem.BenefitCode,
                BenefitName = bItem.BenefitName,
                Category = bItem.Category,
                Description = bItem.Description,
                PayoutType = bItem.PayoutType,
                IsDocumentRequired = bItem.IsDocumentRequired,
                QuotaAmount = quota,
                Frequency = tb.Frequency,
                UsedAmount = used,
                PendingAmount = pending,
                RemainingAmount = remaining,
                UsagePercentage = percentage,
                IsMaxedOut = isMaxed,
                StatusText = statusText,
                ClaimCount = itemClaims.Count,
                LastClaimDate = itemClaims.OrderByDescending(c => c.ClaimDate).Select(c => (DateOnly?)c.ClaimDate).FirstOrDefault()
            });
        }

        decimal totalQuota = benefitItemsDto.Where(b => b.Frequency == "YEARLY").Sum(b => b.QuotaAmount);
        decimal totalUsed = benefitItemsDto.Sum(b => b.UsedAmount);
        decimal totalRemaining = benefitItemsDto.Where(b => b.Frequency == "YEARLY").Sum(b => b.RemainingAmount);
        decimal overallPercent = totalQuota > 0 ? Math.Min(100, Math.Round((totalUsed / totalQuota) * 100, 1)) : 0;

        return new EmployeeBenefitUsageSummaryDto
        {
            EmployeeId = employee.Id,
            EmployeeCode = employee.EmployeeCode,
            EmployeeName = employee.FullName,
            EmployeeType = empType?.TypeName,
            Year = targetYear,
            TotalQuotaAmount = totalQuota,
            TotalUsedAmount = totalUsed,
            TotalRemainingAmount = totalRemaining,
            OverallUsagePercent = overallPercent,
            TotalBenefitsCount = benefitItemsDto.Count,
            MaxedOutBenefitsCount = benefitItemsDto.Count(b => b.IsMaxedOut),
            Benefits = benefitItemsDto
        };
    }

    public async Task<List<EmployeeBenefitOverviewDto>> GetEmployeesBenefitOverviewAsync(int? year = null, string? search = null, CancellationToken cancellationToken = default)
    {
        int targetYear = year ?? DateTime.UtcNow.Year;

        var employeesQuery = _context.Employees
            .Include(e => e.Assignments)
                .ThenInclude(a => a.EmployeeType)
                    .ThenInclude(et => et!.EmployeeTypeBenefits)
                        .ThenInclude(etb => etb.BenefitItem)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Position)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            employeesQuery = employeesQuery.Where(e =>
                e.EmployeeCode.ToLower().Contains(s) ||
                (e.FirstName + " " + e.LastName).ToLower().Contains(s) ||
                e.Assignments.Any(a => a.IsCurrent && (
                    (a.Department != null && a.Department.DepartmentName.ToLower().Contains(s)) ||
                    (a.Position != null && a.Position.PositionName.ToLower().Contains(s))
                ))
            );
        }

        var employees = await employeesQuery
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync(cancellationToken);

        // Fetch all approved claims for all matching employees in targetYear
        var employeeIds = employees.Select(e => e.Id).ToList();
        var allClaims = await _context.EmployeeBenefitClaims
            .AsNoTracking()
            .Where(c => employeeIds.Contains(c.EmployeeId) && c.ClaimYear == targetYear && c.Status == "APPROVED")
            .Select(c => new EmployeeBenefitClaim { Id = c.Id, EmployeeId = c.EmployeeId, BenefitItemId = c.BenefitItemId, Amount = c.Amount, ClaimDate = c.ClaimDate })
            .ToListAsync(cancellationToken);

        var claimsByEmpAndBenefit = allClaims
            .GroupBy(c => new { c.EmployeeId, c.BenefitItemId })
            .ToDictionary(g => g.Key, g => g.ToList());

        var overviewList = new List<EmployeeBenefitOverviewDto>();

        foreach (var emp in employees)
        {
            var currentAssignment = emp.Assignments?.FirstOrDefault(a => a.IsCurrent) 
                ?? emp.Assignments?.FirstOrDefault();

            var empType = currentAssignment?.EmployeeType;
            var typeBenefits = empType?.EmployeeTypeBenefits?
                .Where(etb => etb.IsActive && etb.BenefitItem != null && etb.BenefitItem.Status == "ACTIVE")
                .ToList() ?? new List<EmployeeTypeBenefit>();

            var benefitItemsDto = new List<BenefitUsageItemDto>();

            foreach (var tb in typeBenefits)
            {
                var bItem = tb.BenefitItem;
                var key = new { EmployeeId = emp.Id, BenefitItemId = bItem.Id };
                var itemClaims = claimsByEmpAndBenefit.GetValueOrDefault(key, new List<EmployeeBenefitClaim>());

                decimal used = itemClaims.Sum(c => c.Amount);
                decimal quota = tb.CoverageAmount;
                decimal remaining = quota > 0 ? Math.Max(0, quota - used) : 0;
                decimal percentage = quota > 0 ? Math.Min(100, Math.Round((used / quota) * 100, 1)) : (used > 0 ? 100 : 0);
                bool isMaxed = quota > 0 && used >= quota;

                string statusText = "ได้รับสิทธิ์ตามระเบียบบริษัท";
                if (tb.Frequency == "YEARLY" || quota > 0)
                {
                    if (isMaxed)
                        statusText = "ใช้เต็มโควตาแล้ว (100%)";
                    else if (percentage >= 70)
                        statusText = $"ใกล้ครบโควตา ({percentage}%)";
                    else if (used > 0)
                        statusText = $"ยังไม่ครบโควตา ({percentage}%)";
                    else
                        statusText = "ยังไม่ได้ใช้สิทธิ์";
                }
                else if (bItem.Category == "ALLOWANCE")
                {
                    statusText = "คำนวณอัตโนมัติผ่านเงินเดือน";
                }

                benefitItemsDto.Add(new BenefitUsageItemDto
                {
                    BenefitItemId = bItem.Id,
                    BenefitCode = bItem.BenefitCode,
                    BenefitName = bItem.BenefitName,
                    Category = bItem.Category,
                    Description = bItem.Description,
                    PayoutType = bItem.PayoutType,
                    IsDocumentRequired = bItem.IsDocumentRequired,
                    QuotaAmount = quota,
                    Frequency = tb.Frequency,
                    UsedAmount = used,
                    RemainingAmount = remaining,
                    UsagePercentage = percentage,
                    IsMaxedOut = isMaxed,
                    StatusText = statusText,
                    ClaimCount = itemClaims.Count,
                    LastClaimDate = itemClaims.OrderByDescending(c => c.ClaimDate).Select(c => (DateOnly?)c.ClaimDate).FirstOrDefault()
                });
            }

            decimal totalQuota = benefitItemsDto.Where(b => b.Frequency == "YEARLY").Sum(b => b.QuotaAmount);
            decimal totalUsed = benefitItemsDto.Sum(b => b.UsedAmount);
            decimal totalRemaining = benefitItemsDto.Where(b => b.Frequency == "YEARLY").Sum(b => b.RemainingAmount);

            overviewList.Add(new EmployeeBenefitOverviewDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.FullName,
                DepartmentName = currentAssignment?.Department?.DepartmentName ?? "-",
                PositionTitle = currentAssignment?.Position?.PositionName ?? "-",
                EmployeeTypeName = empType?.TypeName ?? "-",
                Year = targetYear,
                TotalBenefitsCount = benefitItemsDto.Count,
                TotalQuota = totalQuota,
                TotalUsed = totalUsed,
                TotalRemaining = totalRemaining,
                Benefits = benefitItemsDto
            });
        }

        return overviewList;
    }

    public async Task<List<BenefitClaimDto>> GetEmployeeClaimsAsync(long employeeId, int? year = null, long? benefitItemId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.EmployeeBenefitClaims
            .AsNoTracking()
            .Where(c => c.EmployeeId == employeeId);

        if (year.HasValue)
        {
            query = query.Where(c => c.ClaimYear == year.Value);
        }

        if (benefitItemId.HasValue)
        {
            query = query.Where(c => c.BenefitItemId == benefitItemId.Value);
        }

        // projection — ไม่ดึงไฟล์ใบเสร็จ (file_data) มาในรายการ
        return await query
            .OrderByDescending(c => c.ClaimDate)
            .ThenByDescending(c => c.Id)
            .Select(c => new BenefitClaimDto
            {
                Id = c.Id,
                EmployeeId = c.EmployeeId,
                EmployeeCode = c.Employee.EmployeeCode,
                EmployeeName = ((c.Employee.Prefix ?? "") + " " + c.Employee.FirstName + " " + c.Employee.LastName).Trim(),
                BenefitItemId = c.BenefitItemId,
                BenefitCode = c.BenefitItem.BenefitCode,
                BenefitName = c.BenefitItem.BenefitName,
                Category = c.BenefitItem.Category,
                ClaimYear = c.ClaimYear,
                ClaimDate = c.ClaimDate,
                Amount = c.Amount,
                ReceiptNumber = c.ReceiptNumber,
                ServiceProvider = c.ServiceProvider,
                Remarks = c.Remarks,
                AttachmentFileName = c.AttachmentFileName ?? c.FileName,
                AttachmentUrl = c.AttachmentUrl,
                Status = c.Status,
                ApprovedByName = c.ApprovedByEmployee != null
                    ? ((c.ApprovedByEmployee.Prefix ?? "") + " " + c.ApprovedByEmployee.FirstName + " " + c.ApprovedByEmployee.LastName).Trim()
                    : (c.ApprovedByUser != null ? c.ApprovedByUser.Username : null),
                ApprovedAt = c.ApprovedAt,
                CreatedAt = c.CreatedAt,
                RequestNo = c.RequestNo,
                RejectReason = c.RejectReason,
                FileName = c.FileName,
                IsSelfRequest = c.RequestedByEmployeeId != null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<BenefitClaimDto> CreateClaimAsync(CreateBenefitClaimRequest request, long? approvedByUserId = null, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
            throw new ValidationException("จำนวนเงินที่ใช้สิทธิ์ต้องมากกว่า 0 บาท");

        var employee = await _context.Employees
            .Include(e => e.Assignments)
                .ThenInclude(a => a.EmployeeType)
                    .ThenInclude(et => et!.EmployeeTypeBenefits)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);

        if (employee == null)
            throw new NotFoundException($"ไม่พบข้อมูลพนักงานรหัส ID: {request.EmployeeId}");

        var benefitItem = await _context.BenefitItems
            .FirstOrDefaultAsync(b => b.Id == request.BenefitItemId, cancellationToken);

        if (benefitItem == null)
            throw new NotFoundException($"ไม่พบข้อมูลสิทธิประโยชน์รหัส ID: {request.BenefitItemId}");

        if (benefitItem.IsDocumentRequired && string.IsNullOrWhiteSpace(request.AttachmentFileName) && string.IsNullOrWhiteSpace(request.AttachmentUrl))
        {
            throw new ValidationException("สวัสดิการประเภทนี้ บังคับแนบเอกสารประกอบหรือใบรับรองแพทย์");
        }

        int claimYear = request.ClaimYear ?? DateTime.UtcNow.Year;
        DateOnly claimDate = request.ClaimDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Check quota limit if configured
        var currentAssignment = employee.Assignments?.FirstOrDefault(a => a.IsCurrent) 
            ?? employee.Assignments?.FirstOrDefault();
        var empTypeBenefit = currentAssignment?.EmployeeType?.EmployeeTypeBenefits?
            .FirstOrDefault(etb => etb.BenefitItemId == request.BenefitItemId && etb.IsActive);

        if (empTypeBenefit != null && empTypeBenefit.CoverageAmount > 0)
        {
            var alreadyUsed = await _context.EmployeeBenefitClaims
                .Where(c => c.EmployeeId == request.EmployeeId && c.BenefitItemId == request.BenefitItemId && c.ClaimYear == claimYear && (c.Status == "APPROVED" || c.Status == "PENDING"))
                .SumAsync(c => c.Amount, cancellationToken);

            decimal remaining = empTypeBenefit.CoverageAmount - alreadyUsed;
            if (request.Amount > remaining)
            {
                throw new ValidationException($"ยอดขอใช้สิทธิ์ ({request.Amount:N2} บาท) เกินวงเงินโควตาคงเหลือ (โควตาคงเหลือ: {Math.Max(0, remaining):N2} บาท จากวงเงินทั้งหมด {empTypeBenefit.CoverageAmount:N2} บาท)");
            }
        }

        var claim = new EmployeeBenefitClaim
        {
            EmployeeId = request.EmployeeId,
            BenefitItemId = request.BenefitItemId,
            ClaimYear = claimYear,
            ClaimDate = claimDate,
            Amount = request.Amount,
            ReceiptNumber = request.ReceiptNumber?.Trim(),
            ServiceProvider = request.ServiceProvider?.Trim(),
            Remarks = request.Remarks?.Trim(),
            AttachmentFileName = request.AttachmentFileName?.Trim(),
            AttachmentUrl = request.AttachmentUrl?.Trim(),
            Status = "APPROVED",
            ApprovedByUserId = approvedByUserId,
            ApprovedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.EmployeeBenefitClaims.Add(claim);
        await _context.SaveChangesAsync(cancellationToken);

        return new BenefitClaimDto
        {
            Id = claim.Id,
            EmployeeId = claim.EmployeeId,
            EmployeeCode = employee.EmployeeCode,
            EmployeeName = employee.FullName,
            BenefitItemId = benefitItem.Id,
            BenefitCode = benefitItem.BenefitCode,
            BenefitName = benefitItem.BenefitName,
            Category = benefitItem.Category,
            ClaimYear = claim.ClaimYear,
            ClaimDate = claim.ClaimDate,
            Amount = claim.Amount,
            ReceiptNumber = claim.ReceiptNumber,
            ServiceProvider = claim.ServiceProvider,
            Remarks = claim.Remarks,
            AttachmentFileName = claim.AttachmentFileName,
            AttachmentUrl = claim.AttachmentUrl,
            Status = claim.Status,
            ApprovedAt = claim.ApprovedAt,
            CreatedAt = claim.CreatedAt
        };
    }

    public async Task<bool> DeleteClaimAsync(long claimId, CancellationToken cancellationToken = default)
    {
        var claim = await _context.EmployeeBenefitClaims.FirstOrDefaultAsync(c => c.Id == claimId, cancellationToken);
        if (claim == null)
            throw new NotFoundException($"ไม่พบรายการเบิกสวัสดิการรหัส ID: {claimId}");

        // คำขอที่ยังค้างในสายการอนุมัติ → ปิดสายด้วย ไม่ให้ค้างในคิวผู้อนุมัติ
        if (claim.ApprovalInstanceId.HasValue)
        {
            var instance = await _context.ApprovalInstances
                .FirstOrDefaultAsync(i => i.Id == claim.ApprovalInstanceId.Value, cancellationToken);
            if (instance != null && instance.Status == "PENDING")
            {
                instance.Status = "CANCELLED";
                instance.CompletedAt = DateTime.UtcNow;
            }
        }

        _context.EmployeeBenefitClaims.Remove(claim);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

