using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Services;
using Hrms.Application.Features.MasterData.Services;
using Hrms.Application.Features.Payroll.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Payroll.Services;

public class SalaryService : ISalaryService
{
    private readonly IHrmsDbContext _context;
    private readonly IAttendanceDailyService _attendanceDailyService;
    private readonly ICurrentUserService _currentUser;
    private readonly IAesEncryptionService _crypto;

    public SalaryService(IHrmsDbContext context, IAttendanceDailyService attendanceDailyService,
        ICurrentUserService currentUser, IAesEncryptionService crypto)
    {
        _context = context;
        _attendanceDailyService = attendanceDailyService;
        _currentUser = currentUser;
        _crypto = crypto;
    }

    /// <summary>เลขบัญชีเต็มเห็นได้เฉพาะการเงิน/ผู้อนุมัติ (คนโอนเงิน) — HR เห็นแบบ xxxxxx1234</summary>
    private string AccountForViewer(string? accountNumber)
    {
        if (string.IsNullOrEmpty(accountNumber)) return string.Empty;
        return PayrollAccess.IsFinance(_currentUser) || PayrollAccess.IsApprover(_currentUser)
            ? accountNumber
            : _crypto.MaskAccountNumber(accountNumber);
    }

    /// <summary>
    /// ดึงรายการ ID ของพนักงานที่ผู้ใช้ปัจจุบันมีสิทธิ์ดูข้อมูลเงินเดือนตาม Data Scope
    /// คืนค่า null หากมีสิทธิ์ระดับทั้งองค์กร (ORGANIZATION หรือ ADMIN/SYSTEM_SUPER)
    /// </summary>
    private async Task<List<long>?> GetPermittedEmployeeIdsAsync(CancellationToken cancellationToken)
    {
        if (_currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER"))
            return null;

        string scope = _currentUser.GetDataScope("PAYROLL_VIEW");
        if (string.Equals(scope, "ORGANIZATION", StringComparison.OrdinalIgnoreCase))
            return null;

        long? myEmpId = _currentUser.EmployeeId;
        long? myDeptId = _currentUser.DepartmentId;

        if (!myDeptId.HasValue && myEmpId.HasValue)
        {
            myDeptId = await _context.EmployeeAssignments
                .Where(a => a.EmployeeId == myEmpId.Value && a.IsCurrent)
                .Select(a => (long?)a.DepartmentId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        switch (scope?.ToUpperInvariant())
        {
            case "SELF":
                return myEmpId.HasValue ? new List<long> { myEmpId.Value } : new List<long>();

            case "TEAM":
            case "DEPARTMENT":
            {
                if (!myDeptId.HasValue)
                    return myEmpId.HasValue ? new List<long> { myEmpId.Value } : new List<long>();

                return await _context.EmployeeAssignments
                    .Where(a => a.DepartmentId == myDeptId.Value && a.IsCurrent)
                    .Select(a => a.EmployeeId)
                    .Distinct()
                    .ToListAsync(cancellationToken);
            }

            case "DIVISION":
            {
                long? myDivId = _currentUser.DivisionId;
                if (!myDivId.HasValue)
                    return myEmpId.HasValue ? new List<long> { myEmpId.Value } : new List<long>();

                return await _context.EmployeeAssignments
                    .Where(a => a.DivisionId == myDivId.Value && a.IsCurrent)
                    .Select(a => a.EmployeeId)
                    .Distinct()
                    .ToListAsync(cancellationToken);
            }

            default:
                return null;
        }
    }

    #region Salary Structures

    public async Task<List<SalaryStructureDto>> GetAllStructuresAsync(long? positionId, long? levelId, CancellationToken cancellationToken = default)
    {
        var query = _context.SalaryStructures
            .Include(s => s.Position)
            .Include(s => s.EmployeeLevel)
            .AsNoTracking()
            .AsQueryable();

        if (positionId.HasValue)
        {
            query = query.Where(s => s.PositionId == positionId.Value);
        }

        if (levelId.HasValue)
        {
            query = query.Where(s => s.EmployeeLevelId == levelId.Value);
        }

        var list = await query
            .OrderBy(s => s.PositionId)
            .ThenBy(s => s.EmployeeLevelId)
            .ToListAsync(cancellationToken);

        return list.Select(MapToDto).ToList();
    }

    public async Task<SalaryStructureDto> GetStructureByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SalaryStructures
            .Include(s => s.Position)
            .Include(s => s.EmployeeLevel)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException("SalaryStructure", id);
        }

        return MapToDto(entity);
    }

    public async Task<SalaryStructureDto> CreateStructureAsync(CreateSalaryStructureRequest request, CancellationToken cancellationToken = default)
    {
        ValidateStructure(request.MinSalary, request.MaxSalary, request.DefaultSalary, request.EffectiveFrom, request.EffectiveTo);

        if (request.PositionId.HasValue)
        {
            var posExists = await _context.Positions.AnyAsync(p => p.Id == request.PositionId.Value, cancellationToken);
            if (!posExists) throw new NotFoundException("Position", request.PositionId.Value);
        }

        if (request.EmployeeLevelId.HasValue)
        {
            var levelExists = await _context.EmployeeLevels.AnyAsync(l => l.Id == request.EmployeeLevelId.Value, cancellationToken);
            if (!levelExists) throw new NotFoundException("EmployeeLevel", request.EmployeeLevelId.Value);
        }

        var entity = new SalaryStructure
        {
            PositionId = request.PositionId,
            EmployeeLevelId = request.EmployeeLevelId,
            MinSalary = request.MinSalary,
            MaxSalary = request.MaxSalary,
            DefaultSalary = request.DefaultSalary,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            ApprovalLimit = request.ApprovalLimit,
            PositionAllowance = request.PositionAllowance,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status
        };

        _context.SalaryStructures.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetStructureByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<SalaryStructureDto> UpdateStructureAsync(long id, UpdateSalaryStructureRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SalaryStructures.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new NotFoundException("SalaryStructure", id);
        }

        ValidateStructure(request.MinSalary, request.MaxSalary, request.DefaultSalary, request.EffectiveFrom, request.EffectiveTo);

        if (request.PositionId.HasValue)
        {
            var posExists = await _context.Positions.AnyAsync(p => p.Id == request.PositionId.Value, cancellationToken);
            if (!posExists) throw new NotFoundException("Position", request.PositionId.Value);
        }

        if (request.EmployeeLevelId.HasValue)
        {
            var levelExists = await _context.EmployeeLevels.AnyAsync(l => l.Id == request.EmployeeLevelId.Value, cancellationToken);
            if (!levelExists) throw new NotFoundException("EmployeeLevel", request.EmployeeLevelId.Value);
        }

        entity.PositionId = request.PositionId;
        entity.EmployeeLevelId = request.EmployeeLevelId;
        entity.MinSalary = request.MinSalary;
        entity.MaxSalary = request.MaxSalary;
        entity.DefaultSalary = request.DefaultSalary;
        entity.EffectiveFrom = request.EffectiveFrom;
        entity.EffectiveTo = request.EffectiveTo;
        entity.ApprovalLimit = request.ApprovalLimit;
        entity.PositionAllowance = request.PositionAllowance;
        entity.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetStructureByIdAsync(entity.Id, cancellationToken);
    }

    public async Task DeleteStructureAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SalaryStructures.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new NotFoundException("SalaryStructure", id);
        }

        _context.SalaryStructures.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateStructure(decimal min, decimal max, decimal? def, DateOnly from, DateOnly? to)
    {
        if (min < 0)
        {
            throw new BusinessRuleException("เงินเดือนขั้นต่ำต้องไม่น้อยกว่า 0");
        }
        if (max < min)
        {
            throw new BusinessRuleException("เงินเดือนเพดานสูงสุดต้องมากกว่าหรือเท่ากับเงินเดือนขั้นต่ำ");
        }
        if (def.HasValue && (def.Value < min || def.Value > max))
        {
            throw new BusinessRuleException($"เงินเดือนเริ่มต้น ({def.Value:N2}) ต้องอยู่ระหว่างขั้นต่ำ ({min:N2}) และสูงสุด ({max:N2})");
        }
        if (to.HasValue && to.Value < from)
        {
            throw new BusinessRuleException("วันที่มีผลสิ้นสุดต้องไม่น้อยกว่าวันที่มีผลเริ่มต้น");
        }
    }

    private static SalaryStructureDto MapToDto(SalaryStructure s)
    {
        return new SalaryStructureDto
        {
            Id = s.Id,
            PositionId = s.PositionId,
            PositionName = s.Position?.PositionName,
            EmployeeLevelId = s.EmployeeLevelId,
            LevelName = s.EmployeeLevel?.LevelName,
            MinSalary = s.MinSalary,
            MaxSalary = s.MaxSalary,
            DefaultSalary = s.DefaultSalary,
            EffectiveFrom = s.EffectiveFrom,
            EffectiveTo = s.EffectiveTo,
            ApprovalLimit = s.ApprovalLimit,
            PositionAllowance = s.PositionAllowance,
            Status = s.Status
        };
    }

    #endregion

    #region Tax Brackets

    public async Task<List<TaxBracketDto>> GetTaxBracketsAsync(CancellationToken cancellationToken = default)
    {
        var list = await _context.TaxBrackets
            .AsNoTracking()
            .OrderBy(t => t.IncomeFrom)
            .ToListAsync(cancellationToken);

        return list.Select(t => new TaxBracketDto
        {
            Id = t.Id,
            BracketName = t.BracketName,
            IncomeFrom = t.IncomeFrom,
            IncomeTo = t.IncomeTo,
            TaxRate = t.TaxRate,
            BaseTaxAmount = t.BaseTaxAmount,
            EffectiveFrom = t.EffectiveFrom,
            EffectiveTo = t.EffectiveTo,
            Status = t.Status
        }).ToList();
    }

    public async Task<TaxBracketDto> UpdateTaxBracketAsync(long id, UpdateTaxBracketRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.TaxBrackets.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new NotFoundException("TaxBracket", id);
        }

        if (request.IncomeFrom < 0)
        {
            throw new BusinessRuleException("รายได้เริ่มต้นต้องไม่น้อยกว่า 0");
        }
        if (request.IncomeTo.HasValue && request.IncomeTo.Value < request.IncomeFrom)
        {
            throw new BusinessRuleException("รายได้สิ้นสุดต้องมากกว่ารายได้เริ่มต้น");
        }
        if (request.TaxRate < 0 || request.TaxRate > 1)
        {
            throw new BusinessRuleException("อัตราภาษีต้องอยู่ระหว่าง 0 ถึง 1 (เช่น 0.05 สำหรับ 5%)");
        }

        entity.BracketName = request.BracketName;
        entity.IncomeFrom = request.IncomeFrom;
        entity.IncomeTo = request.IncomeTo;
        entity.TaxRate = request.TaxRate;
        entity.BaseTaxAmount = request.BaseTaxAmount;
        entity.EffectiveFrom = request.EffectiveFrom;
        entity.EffectiveTo = request.EffectiveTo;
        entity.Status = request.Status;

        await _context.SaveChangesAsync(cancellationToken);

        return new TaxBracketDto
        {
            Id = entity.Id,
            BracketName = entity.BracketName,
            IncomeFrom = entity.IncomeFrom,
            IncomeTo = entity.IncomeTo,
            TaxRate = entity.TaxRate,
            BaseTaxAmount = entity.BaseTaxAmount,
            EffectiveFrom = entity.EffectiveFrom,
            EffectiveTo = entity.EffectiveTo,
            Status = entity.Status
        };
    }

    public async Task<List<TaxBracketDto>> BatchUpdateTaxBracketsAsync(BatchUpdateTaxBracketsRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Brackets == null || request.Brackets.Count == 0)
        {
            throw new BusinessRuleException("ต้องมีข้อมูลขั้นบันไดภาษีอย่างน้อย 1 ขั้น");
        }

        var sorted = request.Brackets.OrderBy(b => b.IncomeFrom).ToList();

        // 1. Validation กฎหมายภาษีและความต่อเนื่อง
        if (sorted[0].IncomeFrom != 0)
        {
            throw new BusinessRuleException("ขั้นแรกต้องเริ่มต้นที่ 0 บาทเสมอ");
        }

        decimal runningBaseTax = 0;
        for (int i = 0; i < sorted.Count; i++)
        {
            var b = sorted[i];

            // Normalize TaxRate
            if (b.TaxRate > 1.0m)
            {
                b.TaxRate = Math.Round(b.TaxRate / 100.0m, 4);
            }

            if (b.TaxRate < 0 || b.TaxRate > 1.0m)
            {
                throw new BusinessRuleException($"อัตราภาษีของขั้นที่ {i + 1} ต้องอยู่ระหว่าง 0% ถึง 100%");
            }

            if (i > 0 && b.TaxRate < sorted[i - 1].TaxRate)
            {
                throw new BusinessRuleException($"อัตราภาษีแบบก้าวหน้าต้องไม่ลดลง (ขั้นที่ {i + 1} ต่ำกว่าขั้นที่ {i})");
            }

            // คำนวณ BaseTaxAmount อัตโนมัติเพื่อความถูกต้อง
            if (i == 0)
            {
                b.BaseTaxAmount = 0;
            }
            else
            {
                var prev = sorted[i - 1];
                if (!prev.IncomeTo.HasValue)
                {
                    throw new BusinessRuleException($"ขั้นก่อนหน้า (ขั้นที่ {i}) ต้องมีเพดานเงินได้สิ้นสุด");
                }

                decimal prevRange = prev.IncomeTo.Value - Math.Floor(prev.IncomeFrom);
                runningBaseTax += Math.Round(prevRange * prev.TaxRate, 2);
                b.BaseTaxAmount = runningBaseTax;
            }

            if (i < sorted.Count - 1)
            {
                if (!b.IncomeTo.HasValue)
                {
                    throw new BusinessRuleException($"ขั้นที่ {i + 1} ต้องระบุเพดานเงินได้สิ้นสุด (เฉพาะขั้นสุดท้ายเท่านั้นที่ไม่จำกัดเพดาน)");
                }
                if (b.IncomeTo.Value <= b.IncomeFrom)
                {
                    throw new BusinessRuleException($"ขั้นที่ {i + 1}: เงินได้สิ้นสุดต้องมากกว่าเงินได้เริ่มต้น");
                }

                var next = sorted[i + 1];
                if (Math.Floor(next.IncomeFrom) != Math.Floor(b.IncomeTo.Value))
                {
                    throw new BusinessRuleException($"ช่วงเงินได้ต้องต่อเนื่องกัน: ขั้นที่ {i + 2} เริ่มต้น ฿{next.IncomeFrom:N2} ไม่ตรงกับขั้นที่ {i + 1} สิ้นสุด ฿{b.IncomeTo.Value:N2}");
                }
            }
        }

        // 2. ลบขั้นบันไดเดิม แล้วสร้างใหม่ตามที่ผู้ใช้กำหนด
        var existingEntities = await _context.TaxBrackets.ToListAsync(cancellationToken);
        _context.TaxBrackets.RemoveRange(existingEntities);

        foreach (var b in sorted)
        {
            _context.TaxBrackets.Add(new TaxBracket
            {
                BracketName = b.BracketName,
                IncomeFrom = b.IncomeFrom,
                IncomeTo = b.IncomeTo,
                TaxRate = b.TaxRate,
                BaseTaxAmount = b.BaseTaxAmount,
                EffectiveFrom = b.EffectiveFrom != default ? b.EffectiveFrom : DateOnly.FromDateTime(DateTime.UtcNow),
                EffectiveTo = b.EffectiveTo,
                Status = b.Status ?? "ACTIVE"
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetTaxBracketsAsync(cancellationToken);
    }

    public async Task<List<TaxBracketDto>> ResetTaxBracketsToDefaultAsync(CancellationToken cancellationToken = default)
    {
        var existingEntities = await _context.TaxBrackets.ToListAsync(cancellationToken);
        _context.TaxBrackets.RemoveRange(existingEntities);

        var defaults = new List<TaxBracket>
        {
            new() { BracketName = "ขั้นที่ 1 (0 - 150,000 บาท ยกเว้นภาษี)", IncomeFrom = 0.00m, IncomeTo = 150000.00m, TaxRate = 0.00m, BaseTaxAmount = 0.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 2 (150,001 - 300,000 บาท ภาษี 5%)", IncomeFrom = 150000.01m, IncomeTo = 300000.00m, TaxRate = 0.05m, BaseTaxAmount = 0.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 3 (300,001 - 500,000 บาท ภาษี 10%)", IncomeFrom = 300000.01m, IncomeTo = 500000.00m, TaxRate = 0.10m, BaseTaxAmount = 7500.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 4 (500,001 - 750,000 บาท ภาษี 15%)", IncomeFrom = 500000.01m, IncomeTo = 750000.00m, TaxRate = 0.15m, BaseTaxAmount = 27500.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 5 (750,001 - 1,000,000 บาท ภาษี 20%)", IncomeFrom = 750000.01m, IncomeTo = 1000000.00m, TaxRate = 0.20m, BaseTaxAmount = 65000.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 6 (1,000,001 - 2,000,000 บาท ภาษี 25%)", IncomeFrom = 1000000.01m, IncomeTo = 2000000.00m, TaxRate = 0.25m, BaseTaxAmount = 115000.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 7 (2,000,001 - 5,000,000 บาท ภาษี 30%)", IncomeFrom = 2000000.01m, IncomeTo = 5000000.00m, TaxRate = 0.30m, BaseTaxAmount = 365000.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" },
            new() { BracketName = "ขั้นที่ 8 (5,000,001 บาทขึ้นไป ภาษี 35%)", IncomeFrom = 5000000.01m, IncomeTo = null, TaxRate = 0.35m, BaseTaxAmount = 1265000.00m, EffectiveFrom = new DateOnly(2024, 1, 1), Status = "ACTIVE" }
        };

        _context.TaxBrackets.AddRange(defaults);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetTaxBracketsAsync(cancellationToken);
    }

    #endregion

    #region Social Security Rates

    public async Task<List<SocialSecurityRateDto>> GetSocialSecurityRatesAsync(CancellationToken cancellationToken = default)
    {
        var list = await _context.SocialSecurityRates
            .AsNoTracking()
            .OrderByDescending(r => r.EffectiveFrom)
            .ToListAsync(cancellationToken);

        return list.Select(r => new SocialSecurityRateDto
        {
            Id = r.Id,
            RateName = r.RateName,
            EmployeeContributionPercent = r.EmployeeContributionPercent,
            EmployerContributionPercent = r.EmployerContributionPercent,
            MinWageBaseAmount = r.MinWageBaseAmount,
            MaxWageBaseAmount = r.MaxWageBaseAmount,
            EffectiveFrom = r.EffectiveFrom,
            EffectiveTo = r.EffectiveTo,
            Status = r.Status
        }).ToList();
    }

    public async Task<SocialSecurityRateDto> UpdateSocialSecurityRateAsync(long id, UpdateSocialSecurityRateRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SocialSecurityRates.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            throw new NotFoundException("SocialSecurityRate", id);
        }

        decimal empPercent = request.EmployeeContributionPercent;
        if (empPercent >= 1.0m) // ค่าตั้งแต่ 1 ขึ้นไปถือเป็นเปอร์เซ็นต์ (เช่น 1 = 1%, 5 = 5%)
        {
            empPercent = Math.Round(empPercent / 100.0m, 4);
        }

        decimal compPercent = request.EmployerContributionPercent;
        if (compPercent >= 1.0m)
        {
            compPercent = Math.Round(compPercent / 100.0m, 4);
        }

        if (empPercent < 0 || empPercent > 1.0m)
        {
            throw new BusinessRuleException("อัตราสมทบผู้ประกันตนต้องอยู่ระหว่าง 0 ถึง 1 หรือ 0% ถึง 100% (เช่น 5% หรือ 0.05)");
        }
        if (compPercent < 0 || compPercent > 1.0m)
        {
            throw new BusinessRuleException("อัตราสมทบนายจ้างต้องอยู่ระหว่าง 0 ถึง 1 หรือ 0% ถึง 100% (เช่น 5% หรือ 0.05)");
        }
        if (request.MinWageBaseAmount < 0)
        {
            throw new BusinessRuleException("ฐานค่าจ้างขั้นต่ำต้องไม่ติดลบ");
        }
        if (request.MaxWageBaseAmount < request.MinWageBaseAmount)
        {
            throw new BusinessRuleException("เพดานค่าจ้างสูงสุดต้องมากกว่าหรือเท่ากับฐานค่าจ้างขั้นต่ำ");
        }

        entity.RateName = string.IsNullOrWhiteSpace(request.RateName) ? "อัตราเงินสมทบกองทุนประกันสังคม" : request.RateName.Trim();
        entity.EmployeeContributionPercent = empPercent;
        entity.EmployerContributionPercent = compPercent;
        entity.MinWageBaseAmount = request.MinWageBaseAmount;
        entity.MaxWageBaseAmount = request.MaxWageBaseAmount;
        entity.EffectiveFrom = request.EffectiveFrom;
        entity.EffectiveTo = request.EffectiveTo;
        entity.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.ToUpper();

        await _context.SaveChangesAsync(cancellationToken);

        return new SocialSecurityRateDto
        {
            Id = entity.Id,
            RateName = entity.RateName,
            EmployeeContributionPercent = entity.EmployeeContributionPercent,
            EmployerContributionPercent = entity.EmployerContributionPercent,
            MinWageBaseAmount = entity.MinWageBaseAmount,
            MaxWageBaseAmount = entity.MaxWageBaseAmount,
            EffectiveFrom = entity.EffectiveFrom,
            EffectiveTo = entity.EffectiveTo,
            Status = entity.Status
        };
    }

    public async Task<SocialSecurityRateDto> CreateSocialSecurityRateAsync(CreateSocialSecurityRateRequest request, CancellationToken cancellationToken = default)
    {
        decimal empPercent = request.EmployeeContributionPercent;
        if (empPercent >= 1.0m) // ค่าตั้งแต่ 1 ขึ้นไปถือเป็นเปอร์เซ็นต์ (เช่น 1 = 1%, 5 = 5%)
        {
            empPercent = Math.Round(empPercent / 100.0m, 4);
        }

        decimal compPercent = request.EmployerContributionPercent;
        if (compPercent >= 1.0m)
        {
            compPercent = Math.Round(compPercent / 100.0m, 4);
        }

        if (empPercent < 0 || empPercent > 1.0m)
        {
            throw new BusinessRuleException("อัตราสมทบผู้ประกันตนต้องอยู่ระหว่าง 0 ถึง 1 หรือ 0% ถึง 100% (เช่น 5% หรือ 0.05)");
        }
        if (compPercent < 0 || compPercent > 1.0m)
        {
            throw new BusinessRuleException("อัตราสมทบนายจ้างต้องอยู่ระหว่าง 0 ถึง 1 หรือ 0% ถึง 100% (เช่น 5% หรือ 0.05)");
        }
        if (request.MinWageBaseAmount < 0)
        {
            throw new BusinessRuleException("ฐานค่าจ้างขั้นต่ำต้องไม่ติดลบ");
        }
        if (request.MaxWageBaseAmount < request.MinWageBaseAmount)
        {
            throw new BusinessRuleException("เพดานค่าจ้างสูงสุดต้องมากกว่าหรือเท่ากับฐานค่าจ้างขั้นต่ำ");
        }

        var entity = new SocialSecurityRate
        {
            RateName = string.IsNullOrWhiteSpace(request.RateName) ? "อัตราเงินสมทบกองทุนประกันสังคม" : request.RateName.Trim(),
            EmployeeContributionPercent = empPercent,
            EmployerContributionPercent = compPercent,
            MinWageBaseAmount = request.MinWageBaseAmount,
            MaxWageBaseAmount = request.MaxWageBaseAmount,
            EffectiveFrom = request.EffectiveFrom == default ? new DateOnly(DateTime.UtcNow.Year, 1, 1) : request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.ToUpper()
        };

        _context.SocialSecurityRates.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return new SocialSecurityRateDto
        {
            Id = entity.Id,
            RateName = entity.RateName,
            EmployeeContributionPercent = entity.EmployeeContributionPercent,
            EmployerContributionPercent = entity.EmployerContributionPercent,
            MinWageBaseAmount = entity.MinWageBaseAmount,
            MaxWageBaseAmount = entity.MaxWageBaseAmount,
            EffectiveFrom = entity.EffectiveFrom,
            EffectiveTo = entity.EffectiveTo,
            Status = entity.Status
        };
    }

    public async Task<List<SocialSecurityRateDto>> ResetSocialSecurityRatesToDefaultAsync(CancellationToken cancellationToken = default)
    {
        var existing = await _context.SocialSecurityRates.ToListAsync(cancellationToken);
        if (existing.Count > 0)
        {
            _context.SocialSecurityRates.RemoveRange(existing);
        }

        // ค่ามาตรฐานตามกฎหมาย: เก็บประวัติไว้ เพื่อให้รอบเงินเดือนย้อนหลังคำนวณด้วยอัตราที่ถูกต้อง
        // - ถึง 31 ธ.ค. 2568: ฐานค่าจ้าง 1,650 - 15,000 บาท (สูงสุด 750 บาท)
        // - ตั้งแต่ 1 ม.ค. 2569: ฐานค่าจ้าง 1,650 - 17,500 บาท (สูงสุด 875 บาท)
        _context.SocialSecurityRates.Add(new SocialSecurityRate
        {
            RateName = "อัตราเงินสมทบกองทุนประกันสังคม (มาตรา 33) เพดาน 15,000 บาท",
            EmployeeContributionPercent = 0.0500m,
            EmployerContributionPercent = 0.0500m,
            MinWageBaseAmount = 1650.00m,
            MaxWageBaseAmount = 15000.00m,
            EffectiveFrom = new DateOnly(2024, 1, 1),
            EffectiveTo = new DateOnly(2025, 12, 31),
            Status = "ACTIVE"
        });
        _context.SocialSecurityRates.Add(new SocialSecurityRate
        {
            RateName = "อัตราเงินสมทบกองทุนประกันสังคม (มาตรา 33) เพดาน 17,500 บาท",
            EmployeeContributionPercent = 0.0500m,
            EmployerContributionPercent = 0.0500m,
            MinWageBaseAmount = 1650.00m,
            MaxWageBaseAmount = 17500.00m,
            EffectiveFrom = new DateOnly(2026, 1, 1),
            EffectiveTo = null,
            Status = "ACTIVE"
        });
        await _context.SaveChangesAsync(cancellationToken);

        return await GetSocialSecurityRatesAsync(cancellationToken);
    }

    #endregion

    #region Employee Salaries

    public async Task<List<EmployeeSalaryOverviewDto>> GetEmployeeSalariesOverviewAsync(string? search, long? departmentId, CancellationToken cancellationToken = default)
    {
        var query = _context.Employees
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Position)
                    .ThenInclude(p => p.EmployeeLevel)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.EmployeeLevel)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(e =>
                e.EmployeeCode.ToLower().Contains(searchLower) ||
                (e.FirstName + " " + e.LastName).ToLower().Contains(searchLower));
        }

        if (departmentId.HasValue)
        {
            query = query.Where(e => e.Assignments.Any(a => a.DepartmentId == departmentId.Value && a.IsCurrent));
        }

        var permittedIds = await GetPermittedEmployeeIdsAsync(cancellationToken);
        if (permittedIds != null)
        {
            query = query.Where(e => permittedIds.Contains(e.Id));
        }

        var employees = await query.OrderBy(e => e.EmployeeCode).ToListAsync(cancellationToken);
        var employeeIds = employees.Select(e => e.Id).ToList();

        // Load all salary records for these employees
        var allSalaries = await _context.EmployeeSalaries
            .Where(s => employeeIds.Contains(s.EmployeeId))
            .AsNoTracking()
            .OrderByDescending(s => s.EffectiveFrom)
            .ToListAsync(cancellationToken);

        // Load salary structures for Min/Max reference
        var structures = await _context.SalaryStructures.AsNoTracking().ToListAsync(cancellationToken);

        var result = new List<EmployeeSalaryOverviewDto>();

        foreach (var emp in employees)
        {
            var activeAssignment = emp.Assignments.FirstOrDefault(a => a.IsCurrent) ?? emp.Assignments.FirstOrDefault();
            var empSalaries = allSalaries.Where(s => s.EmployeeId == emp.Id).ToList();
            var currentSalary = empSalaries.FirstOrDefault(s => s.EffectiveTo == null) ?? empSalaries.FirstOrDefault();

            // Find matching salary structure
            SalaryStructure? matchingStructure = null;
            if (activeAssignment != null)
            {
                var levelId = activeAssignment.EmployeeLevelId ?? activeAssignment.Position?.EmployeeLevelId;

                if (activeAssignment.PositionId != 0 && levelId.HasValue)
                {
                    matchingStructure = structures.FirstOrDefault(s =>
                        s.PositionId == activeAssignment.PositionId &&
                        s.EmployeeLevelId == levelId.Value);
                }

                if (matchingStructure == null && activeAssignment.PositionId != 0)
                {
                    matchingStructure = structures.FirstOrDefault(s => s.PositionId == activeAssignment.PositionId);
                }

                if (matchingStructure == null && levelId.HasValue)
                {
                    matchingStructure = structures.FirstOrDefault(s => s.EmployeeLevelId == levelId.Value);
                }
            }

            // ถ้ากำหนดฐานเงินเดือนปัจจุบันแล้ว แต่ต่ำกว่าโครงสร้างเงินเดือนขั้นต่ำของตำแหน่ง/ระดับ (เช่น เลื่อนตำแหน่ง/เปลี่ยนระดับงาน)
            // ให้ปรับฐานเงินเดือนปัจจุบันให้เท่ากับขั้นต่ำของโครงสร้างเงินเดือนโดยอัตโนมัติ
            if (currentSalary != null && matchingStructure != null && matchingStructure.MinSalary > 0 && currentSalary.BaseSalary < matchingStructure.MinSalary)
            {
                var newMin = matchingStructure.MinSalary;
                await _context.EmployeeSalaries
                    .Where(s => s.Id == currentSalary.Id)
                    .ExecuteUpdateAsync(setter => setter
                        .SetProperty(s => s.BaseSalary, newMin)
                        .SetProperty(s => s.Reason, s => string.IsNullOrEmpty(s.Reason)
                            ? $"ปรับฐานเงินเดือนตามโครงสร้างขั้นต่ำ ({newMin:N0} บาท)"
                            : s.Reason + $" (ปรับขั้นต่ำตามตำแหน่ง/ระดับ {newMin:N0} บาท)"),
                        cancellationToken);

                currentSalary.BaseSalary = newMin;
            }

            result.Add(new EmployeeSalaryOverviewDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.FullName,
                DepartmentName = activeAssignment?.Department?.DepartmentName,
                PositionName = activeAssignment?.Position?.PositionName,
                LevelName = activeAssignment?.EmployeeLevel?.LevelName,
                CurrentSalary = currentSalary?.BaseSalary,
                CurrentEffectiveFrom = currentSalary?.EffectiveFrom,
                SalaryStructureMin = matchingStructure?.MinSalary,
                SalaryStructureMax = matchingStructure?.MaxSalary,
                SalaryRecordCount = empSalaries.Count
            });
        }

        return result;
    }

    public async Task<List<EmployeeSalaryDto>> GetEmployeeSalaryHistoryAsync(long employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", employeeId);
        }

        var permittedIds = await GetPermittedEmployeeIdsAsync(cancellationToken);
        if (permittedIds != null && !permittedIds.Contains(employeeId))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์ดูข้อมูลเงินเดือนของพนักงานท่านนี้");
        }

        var activeAssignment = employee.Assignments.FirstOrDefault(a => a.IsCurrent) ?? employee.Assignments.FirstOrDefault();

        var salaries = await _context.EmployeeSalaries
            .Include(s => s.ApprovedByEmployee)
            .Where(s => s.EmployeeId == employeeId)
            .OrderByDescending(s => s.EffectiveFrom)
            .ThenByDescending(s => s.CreatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return salaries.Select(s => new EmployeeSalaryDto
        {
            Id = s.Id,
            EmployeeId = s.EmployeeId,
            EmployeeCode = employee.EmployeeCode,
            EmployeeName = employee.FullName,
            DepartmentName = activeAssignment?.Department?.DepartmentName,
            PositionName = activeAssignment?.Position?.PositionName,
            BaseSalary = s.BaseSalary,
            EffectiveFrom = s.EffectiveFrom,
            EffectiveTo = s.EffectiveTo,
            Reason = s.Reason,
            ApprovedByEmployeeId = s.ApprovedByEmployeeId,
            ApprovedByName = s.ApprovedByEmployee != null
                ? s.ApprovedByEmployee.FullName
                : null,
            CreatedAt = s.CreatedAt
        }).ToList();
    }

    public async Task<EmployeeSalaryDto> AdjustEmployeeSalaryAsync(long employeeId, AdjustEmployeeSalaryRequest request, CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("Employee", employeeId);
        }

        if (request.BaseSalary <= 0)
        {
            throw new BusinessRuleException("จำนวนเงินเดือนต้องมากกว่า 0 บาท");
        }

        var activeAssignment = employee.Assignments.FirstOrDefault(a => a.IsCurrent) ?? employee.Assignments.FirstOrDefault();

        // ตรวจสอบกรอบอัตราเงินเดือนตามตำแหน่ง/ระดับ (Salary Structure Min / Max)
        if (activeAssignment != null)
        {
            var structures = await _context.SalaryStructures
                .Where(s => s.Status == "ACTIVE")
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var levelId = activeAssignment.EmployeeLevelId ?? activeAssignment.Position?.EmployeeLevelId;
            SalaryStructure? matchingStructure = null;
            if (activeAssignment.PositionId != 0 && levelId.HasValue)
            {
                matchingStructure = structures.FirstOrDefault(s =>
                    s.PositionId == activeAssignment.PositionId &&
                    s.EmployeeLevelId == levelId.Value);
            }
            if (matchingStructure == null && activeAssignment.PositionId != 0)
            {
                matchingStructure = structures.FirstOrDefault(s => s.PositionId == activeAssignment.PositionId);
            }
            if (matchingStructure == null && levelId.HasValue)
            {
                matchingStructure = structures.FirstOrDefault(s => s.EmployeeLevelId == levelId.Value);
            }

            if (matchingStructure != null)
            {
                if (matchingStructure.MinSalary > 0 && request.BaseSalary < matchingStructure.MinSalary)
                {
                    throw new BusinessRuleException($"เงินเดือนใหม่ (฿{request.BaseSalary:N0}) ต้องไม่ต่ำกว่าเงินเดือนขั้นต่ำของตำแหน่ง/ระดับ (฿{matchingStructure.MinSalary:N0})");
                }

                if (matchingStructure.MaxSalary > 0 && request.BaseSalary > matchingStructure.MaxSalary)
                {
                    throw new BusinessRuleException($"เงินเดือนใหม่ (฿{request.BaseSalary:N0}) ต้องไม่สูงกว่าเงินเดือนสูงสุดของตำแหน่ง/ระดับ (฿{matchingStructure.MaxSalary:N0})");
                }
            }
        }

        // Get existing salaries
        var existingSalaries = await _context.EmployeeSalaries
            .Where(s => s.EmployeeId == employeeId)
            .OrderByDescending(s => s.EffectiveFrom)
            .ToListAsync(cancellationToken);

        var currentActive = existingSalaries.FirstOrDefault(s => s.EffectiveTo == null);

        if (currentActive != null)
        {
            if (request.EffectiveFrom <= currentActive.EffectiveFrom)
            {
                throw new BusinessRuleException($"วันที่มีผล ({request.EffectiveFrom:yyyy-MM-dd}) ต้องมากกว่าวันที่มีผลของเงินเดือนปัจจุบัน ({currentActive.EffectiveFrom:yyyy-MM-dd})");
            }

            // Close the current active salary up to the day before
            currentActive.EffectiveTo = request.EffectiveFrom.AddDays(-1);
        }

        var newSalary = new EmployeeSalary
        {
            EmployeeId = employeeId,
            BaseSalary = request.BaseSalary,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = null,
            Reason = request.Reason,
            ApprovedByEmployeeId = request.ApprovedByEmployeeId,
            CreatedAt = DateTime.UtcNow
        };

        _context.EmployeeSalaries.Add(newSalary);
        await _context.SaveChangesAsync(cancellationToken);

        string? approverName = null;
        if (request.ApprovedByEmployeeId.HasValue)
        {
            var approver = await _context.Employees.FindAsync(new object[] { request.ApprovedByEmployeeId.Value }, cancellationToken);
            if (approver != null)
            {
                approverName = approver.FullName;
            }
        }

        return new EmployeeSalaryDto
        {
            Id = newSalary.Id,
            EmployeeId = employeeId,
            EmployeeCode = employee.EmployeeCode,
            EmployeeName = employee.FullName,
            DepartmentName = activeAssignment?.Department?.DepartmentName,
            PositionName = activeAssignment?.Position?.PositionName,
            BaseSalary = newSalary.BaseSalary,
            EffectiveFrom = newSalary.EffectiveFrom,
            EffectiveTo = newSalary.EffectiveTo,
            Reason = newSalary.Reason,
            ApprovedByEmployeeId = newSalary.ApprovedByEmployeeId,
            ApprovedByName = approverName,
            CreatedAt = newSalary.CreatedAt
        };
    }

    #endregion

    #region Overview & Items

    public async Task<PayrollOverviewDto> GetPayrollOverviewAsync(CancellationToken cancellationToken = default)
    {
        var permittedIds = await GetPermittedEmployeeIdsAsync(cancellationToken);

        var periods = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var latestPeriod = periods.FirstOrDefault();

        var activeSalariesQuery = _context.EmployeeSalaries
            .Where(s => s.EffectiveTo == null)
            .AsNoTracking();

        if (permittedIds != null)
        {
            activeSalariesQuery = activeSalariesQuery.Where(s => permittedIds.Contains(s.EmployeeId));
        }

        var activeSalaries = await activeSalariesQuery.ToListAsync(cancellationToken);

        var totalSalaries = activeSalaries.Sum(s => s.BaseSalary);
        var totalEmps = permittedIds != null
            ? permittedIds.Count
            : await _context.Employees.CountAsync(cancellationToken);

        var latestPayrolls = latestPeriod != null
            ? (permittedIds != null ? latestPeriod.Payrolls.Where(p => permittedIds.Contains(p.EmployeeId)).ToList() : latestPeriod.Payrolls.ToList())
            : new List<Domain.Entities.Payroll>();

        decimal currentTotal = latestPeriod != null && latestPayrolls.Any()
            ? latestPayrolls.Sum(p => p.NetPayableSalary)
            : totalSalaries;

        int calculatedCount = latestPeriod != null ? latestPayrolls.Count : activeSalaries.Count;
        int totalCount = totalEmps;
        int calcPercent = totalCount > 0 ? (int)Math.Round((double)calculatedCount / totalCount * 100) : 0;

        string currentMonthPeriod = latestPeriod != null
            ? $"{ThaiMonths[latestPeriod.Month <= 12 ? latestPeriod.Month : 1]} {latestPeriod.Year + 543}"
            : "ไม่มีรอบเงินเดือน";

        string nextClosingDate = latestPeriod?.PaymentDate?.ToString("d MMM yyyy", new System.Globalization.CultureInfo("th-TH"))
            ?? latestPeriod?.EndDate.ToString("d MMM yyyy", new System.Globalization.CultureInfo("th-TH"))
            ?? "-";

        int remainingDays = 0;
        if (latestPeriod != null)
        {
            var targetDate = latestPeriod.PaymentDate ?? latestPeriod.EndDate;
            remainingDays = Math.Max(0, targetDate.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber);
        }

        var recentPeriods = periods.Take(5).Select(p =>
        {
            var pPayrolls = permittedIds != null
                ? p.Payrolls.Where(x => permittedIds.Contains(x.EmployeeId)).ToList()
                : p.Payrolls.ToList();

            var statusText = p.Status switch
            {
                "DRAFT" => "ร่าง",
                "REVIEW" => "รอตรวจสอบ",
                "SUBMITTED_TO_FINANCE" => "ส่งการเงินตรวจสอบ",
                "FINANCE_VERIFIED" => "การเงินตรวจสอบแล้ว",
                "PENDING_APPROVAL" => "รออนุมัติ",
                "APPROVED" => "อนุมัติแล้ว",
                "PROCESSING" => "กำลังดำเนินการจ่าย",
                "PROCESSING_BANK" => "ส่งโอนธนาคารแล้ว",
                "PAID" => "โอนเงินสำเร็จแล้ว",
                "CLOSED" => "ปิดรอบแล้ว",
                _ => p.Status
            };

            return new RecentPayrollPeriodDto
            {
                PeriodName = $"รอบเดือน{ThaiMonths[p.Month <= 12 ? p.Month : 1]} {p.Year + 543}",
                TotalAmount = pPayrolls.Sum(x => x.NetPayableSalary),
                Status = p.Status,
                StatusText = statusText
            };
        }).ToList();

        return new PayrollOverviewDto
        {
            CurrentMonthTotal = currentTotal,
            CurrentMonthPeriod = currentMonthPeriod,
            CalculatedEmployeesCount = calculatedCount,
            TotalEmployeesCount = totalCount,
            CalculatedPercentage = calcPercent,
            PendingApprovalCount = Math.Max(0, totalCount - calculatedCount),
            NextClosingDate = nextClosingDate,
            RemainingDays = remainingDays,
            RecentPeriods = recentPeriods
        };
    }

    public async Task<List<PayrollItemDto>> GetPayrollItemsAsync(string? itemType, CancellationToken cancellationToken = default)
    {
        var query = _context.PayrollItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(itemType))
        {
            query = query.Where(i => i.ItemType.ToUpper() == itemType.Trim().ToUpper());
        }

        var list = await query.OrderBy(i => i.Id).ToListAsync(cancellationToken);
        var linked = (await _context.BenefitItems.AsNoTracking()
                .Where(b => b.PayrollItemId != null)
                .Select(b => new { PayrollItemId = b.PayrollItemId!.Value, b.BenefitName })
                .ToListAsync(cancellationToken))
            .GroupBy(x => x.PayrollItemId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.BenefitName).ToList());

        return list.Select(i => new PayrollItemDto
        {
            LinkedBenefitNames = linked.GetValueOrDefault(i.Id) ?? new List<string>(),
            Id = i.Id,
            ItemCode = i.ItemCode,
            ItemName = i.ItemName,
            Description = i.Description,
            ItemType = i.ItemType,
            CalculationType = i.CalculationType,
            FormulaTemplate = i.FormulaTemplate,
            FormulaValue = i.FormulaValue,
            IsTaxable = i.IsTaxable,
            IsSocialSecurityCalculated = i.IsSocialSecurityCalculated,
            Status = i.Status
        }).ToList();
    }

    public async Task<PayrollItemDto> CreatePayrollItemAsync(CreatePayrollItemRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ItemCode))
            throw new BusinessRuleException("รหัสรายการต้องไม่เป็นค่าว่าง");

        if (string.IsNullOrWhiteSpace(request.ItemName))
            throw new BusinessRuleException("ชื่อรายการต้องไม่เป็นค่าว่าง");

        EnsureNotFixedEarning(request.ItemType, request.CalculationType);

        var codeUpper = request.ItemCode.Trim().ToUpper();
        var exists = await _context.PayrollItems.AnyAsync(i => i.ItemCode == codeUpper, cancellationToken);
        if (exists)
            throw new BusinessRuleException($"รหัสรายการ '{codeUpper}' มีอยู่ในระบบแล้ว");

        var entity = new PayrollItem
        {
            ItemCode = codeUpper,
            ItemName = request.ItemName.Trim(),
            Description = request.Description,
            ItemType = request.ItemType.ToUpper() == "DEDUCTION" ? "DEDUCTION" : "EARNING",
            CalculationType = request.CalculationType.ToUpper(),
            FormulaTemplate = request.FormulaTemplate,
            FormulaValue = request.FormulaValue,
            IsTaxable = request.IsTaxable,
            IsSocialSecurityCalculated = request.IsSocialSecurityCalculated,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status
        };

        _context.PayrollItems.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return new PayrollItemDto
        {
            Id = entity.Id,
            ItemCode = entity.ItemCode,
            ItemName = entity.ItemName,
            Description = entity.Description,
            ItemType = entity.ItemType,
            CalculationType = entity.CalculationType,
            FormulaTemplate = entity.FormulaTemplate,
            FormulaValue = entity.FormulaValue,
            IsTaxable = entity.IsTaxable,
            IsSocialSecurityCalculated = entity.IsSocialSecurityCalculated,
            Status = entity.Status
        };
    }

    public async Task<PayrollItemDto> UpdatePayrollItemAsync(long id, UpdatePayrollItemRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.PayrollItems.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
            throw new NotFoundException("PayrollItem", id);

        if (string.IsNullOrWhiteSpace(request.ItemName))
            throw new BusinessRuleException("ชื่อรายการต้องไม่เป็นค่าว่าง");

        if (entity.CalculationType != "FIXED")
            EnsureNotFixedEarning(entity.ItemType, request.CalculationType);
        if (await _context.BenefitItems.AnyAsync(b => b.PayrollItemId == entity.Id, cancellationToken)
            && (request.CalculationType.ToUpper() == "FIXED" || !string.IsNullOrWhiteSpace(request.FormulaTemplate)))
            throw new BusinessRuleException("รายการนี้ใช้จ่ายสวัสดิการอยู่ (ยอดมาจากสวัสดิการ) ตั้งเป็นยอดคงที่หรือสูตรไม่ได้");

        entity.ItemName = request.ItemName.Trim();
        entity.Description = request.Description;
        entity.CalculationType = request.CalculationType.ToUpper();
        entity.FormulaTemplate = request.FormulaTemplate;
        entity.FormulaValue = request.FormulaValue;
        entity.IsTaxable = request.IsTaxable;
        entity.IsSocialSecurityCalculated = request.IsSocialSecurityCalculated;
        entity.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status;

        await _context.SaveChangesAsync(cancellationToken);

        return new PayrollItemDto
        {
            Id = entity.Id,
            ItemCode = entity.ItemCode,
            ItemName = entity.ItemName,
            Description = entity.Description,
            ItemType = entity.ItemType,
            CalculationType = entity.CalculationType,
            FormulaTemplate = entity.FormulaTemplate,
            FormulaValue = entity.FormulaValue,
            IsTaxable = entity.IsTaxable,
            IsSocialSecurityCalculated = entity.IsSocialSecurityCalculated,
            Status = entity.Status
        };
    }

    public async Task DeletePayrollItemAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.PayrollItems.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
            throw new NotFoundException("PayrollItem", id);

        var linkedBenefit = await _context.BenefitItems.Where(b => b.PayrollItemId == id).Select(b => b.BenefitName).FirstOrDefaultAsync(cancellationToken);
        if (linkedBenefit != null)
            throw new BusinessRuleException($"รายการนี้ใช้จ่ายสวัสดิการ '{linkedBenefit}' อยู่ กรุณาเปลี่ยนรายการในสวัสดิการก่อนลบ");

        _context.PayrollItems.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>รายได้แบบยอดคงที่จ่ายทุกคน → ให้ตั้งผ่านสวัสดิการแทน (กันจ่ายซ้ำ/เลือกกลุ่มได้)</summary>
    private static void EnsureNotFixedEarning(string? itemType, string? calculationType)
    {
        if (string.Equals(itemType, "EARNING", StringComparison.OrdinalIgnoreCase)
            && string.Equals(calculationType, "FIXED", StringComparison.OrdinalIgnoreCase))
            throw new BusinessRuleException("รายได้แบบยอดคงที่ให้ตั้งที่เมนูสวัสดิการ (เลือกประเภทพนักงานที่ได้และยอดได้) แล้วผูกกับรายการได้นี้แทน");
    }

    #endregion

    #region Payroll Processing (Tab 4)

    private static readonly string[] ThaiMonths = new[]
    {
        "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    };

    private static string GetThaiPeriodName(int year, int month)
    {
        var mName = month >= 1 && month <= 12 ? ThaiMonths[month] : month.ToString();
        var yThai = year + 543;
        return $"รอบเงินเดือน : {mName} {yThai}";
    }

    private static string GetPeriodStatusText(string status) => status?.ToUpper() switch
    {
        "REVIEW" => "รอตรวจสอบ",
        "PENDING_APPROVAL" => "รออนุมัติ",
        "APPROVED" => "อนุมัติแล้ว",
        "PAID" => "จ่ายแล้ว",
        "CLOSED" => "ปิดรอบ",
        "DRAFT" => "แบบร่าง",
        _ => status ?? string.Empty
    };

    private static string GetPayrollStatusText(string status) => status?.ToUpper() switch
    {
        "CALCULATED" => "คำนวณแล้ว",
        "REVIEW" => "รอตรวจสอบ",
        "DRAFT" => "ยังไม่คำนวณ",
        "NOT_CALCULATED" => "ยังไม่คำนวณ",
        "PAID" => "จ่ายแล้ว",
        "APPROVED" => "อนุมัติแล้ว",
        _ => status ?? "ยังไม่คำนวณ"
    };

    public async Task<List<PayrollPeriodDto>> GetPayrollPeriodsAsync(CancellationToken cancellationToken = default)
    {
        var permittedIds = await GetPermittedEmployeeIdsAsync(cancellationToken);
        var periods = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return periods.Select(p => MapPeriodToDto(p, permittedIds)).ToList();
    }

    public async Task<PayrollPeriodDto?> GetPayrollPeriodByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var permittedIds = await GetPermittedEmployeeIdsAsync(cancellationToken);
        var p = await _context.PayrollPeriods
            .Include(x => x.Payrolls)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (p == null) return null;

        return MapPeriodToDto(p, permittedIds);
    }

    public async Task<List<PayrollRecordDto>> GetPayrollsByPeriodIdAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var permittedIds = await GetPermittedEmployeeIdsAsync(cancellationToken);

        var period = await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken);

        var activeEmployees = await _context.Employees
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync(cancellationToken);

        if (permittedIds != null)
        {
            activeEmployees = activeEmployees.Where(e => permittedIds.Contains(e.Id)).ToList();
        }

        var payrolls = await _context.Payrolls
            .Include(p => p.Employee)
            .Include(p => p.Details).ThenInclude(d => d.PayrollItem)
            .Where(p => p.PeriodId == periodId)
            .OrderBy(p => p.Id)
            .ToListAsync(cancellationToken);

        if (permittedIds != null)
        {
            payrolls = payrolls.Where(p => permittedIds.Contains(p.EmployeeId)).ToList();
        }

        var existingEmployeeIds = payrolls.Select(p => p.EmployeeId).ToHashSet();
        var missingEmployees = activeEmployees.Where(e => !existingEmployeeIds.Contains(e.Id)).ToList();

        if (missingEmployees.Any() && period != null && (period.Status == "DRAFT" || period.Status == "REVIEW"))
        {
            // แสดงเฉพาะพนักงานที่อยู่ในรอบนี้จริง (ไม่รวมคนที่ลาออกไปแล้ว / ยังไม่เริ่มงาน)
            var windows = await LoadEmploymentWindowsAsync(missingEmployees, cancellationToken);
            missingEmployees = missingEmployees
                .Where(e => IsEligibleForPeriod(e, windows.TryGetValue(e.Id, out var w) ? w : new EmploymentWindow(null, null), period))
                .ToList();
        }

        if (missingEmployees.Any() && period != null && (period.Status == "DRAFT" || period.Status == "REVIEW"))
        {
            var newPayrolls = missingEmployees.Select(emp =>
            {
                var curAssign = emp.Assignments.FirstOrDefault(a => a.IsCurrent) ?? emp.Assignments.FirstOrDefault();
                return new Domain.Entities.Payroll
                {
                    PeriodId = period.Id,
                    EmployeeId = emp.Id,
                    TotalGrossIncome = 0,
                    TotalDeductionAmount = 0,
                    NetPayableSalary = 0,
                    Status = "DRAFT",
                    SnapshotEmployeeName = $"{emp.Prefix} {emp.FirstName} {emp.LastName}".Trim(),
                    SnapshotDepartmentName = curAssign?.Department?.DepartmentName ?? "-"
                };
            }).ToList();

            _context.Payrolls.AddRange(newPayrolls);
            await _context.SaveChangesAsync(cancellationToken);

            payrolls = await _context.Payrolls
                .Include(p => p.Employee)
                .Include(p => p.Details).ThenInclude(d => d.PayrollItem)
                .Where(p => p.PeriodId == periodId)
                .OrderBy(p => p.Id)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            if (permittedIds != null)
            {
                payrolls = payrolls.Where(p => permittedIds.Contains(p.EmployeeId)).ToList();
            }
        }

        var employeeIds = payrolls.Select(p => p.EmployeeId).Distinct().ToList();

        var allSalaries = await _context.EmployeeSalaries
            .Where(s => employeeIds.Contains(s.EmployeeId))
            .OrderByDescending(s => s.EffectiveFrom)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var employeeBankAccounts = employeeIds.Any()
            ? await _context.EmployeeBankAccounts
                .Include(b => b.Bank)
                .Where(b => employeeIds.Contains(b.EmployeeId) && b.Status == "ACTIVE")
                .AsNoTracking()
                .ToListAsync(cancellationToken)
            : new List<Domain.Entities.EmployeeBankAccount>();

        var periodStartDt = period != null 
            ? DateTime.SpecifyKind(period.StartDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc) 
            : DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);
        var periodEndDt = period != null 
            ? DateTime.SpecifyKind(period.EndDate.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc) 
            : DateTime.SpecifyKind(DateTime.MaxValue, DateTimeKind.Utc);

        var leaveRequests = (period != null && employeeIds.Any())
            ? await _context.LeaveRequests
                .Include(r => r.LeaveType)
                .Where(r => employeeIds.Contains(r.EmployeeId) && (r.Status == "APPROVED" || r.Status == "PENDING") && r.StartDatetime <= periodEndDt && r.EndDatetime >= periodStartDt)
                .AsNoTracking()
                .ToListAsync(cancellationToken)
            : new List<Domain.Entities.LeaveRequest>();

        return payrolls.Select(p =>
        {
            var empSalary = allSalaries.FirstOrDefault(s => s.EmployeeId == p.EmployeeId);
            var hasSalary = empSalary != null && empSalary.BaseSalary > 0;
            var isCalculated = p.Status != "DRAFT" && p.TotalGrossIncome > 0 && hasSalary;
            var empBank = employeeBankAccounts.FirstOrDefault(b => b.EmployeeId == p.EmployeeId && b.IsPrimary)
                       ?? employeeBankAccounts.FirstOrDefault(b => b.EmployeeId == p.EmployeeId);

            var empLeaves = leaveRequests.Where(l => l.EmployeeId == p.EmployeeId).ToList();
            var totalLeaveDays = empLeaves.Where(l => l.Status == "APPROVED").Sum(l => l.LeaveDays);
            var pendingLeaves = empLeaves.Where(l => l.Status == "PENDING").ToList();

            string? leaveSummary = null;
            var approvedLeaves = empLeaves.Where(l => l.Status == "APPROVED").ToList();
            if (approvedLeaves.Any())
            {
                var grouped = approvedLeaves.GroupBy(l => l.LeaveType?.LeaveName ?? "ลา")
                    .Select(g => $"{g.Key} {g.Sum(x => x.LeaveDays):0.#} วัน");
                leaveSummary = string.Join(" • ", grouped);
            }

            var adjustments = p.Details
                .Where(d => d.PayrollItem != null && d.PayrollItem.ItemCode != "INC_BASE" && d.PayrollItem.ItemCode != "DED_SSO" && d.PayrollItem.ItemCode != "DED_TAX")
                .Select(d => d.PayrollItem!.ItemName)
                .ToList();

            string? adjustmentsSummary = !hasSalary
                ? "⚠️ ยังไม่ระบุฐานเงินเดือน"
                : (adjustments.Any() ? string.Join(", ", adjustments) : "-");

            decimal ssoAmount = p.Details.Where(d => d.PayrollItem?.ItemCode == "DED_SSO").Sum(d => d.Amount);
            decimal taxAmount = p.Details.Where(d => d.PayrollItem?.ItemCode == "DED_TAX").Sum(d => d.Amount);

            string inputStatus;
            string inputStatusText;
            if (!hasSalary)
            {
                inputStatus = "PENDING_SALARY";
                inputStatusText = "ยังไม่ระบุฐานเงินเดือน";
            }
            else
            {
                var isComplete = pendingLeaves.Count == 0;
                inputStatus = isComplete ? "COMPLETE" : "PENDING_CHECK";
                inputStatusText = isComplete ? "ครบแล้ว" : "รอ HR ตรวจสอบ";
            }

            return new PayrollRecordDto
            {
                Id = p.Id,
                PeriodId = p.PeriodId,
                EmployeeId = p.EmployeeId,
                EmployeeCode = p.Employee?.EmployeeCode ?? $"EMP-{p.EmployeeId:D3}",
                EmployeeName = p.SnapshotEmployeeName ?? (p.Employee != null ? $"{p.Employee.Prefix} {p.Employee.FirstName} {p.Employee.LastName}".Trim() : "-"),
                DepartmentName = p.SnapshotDepartmentName ?? "-",
                TotalGrossIncome = isCalculated ? p.TotalGrossIncome : null,
                TotalDeductionAmount = isCalculated ? p.TotalDeductionAmount : null,
                NetPayableSalary = isCalculated ? p.NetPayableSalary : null,
                SsoAmount = isCalculated ? ssoAmount : null,
                TaxAmount = isCalculated ? taxAmount : null,
                Status = p.Status,
                StatusText = GetPayrollStatusText(p.Status),
                PaymentStatus = p.PaymentStatus ?? "PENDING",
                PaymentStatusText = MapPaymentStatusText(p.PaymentStatus ?? "PENDING"),
                TransferredAt = p.TransferredAt,
                TransferReference = p.TransferReference,
                HasSlip = p.SlipData != null && p.SlipData.Length > 0,
                SlipFileName = p.SlipFileName,
                SlipUploadedAt = p.SlipUploadedAt,

                // HR Verification
                LeaveDays = totalLeaveDays,
                LeaveSummary = leaveSummary,
                AdjustmentsSummary = adjustmentsSummary,
                InputStatus = inputStatus,
                InputStatusText = inputStatusText,

                // Finance
                // ไม่มีบัญชี = ว่าง (หน้าจอแสดง "ยังไม่มีบัญชี") ห้ามเดาธนาคาร
                BankCode = empBank?.Bank?.BankCode ?? string.Empty,
                BankName = empBank?.Bank?.BankName ?? string.Empty,
                AccountNumber = AccountForViewer(empBank?.AccountNumber)
            };
        }).ToList();
    }

    public async Task<List<PayrollDetailItemDto>> GetPayrollDetailsAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        var details = await _context.PayrollDetails
            .Include(d => d.PayrollItem)
            .Where(d => d.PayrollId == payrollId)
            .OrderBy(d => d.PayrollItem != null ? d.PayrollItem.ItemType : "")
            .ThenBy(d => d.Id)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return details.Select(d =>
        {
            var source = ReadDetailSource(d.CalculationSource);
            return new PayrollDetailItemDto
            {
                Id = d.Id,
                PayrollId = d.PayrollId,
                PayrollItemId = d.PayrollItemId,
                ItemCode = d.PayrollItem?.ItemCode ?? "",
                ItemName = d.PayrollItem?.ItemName ?? "",
                ItemType = d.PayrollItem?.ItemType ?? "EARNING",
                Quantity = d.Quantity,
                Rate = d.Rate,
                Amount = d.Amount,
                Subtext = source.Subtext,
                IsManual = source.IsManual,
                Source = source.IsManual ? (source.Source ?? "MANUAL") : null,
                Note = source.Note
            };
        }).ToList();
    }

    public async Task<List<PayrollDetailItemDto>> AddPayrollAdjustmentAsync(long payrollId, AddPayrollAdjustmentRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
            throw new BusinessRuleException("จำนวนเงินต้องมากกว่า 0 (ประเภทรายได้/รายหักกำหนดจากรายการที่เลือก)");
        if (request.Amount > 10_000_000m)
            throw new BusinessRuleException("จำนวนเงินสูงเกินกว่าที่ระบบอนุญาต กรุณาตรวจสอบอีกครั้ง");

        var payroll = await _context.Payrolls
            .Include(p => p.Period)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลเงินเดือนพนักงาน");

        EnsurePeriodEditable(payroll.Period);

        var item = await _context.PayrollItems.FirstOrDefaultAsync(i => i.Id == request.PayrollItemId, cancellationToken)
            ?? throw new NotFoundException("PayrollItem", request.PayrollItemId);

        if (item.Status != "ACTIVE")
            throw new BusinessRuleException($"รายการ '{item.ItemName}' ถูกปิดใช้งานแล้ว");
        if (SystemItemCodes.Contains(item.ItemCode) || CoreFormulaTemplates.Contains(item.FormulaTemplate?.ToUpperInvariant() ?? string.Empty))
            throw new BusinessRuleException($"รายการ '{item.ItemName}' ระบบคำนวณให้อัตโนมัติ ไม่สามารถเพิ่มเองได้ (โบนัสให้ใช้ปุ่มดึงโบนัสที่อนุมัติแล้ว)");

        _context.PayrollDetails.Add(new PayrollDetail
        {
            PayrollId = payroll.Id,
            PayrollItemId = item.Id,
            Amount = Math.Round(request.Amount, 2, MidpointRounding.AwayFromZero),
            CalculationSource = System.Text.Json.JsonSerializer.Serialize(new
            {
                manual = true,
                source = "MANUAL",
                note = request.Note?.Trim(),
                subtext = string.IsNullOrWhiteSpace(request.Note) ? "รายการที่ HR ระบุเอง" : request.Note.Trim()
            })
        });
        await _context.SaveChangesAsync(cancellationToken);

        // คำนวณใหม่ทั้งรอบ เพื่อให้ประกันสังคม/ภาษี/ยอดสุทธิ สอดคล้องกับรายการใหม่
        await CalculatePayrollForPeriodAsync(payroll.PeriodId, cancellationToken);
        return await GetPayrollDetailsAsync(payrollId, cancellationToken);
    }

    public async Task<List<PayrollDetailItemDto>> DeletePayrollAdjustmentAsync(long payrollId, long detailId, CancellationToken cancellationToken = default)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Period)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลเงินเดือนพนักงาน");

        EnsurePeriodEditable(payroll.Period);

        var detail = await _context.PayrollDetails.FirstOrDefaultAsync(d => d.Id == detailId && d.PayrollId == payrollId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบรายการที่ต้องการลบ");

        if (!IsManualDetail(detail))
            throw new BusinessRuleException("ลบได้เฉพาะรายการที่ HR เพิ่มเองเท่านั้น (รายการที่ระบบคำนวณจะถูกสร้างใหม่ทุกครั้งที่คำนวณ)");

        _context.PayrollDetails.Remove(detail);
        await _context.SaveChangesAsync(cancellationToken);

        await CalculatePayrollForPeriodAsync(payroll.PeriodId, cancellationToken);
        return await GetPayrollDetailsAsync(payrollId, cancellationToken);
    }

    public async Task<BonusPayoutResultDto> AddApprovedBonusesToPeriodAsync(long periodId, AddBonusPayoutRequest request, CancellationToken cancellationToken = default)
    {
        int year = request.Year > 0 ? request.Year : DateTime.Today.Year;

        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("PayrollPeriod", periodId);

        EnsurePeriodEditable(period);

        var bonusItem = (await EnsureSystemPayrollItemsAsync(cancellationToken))["INC_BONUS"];

        var bonuses = await _context.EmployeeBonuses
            .Where(b => b.Year == year && b.Status == "APPROVED" && b.BonusAmount > 0)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (!bonuses.Any())
            throw new BusinessRuleException($"ไม่พบโบนัสที่อนุมัติแล้วของปี {year + 543}");

        // ป้องกันการจ่ายซ้ำ: โบนัสที่อยู่ในรอบเงินเดือนใด ๆ แล้ว จะไม่ถูกเพิ่มอีก
        var existingBonusSources = await _context.PayrollDetails
            .Where(d => d.PayrollItemId == bonusItem.Id)
            .Select(d => d.CalculationSource)
            .ToListAsync(cancellationToken);
        var paidBonusIds = existingBonusSources
            .Select(s => ReadDetailSource(s).BonusId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();

        var bonusEmployeeIds = bonuses.Select(b => b.EmployeeId).Distinct().ToList();
        var employees = await _context.Employees
            .Where(e => bonusEmployeeIds.Contains(e.Id))
            .Include(e => e.Assignments)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var windows = await LoadEmploymentWindowsAsync(employees, cancellationToken);

        var result = new BonusPayoutResultDto();
        foreach (var bonus in bonuses)
        {
            if (paidBonusIds.Contains(bonus.Id))
            {
                result.AlreadyPaidCount++;
                continue;
            }

            var emp = employees.FirstOrDefault(e => e.Id == bonus.EmployeeId);
            var window = emp != null && windows.TryGetValue(emp.Id, out var w) ? w : new EmploymentWindow(null, null);
            if (emp == null || !IsEligibleForPeriod(emp, window, period))
            {
                result.SkippedEmployeeCodes.Add(emp?.EmployeeCode ?? $"#{bonus.EmployeeId}");
                continue;
            }

            var payroll = period.Payrolls.FirstOrDefault(p => p.EmployeeId == emp.Id);
            if (payroll == null)
            {
                payroll = new Domain.Entities.Payroll { PeriodId = period.Id, EmployeeId = emp.Id, Status = "DRAFT" };
                _context.Payrolls.Add(payroll);
                period.Payrolls.Add(payroll);
            }

            payroll.Details.Add(new PayrollDetail
            {
                PayrollItemId = bonusItem.Id,
                Amount = bonus.BonusAmount,
                Quantity = bonus.Multiplier > 0 ? bonus.Multiplier : null,
                Rate = bonus.BaseSalary > 0 ? bonus.BaseSalary : null,
                CalculationSource = System.Text.Json.JsonSerializer.Serialize(new
                {
                    manual = true,
                    source = "BONUS",
                    bonusId = bonus.Id,
                    year,
                    subtext = $"โบนัสประจำปี {year + 543}" + (bonus.Multiplier > 0 && bonus.CalculationMode == "MULTIPLIER" ? $" ({bonus.Multiplier:0.##} เท่าของเงินเดือน)" : string.Empty)
                })
            });

            result.AddedCount++;
            result.AddedAmount += bonus.BonusAmount;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // คำนวณใหม่ทั้งรอบ (ภาษีของโบนัสคิดแบบเงินได้ไม่ประจำ)
        result.Payrolls = await CalculatePayrollForPeriodAsync(periodId, cancellationToken);
        return result;
    }

    private static void EnsurePeriodEditable(PayrollPeriod? period)
    {
        if (period == null)
            throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");
        if (period.Status != "DRAFT" && period.Status != "REVIEW")
            throw new BusinessRuleException($"แก้ไขรายการเงินเดือนได้เฉพาะรอบที่อยู่ในสถานะ 'DRAFT' หรือ 'REVIEW' เท่านั้น สถานะปัจจุบัน: '{period.Status}'");
    }

    /// <summary>
    /// ลำดับขั้นตอนที่อนุญาตผ่าน PUT /periods/{id}/status
    /// (ขั้นตอนอื่นเช่น คำนวณ, ส่งการเงิน, การเงินตรวจสอบ, ยืนยันโอน มี endpoint เฉพาะของตัวเอง)
    /// </summary>
    private static readonly Dictionary<string, string[]> AllowedStatusTransitions = new()
    {
        ["DRAFT"] = Array.Empty<string>(),
        ["REVIEW"] = new[] { "PENDING_APPROVAL" },
        ["SUBMITTED_TO_FINANCE"] = new[] { "REVIEW" },
        ["FINANCE_VERIFIED"] = new[] { "APPROVED", "REVIEW" },
        ["PENDING_APPROVAL"] = new[] { "APPROVED", "REVIEW" },
        ["APPROVED"] = new[] { "PAID" },
        ["PROCESSING"] = new[] { "PAID" },
        ["PROCESSING_BANK"] = new[] { "PAID" },
        ["PAID"] = new[] { "CLOSED" },
        ["CLOSED"] = Array.Empty<string>()
    };

    public async Task<PayrollPeriodDto> UpdatePayrollPeriodStatusAsync(long periodId, string status, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken);

        if (period == null)
            throw new NotFoundException("PayrollPeriod", periodId);

        var validStatuses = new[] { "DRAFT", "REVIEW", "SUBMITTED_TO_FINANCE", "FINANCE_VERIFIED", "PENDING_APPROVAL", "APPROVED", "PROCESSING", "PROCESSING_BANK", "PAID", "CLOSED" };
        var normalized = status.ToUpper().Trim();
        if (!validStatuses.Contains(normalized))
            throw new BusinessRuleException($"สถานะ '{status}' ไม่ถูกต้อง");

        // ตรวจลำดับขั้นตอน: ห้ามข้ามขั้น (เช่น DRAFT → PAID)
        if (!AllowedStatusTransitions.TryGetValue(period.Status, out var allowedNext) || !allowedNext.Contains(normalized))
        {
            throw new BusinessRuleException(
                $"ไม่สามารถเปลี่ยนสถานะรอบเงินเดือนจาก '{period.Status}' เป็น '{normalized}' ได้ กรุณาดำเนินการตามลำดับขั้นตอน");
        }

        if (normalized == "PENDING_APPROVAL")
        {
            if (!period.Payrolls.Any(p => p.Status == "CALCULATED"))
            {
                throw new BusinessRuleException("กรุณากดคำนวณเงินเดือนประจำรอบก่อนส่งขออนุมัติจาก CEO");
            }
        }

        if (normalized == "PAID" || normalized == "CLOSED")
        {
            if (string.IsNullOrEmpty(period.PaymentMethod))
            {
                throw new BusinessRuleException($"ไม่อนุญาตให้เปลี่ยนสถานะเป็น {normalized} เนื่องจากยังไม่ได้เลือกวิธีการจ่ายเงิน (ส่งไฟล์ธนาคาร / โอนเอง)");
            }

            if (period.PaymentMethod == "DIRECT_TRANSFER")
            {
                // ต้องแนบสลิปเฉพาะพนักงานที่มียอดต้องโอนจริง (ไม่รวมคนที่ได้ 0 บาท / ยังไม่มีฐานเงินเดือน)
                var payrolls = period.Payrolls.Where(IsPayableRecord).ToList();
                var missingSlip = payrolls.Where(p => p.SlipData == null || p.SlipData.Length == 0).ToList();
                if (missingSlip.Any())
                {
                    throw new BusinessRuleException($"ไม่อนุญาตให้เปลี่ยนสถานะเป็น {normalized} เนื่องจากยังมีพนักงาน {missingSlip.Count} คนที่ยังไม่ได้แนบสลิปการโอนเงิน ห้ามเปลี่ยนสถานะจนกว่าจะโอนเงินและแนบสลิปครบทุกคน");
                }
            }
            else if (period.PaymentMethod == "BANK_BATCH")
            {
                if (period.BankReceiptData == null || period.BankReceiptData.Length == 0)
                {
                    throw new BusinessRuleException($"ไม่อนุญาตให้เปลี่ยนสถานะเป็น {normalized} เนื่องจากยังไม่ได้แนบสลิปหรือไฟล์ใบเสร็จการโอนเงินรวมของธนาคาร ห้ามกดยืนยันจนกว่าจะแนบสลิปหรือไฟล์ยืนยันจากธนาคาร");
                }
            }
        }

        period.Status = normalized;
        if (normalized == "PAID")
        {
            if (period.PaymentConfirmedAt == null) period.PaymentConfirmedAt = DateTimeOffset.UtcNow;
            period.TotalTransferredCount = period.Payrolls.Count(IsPayableRecord);
            foreach (var p in period.Payrolls.Where(IsPayableRecord))
            {
                p.PaymentStatus = "TRANSFERRED";
                if (p.TransferredAt == null) p.TransferredAt = DateTimeOffset.UtcNow;
            }
        }
        if (normalized == "CLOSED")
        {
            period.ClosedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return MapPeriodToDto(period);
    }

    public async Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Year < 2000 || request.Year > 2100)
            throw new BusinessRuleException("ปี (ค.ศ.) ไม่ถูกต้อง");

        if (request.Month < 1 || request.Month > 12)
            throw new BusinessRuleException("เดือนต้องอยู่ระหว่าง 1 ถึง 12");

        var exists = await _context.PayrollPeriods.AnyAsync(p => p.Year == request.Year && p.Month == request.Month, cancellationToken);
        if (exists)
        {
            var thaiMonth = request.Month >= 1 && request.Month <= 12 ? ThaiMonths[request.Month] : request.Month.ToString();
            throw new BusinessRuleException($"รอบเงินเดือนประจำเดือน {thaiMonth} {request.Year + 543} มีอยู่ในระบบแล้ว");
        }

        if (!DateOnly.TryParse(request.StartDate, out var startDate))
            throw new BusinessRuleException("รูปแบบวันเริ่มต้นคำนวณไม่ถูกต้อง");

        if (!DateOnly.TryParse(request.EndDate, out var endDate))
            throw new BusinessRuleException("รูปแบบวันสิ้นสุดคำนวณไม่ถูกต้อง");

        if (endDate < startDate)
            throw new BusinessRuleException("วันสิ้นสุดคำนวณต้องไม่ก่อนวันเริ่มต้นคำนวณ");

        DateOnly? paymentDate = null;
        if (!string.IsNullOrWhiteSpace(request.PaymentDate))
        {
            if (DateOnly.TryParse(request.PaymentDate, out var parsedPaymentDate))
                paymentDate = parsedPaymentDate;
            else
                throw new BusinessRuleException("รูปแบบวันกำหนดจ่ายเงินไม่ถูกต้อง");
        }

        var claimCutoffDate = ParseClaimCutoff(request.ClaimCutoffDate, startDate, paymentDate ?? endDate);

        var period = new Domain.Entities.PayrollPeriod
        {
            Year = request.Year,
            Month = request.Month,
            StartDate = startDate,
            EndDate = endDate,
            PaymentDate = paymentDate,
            ClaimCutoffDate = claimCutoffDate,
            Status = "DRAFT"
        };

        _context.PayrollPeriods.Add(period);
        await _context.SaveChangesAsync(cancellationToken);

        return MapPeriodToDto(period);
    }

    public async Task<List<PayrollRecordDto>> CalculatePayrollForPeriodAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
                .ThenInclude(p => p.Details)
                    .ThenInclude(d => d.PayrollItem)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken);

        if (period == null)
            throw new NotFoundException("PayrollPeriod", periodId);

        // ล็อกการคำนวณ: คำนวณใหม่ได้เฉพาะรอบที่ยังไม่ส่งต่อ (DRAFT / REVIEW)
        if (period.Status != "DRAFT" && period.Status != "REVIEW")
        {
            throw new BusinessRuleException(
                $"ไม่สามารถคำนวณเงินเดือนใหม่ในสถานะ '{period.Status}' ได้ (คำนวณได้เฉพาะสถานะ 'DRAFT' หรือ 'REVIEW' เท่านั้น) หากต้องการแก้ไข กรุณาส่งคืนรอบเงินเดือนกลับมาที่ HR ก่อน");
        }

        var employees = await _context.Employees
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .Include(e => e.Assignments).ThenInclude(a => a.EmployeeType)
                .ThenInclude(et => et!.EmployeeTypeBenefits)
                    .ThenInclude(etb => etb.BenefitItem)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var windows = await LoadEmploymentWindowsAsync(employees, cancellationToken);

        // ใช้เฉพาะเงินเดือนที่มีผลภายในรอบนี้แล้ว (ไม่ดึงรายการที่มีผลในอนาคต)
        var periodEnd = period.EndDate;
        var allSalaries = await _context.EmployeeSalaries
            .Where(s => s.EffectiveFrom <= periodEnd)
            .OrderByDescending(s => s.EffectiveFrom)
            .ThenByDescending(s => s.Id)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var taxBrackets = await GetEffectiveTaxBracketsAsync(period.StartDate, period.EndDate, cancellationToken);
        var ssoRate = await GetEffectiveSsoRateAsync(period.StartDate, period.EndDate, cancellationToken);
        var systemItems = await EnsureSystemPayrollItemsAsync(cancellationToken);
        var systemItemIds = systemItems.Values.Select(i => i.Id).ToHashSet();

        // รายการรายได้/รายหักที่ตั้งค่าไว้ และให้ระบบคำนวณอัตโนมัติได้ (FIXED หรือ FORMULA ที่รองรับ)
        var autoItems = (await _context.PayrollItems
                .Where(i => i.Status == "ACTIVE")
                .AsNoTracking()
                .ToListAsync(cancellationToken))
            .Where(i => !systemItemIds.Contains(i.Id) && IsAutoCalculatedItem(i))
            .ToList();

        // รายการที่ผูกกับสวัสดิการ: ยอดมาจากสวัสดิการเท่านั้น ไม่คิดซ้ำจากรายการได้-หัก
        var benefitLinkedItemIds = (await _context.BenefitItems.AsNoTracking()
                .Where(b => b.PayrollItemId != null)
                .Select(b => b.PayrollItemId!.Value)
                .ToListAsync(cancellationToken))
            .ToHashSet();
        autoItems.RemoveAll(i => benefitLinkedItemIds.Contains(i.Id));

        // ===== คำขอเบิกสวัสดิการที่อนุมัติแล้ว: สรุปจ่ายในรอบนี้ (ตัดรอบที่วันกำหนดจ่าย) =====
        var claimCutoff = period.EffectiveClaimCutoffDate;
        var claimCutoffUtc = DateTime.SpecifyKind(claimCutoff.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc).AddHours(-7);
        var releasedClaimIds = await _context.EmployeeBenefitClaims
            .Where(c => c.PayrollPeriodId == period.Id && c.PaymentStatus == BenefitPayCode.PaymentInPayroll)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);
        var payableClaims = await _context.EmployeeBenefitClaims.AsNoTracking()
            .Where(c => c.Status == "APPROVED" && c.ApprovedAt != null && c.ApprovedAt < claimCutoffUtc
                        && (c.PaymentStatus == BenefitPayCode.PaymentUnpaid || releasedClaimIds.Contains(c.Id)))
            .Select(c => new PayableClaim(c.Id, c.EmployeeId, c.BenefitItemId, c.Amount, c.RequestNo))
            .ToListAsync(cancellationToken);
        var claimBenefitIds = payableClaims.Select(c => c.BenefitItemId).Distinct().ToList();
        var claimBenefits = await _context.BenefitItems.AsNoTracking()
            .Where(b => claimBenefitIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, cancellationToken);

        // อัปเดตสถานะการจ่ายผ่าน stub (ไม่โหลดไฟล์ใบเสร็จ) — บันทึกพร้อมผลคำนวณทั้งรอบ
        var claimStubs = new Dictionary<long, EmployeeBenefitClaim>();
        EmployeeBenefitClaim ClaimStub(long id, bool wasInThisPeriod)
        {
            if (claimStubs.TryGetValue(id, out var stub)) return stub;
            stub = wasInThisPeriod
                ? new EmployeeBenefitClaim { Id = id, PaymentStatus = BenefitPayCode.PaymentInPayroll, PayrollPeriodId = period.Id }
                : new EmployeeBenefitClaim { Id = id, PaymentStatus = BenefitPayCode.PaymentUnpaid };
            _context.EmployeeBenefitClaims.Attach(stub);
            claimStubs[id] = stub;
            return stub;
        }
        foreach (var id in releasedClaimIds)
        {
            var stub = ClaimStub(id, true);
            stub.PaymentStatus = BenefitPayCode.PaymentUnpaid;
            stub.PayrollPeriodId = null;
        }

        var employeeIds = employees.Select(e => e.Id).ToList();
        var attendance = await _context.AttendanceMonthlySummaries
            .Where(a => a.Year == period.Year && a.Month == period.Month && employeeIds.Contains(a.EmployeeId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (attendance.Count == 0)
        {
            var hasDailies = await _context.AttendanceDailies
                .AnyAsync(a => a.WorkDate >= period.StartDate && a.WorkDate <= period.EndDate, cancellationToken);
            if (hasDailies)
            {
                try
                {
                    await _attendanceDailyService.ProcessMonthlyAttendanceSummaryAsync(period.Year, period.Month, cancellationToken);
                    attendance = await _context.AttendanceMonthlySummaries
                        .Where(a => a.Year == period.Year && a.Month == period.Month && employeeIds.Contains(a.EmployeeId))
                        .AsNoTracking()
                        .ToListAsync(cancellationToken);
                }
                catch
                {
                    // Fallback gracefully if summary calculation encounters an edge case
                }
            }
        }

        var periodStartDt = DateTime.SpecifyKind(period.StartDate.AddDays(-1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var periodEndDt = DateTime.SpecifyKind(period.EndDate.AddDays(1).ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
        // ใบลาที่อนุมัติแล้วในรอบ: ใช้ทั้งหักลาไม่รับค่าจ้าง และเงื่อนไขเบี้ยขยัน
        var approvedLeaves = await _context.LeaveRequests
            .Include(r => r.LeaveType)
            .Where(r => r.Status == "APPROVED"
                && r.StartDatetime <= periodEndDt && r.EndDatetime >= periodStartDt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        var unpaidLeaves = approvedLeaves
            .Where(r => r.LeaveType != null && !r.LeaveType.IsPaidLeave)
            .ToList();

        int periodDays = period.EndDate.DayNumber - period.StartDate.DayNumber + 1;
        var eligibleIds = new HashSet<long>();

        foreach (var emp in employees)
        {
            var window = windows.TryGetValue(emp.Id, out var w) ? w : new EmploymentWindow(null, null);
            if (!IsEligibleForPeriod(emp, window, period))
                continue;

            eligibleIds.Add(emp.Id);

            var curAssign = emp.Assignments.FirstOrDefault(a => a.IsCurrent) ?? emp.Assignments.OrderByDescending(a => a.EffectiveFrom).FirstOrDefault();
            var empSalary = allSalaries.FirstOrDefault(s => s.EmployeeId == emp.Id);
            decimal fullSalary = empSalary?.BaseSalary ?? 0;

            var payroll = period.Payrolls.FirstOrDefault(p => p.EmployeeId == emp.Id);
            if (payroll == null)
            {
                payroll = new Domain.Entities.Payroll { PeriodId = period.Id, EmployeeId = emp.Id };
                _context.Payrolls.Add(payroll);
                period.Payrolls.Add(payroll);
            }
            else
            {
                // ลบเฉพาะรายการที่ระบบคำนวณ — รายการที่ HR เพิ่มเอง (manual / โบนัส) คงไว้
                var systemGenerated = payroll.Details.Where(d => !IsManualDetail(d)).ToList();
                if (systemGenerated.Any())
                {
                    _context.PayrollDetails.RemoveRange(systemGenerated);
                    foreach (var d in systemGenerated) payroll.Details.Remove(d);
                }
            }

            // Snapshot ข้อมูล ณ วันที่คำนวณ เพื่อให้ประวัติเงินเดือนไม่เปลี่ยนตามการย้ายแผนก/ตำแหน่งภายหลัง
            payroll.SnapshotEmployeeName = $"{emp.Prefix} {emp.FirstName} {emp.LastName}".Trim();
            payroll.SnapshotDepartmentName = curAssign?.Department?.DepartmentName ?? "-";
            payroll.SnapshotPositionName = curAssign?.Position?.PositionName;
            payroll.SnapshotWageType = curAssign?.WageType;

            if (fullSalary <= 0)
            {
                payroll.TotalGrossIncome = 0;
                payroll.TotalDeductionAmount = 0;
                payroll.NetPayableSalary = 0;
                payroll.Status = "DRAFT";
                continue;
            }

            // ===== 1. เงินเดือน (คิดตามสัดส่วนวันทำงานจริง สำหรับพนักงานเข้าใหม่/ลาออกระหว่างรอบ) =====
            var workStart = window.Start.HasValue && window.Start.Value > period.StartDate ? window.Start.Value : period.StartDate;
            var workEnd = window.End.HasValue && window.End.Value < period.EndDate ? window.End.Value : period.EndDate;
            int workedDays = Math.Max(0, workEnd.DayNumber - workStart.DayNumber + 1);
            bool isProrated = workedDays < periodDays;
            decimal factor = isProrated ? (decimal)workedDays / periodDays : 1m;
            decimal baseSalary = isProrated ? Math.Round(fullSalary * factor, 2, MidpointRounding.AwayFromZero) : fullSalary;
            decimal dailyRate = fullSalary / 30m;
            decimal hourlyRate = dailyRate / 8m;

            var lines = new List<CalcLine>
            {
                new(systemItems["INC_BASE"], baseSalary, isProrated ? (decimal?)workedDays : null, isProrated ? (decimal?)fullSalary : null,
                    isProrated
                        ? $"เงินเดือนประจำ (คิดตามสัดส่วน {workedDays}/{periodDays} วัน จากเงินเดือนเต็ม {fullSalary:N2} บาท)"
                        : "เงินเดือนประจำ",
                    IsRegular: true)
            };

            var empAttendance = attendance.FirstOrDefault(a => a.EmployeeId == emp.Id);

            // ===== 2. หักวันลาไม่รับค่าจ้าง (เฉพาะวันลาที่อนุมัติแล้ว และอยู่ในช่วงที่ทำงานในรอบนี้) =====
            decimal unpaidDays = CalculateUnpaidLeaveDays(unpaidLeaves.Where(l => l.EmployeeId == emp.Id), workStart, workEnd);
            decimal periodLeaveDays = CalculateUnpaidLeaveDays(approvedLeaves.Where(l => l.EmployeeId == emp.Id), workStart, workEnd);
            if (unpaidDays > 0)
            {
                decimal unpaidAmount = Math.Min(baseSalary, Math.Round(dailyRate * unpaidDays, 2, MidpointRounding.AwayFromZero));
                lines.Add(new CalcLine(systemItems["DED_UNPAID_LEAVE"], unpaidAmount, unpaidDays, Math.Round(dailyRate, 4),
                    $"ลาไม่รับค่าจ้าง {unpaidDays:0.##} วัน x {dailyRate:N2} บาท/วัน (เงินเดือน ÷ 30)", IsRegular: false));
            }

            // ===== 2.1 ค่าล่วงเวลา (OT) จากเวลาเข้างานจริง (เฉพาะประเภทพนักงานที่มีสิทธิ์ตามสัญญาจ้าง) =====
            bool hasOt = curAssign?.EmployeeType == null || curAssign.EmployeeType.HasOvertime;
            if (hasOt && empAttendance != null && empAttendance.TotalOvertimeHours > 0)
            {
                decimal otRate = Math.Round(hourlyRate * 1.5m, 4);
                decimal otAmount = Math.Round(empAttendance.TotalOvertimeHours * otRate, 2, MidpointRounding.AwayFromZero);
                if (otAmount > 0)
                {
                    lines.Add(new CalcLine(systemItems["INC_OT"], otAmount, empAttendance.TotalOvertimeHours, otRate,
                        $"ค่าล่วงเวลา {empAttendance.TotalOvertimeHours:0.##} ชม. x {otRate:N2} บาท/ชม. (1.5 เท่า)", IsRegular: false));
                }
            }

            // ===== 3. รายการรายได้/รายหักที่ตั้งค่าไว้ (FIXED / FORMULA) =====
            foreach (var item in autoItems)
            {
                var line = CalculateConfiguredItem(item, baseSalary, dailyRate, hourlyRate, empAttendance, periodLeaveDays);
                if (line != null) lines.Add(line);
            }

            // ===== 3.1 สวัสดิการที่เป็นเงินได้/เบี้ยเลี้ยง (ALLOWANCE) ตามประเภทสัญญา/การจ้างงาน =====
            if (curAssign?.EmployeeType?.EmployeeTypeBenefits != null)
            {
                var allowanceBenefits = curAssign.EmployeeType.EmployeeTypeBenefits
                    .Where(etb => etb.IsActive && etb.CoverageAmount > 0 && etb.BenefitItem != null && etb.BenefitItem.Category == "ALLOWANCE")
                    .ToList();

                foreach (var b in allowanceBenefits)
                {
                    decimal allowanceAmount = 0;
                    decimal? quantity = null;
                    decimal? rate = null;
                    string subtext;

                    bool isDaily = b.Frequency == "DAILY" || b.BenefitItem.BenefitCode.Contains("MEAL") || b.BenefitItem.BenefitCode.Contains("DAILY");
                    if (isDaily)
                    {
                        int actualWorkDays = empAttendance != null && empAttendance.TotalActualWorkDays > 0
                            ? empAttendance.TotalActualWorkDays
                            : workedDays;
                        allowanceAmount = Math.Round(b.CoverageAmount * actualWorkDays, 2, MidpointRounding.AwayFromZero);
                        quantity = actualWorkDays;
                        rate = b.CoverageAmount;
                        subtext = $"{b.BenefitItem.BenefitName} ({b.CoverageAmount:N2} บาท/วัน x {actualWorkDays} วันทำงานจริง)";
                    }
                    else
                    {
                        allowanceAmount = isProrated
                            ? Math.Round(b.CoverageAmount * factor, 2, MidpointRounding.AwayFromZero)
                            : b.CoverageAmount;
                        subtext = isProrated
                            ? $"{b.BenefitItem.BenefitName} (ตามสัดส่วน {workedDays}/{periodDays} วัน จาก {b.CoverageAmount:N2} บาท)"
                            : $"{b.BenefitItem.BenefitName} (สวัสดิการประจำเดือน)";
                    }

                    if (allowanceAmount > 0)
                    {
                        var payrollItem = await EnsureBenefitPayrollItemAsync(b.BenefitItem, cancellationToken);
                        lines.Add(new CalcLine(payrollItem, allowanceAmount, quantity, rate, subtext, IsRegular: !isDaily));
                    }
                }
            }

            // ===== 3.2 คำขอเบิกสวัสดิการที่อนุมัติแล้ว: 1 บรรทัดต่อรายการได้-หักที่ผูกไว้ (เงินได้ไม่ประจำ) =====
            var claimLines = new Dictionary<long, (PayrollItem Item, decimal Amount, List<string> Refs)>();
            foreach (var c in payableClaims.Where(c => c.EmployeeId == emp.Id))
            {
                if (!claimBenefits.TryGetValue(c.BenefitItemId, out var claimBenefit)) continue;
                var payItem = await BenefitPayCode.EnsureAsync(_context, claimBenefit, cancellationToken);
                if (!claimLines.TryGetValue(payItem.Id, out var cur))
                {
                    cur = (payItem, 0m, new List<string>());
                }
                cur.Refs.Add(string.IsNullOrEmpty(c.RequestNo) ? $"#{c.Id}" : c.RequestNo);
                claimLines[payItem.Id] = (cur.Item, cur.Amount + c.Amount, cur.Refs);

                var stub = ClaimStub(c.Id, releasedClaimIds.Contains(c.Id));
                stub.PaymentStatus = BenefitPayCode.PaymentInPayroll;
                stub.PayrollPeriodId = period.Id;
            }
            foreach (var cl in claimLines.Values)
            {
                lines.Add(new CalcLine(cl.Item, cl.Amount, null, null,
                    $"เบิกสวัสดิการ {cl.Refs.Count} รายการ: {string.Join(", ", cl.Refs)}", IsRegular: false));
            }

            // ===== 4. รายการที่ HR เพิ่มเอง (manual / โบนัส) ที่มีอยู่แล้ว =====
            var manualDetails = payroll.Details.Where(IsManualDetail).ToList();
            foreach (var d in manualDetails)
            {
                var item = d.PayrollItem ?? await _context.PayrollItems.FindAsync(new object[] { d.PayrollItemId }, cancellationToken);
                if (item == null) continue;
                lines.Add(new CalcLine(item, d.Amount, d.Quantity, d.Rate, null, IsRegular: false, Existing: d));
            }

            // ===== 5. ประกันสังคม: คิดจากค่าจ้างที่ติ๊ก "คิดประกันสังคม" (หักรายการหักที่ติ๊กไว้) =====
            // เงินเดือน (INC_BASE) นับเป็นค่าจ้างเสมอ ไม่ขึ้นกับการติ๊กในหน้าตั้งค่า
            long baseItemId = systemItems["INC_BASE"].Id;
            decimal ssoWage = Math.Max(0,
                lines.Where(l => l.Item.ItemType == "EARNING" && (l.Item.Id == baseItemId || l.Item.IsSocialSecurityCalculated)).Sum(l => l.Amount)
                - lines.Where(l => l.Item.ItemType == "DEDUCTION" && l.Item.IsSocialSecurityCalculated).Sum(l => l.Amount));
            bool hasSso = curAssign?.EmployeeType == null || curAssign.EmployeeType.HasSocialSecurity;
            decimal ssoAmount = hasSso ? CalculateSsoContribution(ssoWage, ssoRate.EmployeePercent, ssoRate) : 0;

            // กองทุนสำรองเลี้ยงชีพ: เฉพาะประเภทพนักงานที่มีสิทธิ์ตามสัญญาจ้าง
            if (curAssign?.EmployeeType != null && !curAssign.EmployeeType.HasProvidentFund)
            {
                lines.RemoveAll(l => IsProvidentFund(l.Item));
            }

            // ===== 6. ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) =====
            // เงินได้ประจำ: ประมาณการทั้งปีจากยอดเต็มเดือน แล้วคิดตามสัดส่วนวันทำงาน
            // เงินได้ไม่ประจำ (โบนัส, รายการ manual, รายการหัก): คิดภาษีส่วนเพิ่มของปีทั้งก้อนในเดือนที่จ่าย
            // กองทุนสำรองเลี้ยงชีพ (ส่วนลูกจ้าง) เป็นค่าลดหย่อน ไม่ใช่รายการที่ไปลดเงินได้
            decimal regularMonthly = fullSalary + lines.Where(l => l.IsRegular && l.Item.ItemCode != "INC_BASE" && l.Item.IsTaxable && !IsProvidentFund(l.Item))
                .Sum(l => l.Item.ItemType == "EARNING" ? l.Amount : -l.Amount);
            decimal fullMonthSso = hasSso ? CalculateSsoContribution(fullSalary, ssoRate.EmployeePercent, ssoRate) : 0;
            decimal monthlyPvd = lines.Where(l => l.IsRegular && IsProvidentFund(l.Item)).Sum(l => l.Amount);
            if (isProrated && factor > 0) monthlyPvd = Math.Round(monthlyPvd / factor, 2, MidpointRounding.AwayFromZero);
            decimal annualPvdAllowance = CalculatePvdAllowance(monthlyPvd * 12, fullSalary * 12);
            decimal regularAnnualTax = CalculateAnnualTax(regularMonthly * 12, fullMonthSso * 12, taxBrackets, annualPvdAllowance);
            decimal regularMonthlyTax = Math.Round(regularAnnualTax / 12m * factor, 2, MidpointRounding.AwayFromZero);

            decimal irregularTaxable = lines.Where(l => !l.IsRegular && l.Item.IsTaxable && !IsProvidentFund(l.Item))
                .Sum(l => l.Item.ItemType == "EARNING" ? l.Amount : -l.Amount);
            decimal irregularTax = irregularTaxable != 0
                ? CalculateAnnualTax(regularMonthly * 12 + irregularTaxable, fullMonthSso * 12, taxBrackets, annualPvdAllowance) - regularAnnualTax
                : 0;
            decimal monthlyTax = Math.Max(0, Math.Round(regularMonthlyTax + irregularTax, 2, MidpointRounding.AwayFromZero));

            if (ssoAmount > 0)
                lines.Add(new CalcLine(systemItems["DED_SSO"], ssoAmount, null, null,
                    $"คำนวณ {ssoRate.EmployeePercent:G29}% ของค่าจ้าง {ssoWage:N2} บาท (ขั้นต่ำ {ssoRate.MinWage:N0} / เพดาน {ssoRate.MaxWage:N0} บาท)", IsRegular: false));
            if (monthlyTax > 0)
                lines.Add(new CalcLine(systemItems["DED_TAX"], monthlyTax, null, null, "ภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1)", IsRegular: false));

            // ===== 7. สรุปยอด & บันทึกรายละเอียด =====
            decimal totalGross = lines.Where(l => l.Item.ItemType == "EARNING").Sum(l => l.Amount);
            decimal totalDeductions = lines.Where(l => l.Item.ItemType == "DEDUCTION").Sum(l => l.Amount);

            payroll.TotalGrossIncome = totalGross;
            payroll.TotalDeductionAmount = totalDeductions;
            payroll.NetPayableSalary = Math.Max(0, totalGross - totalDeductions);
            payroll.Status = "CALCULATED";

            foreach (var line in lines.Where(l => l.Existing == null))
            {
                payroll.Details.Add(new PayrollDetail
                {
                    PayrollItemId = line.Item.Id,
                    Quantity = line.Quantity,
                    Rate = line.Rate,
                    Amount = line.Amount,
                    CalculationSource = System.Text.Json.JsonSerializer.Serialize(new { subtext = line.Subtext })
                });
            }
        }

        // ลบรายการของพนักงานที่ไม่อยู่ในรอบนี้แล้ว (เช่น ลาออกก่อนรอบ / ยังไม่เริ่มงาน)
        var staleRecords = period.Payrolls.Where(p => !eligibleIds.Contains(p.EmployeeId)).ToList();
        foreach (var stale in staleRecords)
        {
            if (stale.Details.Any())
                _context.PayrollDetails.RemoveRange(stale.Details);
            _context.Payrolls.Remove(stale);
            period.Payrolls.Remove(stale);
        }

        period.Status = "REVIEW";
        await _context.SaveChangesAsync(cancellationToken);

        return await GetPayrollsByPeriodIdAsync(periodId, cancellationToken);
    }

    #region Payroll Calculation Helpers

    /// <summary>บรรทัดรายได้/รายหักระหว่างคำนวณ (IsRegular = เงินได้ประจำทุกเดือน ใช้ประมาณการภาษีทั้งปี)</summary>
    private sealed record PayableClaim(long Id, long EmployeeId, long BenefitItemId, decimal Amount, string? RequestNo);

    private sealed record CalcLine(PayrollItem Item, decimal Amount, decimal? Quantity, decimal? Rate, string? Subtext, bool IsRegular, PayrollDetail? Existing = null);

    /// <summary>รหัสรายการที่ระบบคำนวณเอง (ห้ามเพิ่มแบบ manual)</summary>
    private static readonly string[] SystemItemCodes = { "INC_BASE", "INC_OT", "DED_SSO", "DED_TAX", "DED_UNPAID_LEAVE", "INC_BONUS" };

    /// <summary>Template ที่คำนวณโดยแกนหลักของระบบแล้ว (ไม่นำมาคิดซ้ำจากรายการที่ตั้งค่า)</summary>
    private static readonly string[] CoreFormulaTemplates = { "BASE_SALARY", "SSO_STANDARD", "TAX_STANDARD", "PRORATED_DAYS" };

    /// <summary>Template ที่ระบบคำนวณอัตโนมัติได้จากข้อมูลที่มี</summary>
    private static readonly string[] AutoFormulaTemplates = { "DILIGENT_ALLOWANCE", "LATE_ABSENT", "PERCENT_SALARY" };

    private static bool IsAutoCalculatedItem(PayrollItem item)
    {
        if (item.CalculationType == "FIXED") return true;
        if (item.CalculationType != "FORMULA") return false;
        var template = item.FormulaTemplate?.ToUpperInvariant();
        return template != null && !CoreFormulaTemplates.Contains(template) && AutoFormulaTemplates.Contains(template);
    }

    /// <summary>รายการที่ HR เพิ่มเอง (manual / โบนัส) ซึ่งต้องคงไว้เมื่อคำนวณใหม่</summary>
    private static bool IsManualDetail(PayrollDetail detail) => ReadDetailSource(detail.CalculationSource).IsManual;

    private static (bool IsManual, string? Source, long? BonusId, string? Subtext, string? Note) ReadDetailSource(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return (false, null, null, null, null);
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != System.Text.Json.JsonValueKind.Object) return (false, null, null, null, null);

            bool isManual = root.TryGetProperty("manual", out var m) && m.ValueKind == System.Text.Json.JsonValueKind.True;
            string? source = root.TryGetProperty("source", out var s) && s.ValueKind == System.Text.Json.JsonValueKind.String ? s.GetString() : null;
            long? bonusId = root.TryGetProperty("bonusId", out var bId) && bId.ValueKind == System.Text.Json.JsonValueKind.Number ? bId.GetInt64() : null;
            string? subtext = root.TryGetProperty("subtext", out var st) && st.ValueKind == System.Text.Json.JsonValueKind.String ? st.GetString()
                : root.TryGetProperty("formula", out var f) && f.ValueKind == System.Text.Json.JsonValueKind.String ? f.GetString() : null;
            string? note = root.TryGetProperty("note", out var n) && n.ValueKind == System.Text.Json.JsonValueKind.String ? n.GetString() : null;
            return (isManual, source, bonusId, subtext, note);
        }
        catch
        {
            return (false, null, null, null, null);
        }
    }

    /// <summary>ดึงตัวเลขตัวแรกจากข้อความ เช่น "1,000 บาท (สาย<=1)" → 1000, "5%" → 5</summary>
    private static decimal? ParseFirstNumber(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var match = System.Text.RegularExpressions.Regex.Match(text, @"\d[\d,]*(\.\d+)?");
        if (!match.Success) return null;
        return decimal.TryParse(match.Value.Replace(",", string.Empty), System.Globalization.NumberStyles.Number,
            System.Globalization.CultureInfo.InvariantCulture, out var value) ? value : null;
    }

    /// <summary>
    /// คำนวณรายการที่ตั้งค่าไว้ต่อพนักงาน 1 คน
    /// FIXED = ยอดคงที่ทุกคน, DILIGENT_ALLOWANCE = เบี้ยขยัน (ไม่ขาด / สายไม่เกินเกณฑ์),
    /// LATE_ABSENT = หักมาสาย/ขาดงาน, PERCENT_SALARY = % ของเงินเดือน
    /// </summary>
    private static CalcLine? CalculateConfiguredItem(PayrollItem item, decimal baseSalary, decimal dailyRate, decimal hourlyRate, AttendanceMonthlySummary? attendance, decimal periodLeaveDays = 0)
    {
        decimal amount;
        decimal? quantity = null;
        decimal? rate = null;
        string subtext;

        if (item.CalculationType == "FIXED")
        {
            amount = ParseFirstNumber(item.FormulaValue) ?? 0;
            subtext = "ยอดคงที่ประจำเดือน";
        }
        else
        {
            switch (item.FormulaTemplate?.ToUpperInvariant())
            {
                case "DILIGENT_ALLOWANCE":
                {
                    // ต้องมีข้อมูลเวลาเข้างานจริงของเดือนนั้น (สรุปที่ไม่มีวันทำงานจริงเลย = ยังไม่มีข้อมูล)
                    if (attendance == null) return null;
                    if (attendance.TotalActualWorkDays <= 0 && attendance.TotalWorkedMinutes <= 0) return null;
                    decimal allowance = ParseFirstNumber(item.FormulaValue) ?? 0;
                    var lateLimitMatch = System.Text.RegularExpressions.Regex.Match(item.FormulaValue ?? string.Empty, @"สาย\s*<=?\s*(\d+)");
                    int lateLimit = lateLimitMatch.Success ? int.Parse(lateLimitMatch.Groups[1].Value) : 1;
                    // วันลาที่ยอมให้ได้เบี้ยขยัน: ระบุในค่าสูตรเป็น "ลา<=N" (ค่าเริ่มต้น 0 = ลาวันไหนก็ไม่ได้เบี้ยขยัน)
                    var leaveLimitMatch = System.Text.RegularExpressions.Regex.Match(item.FormulaValue ?? string.Empty, @"ลา\s*<=?\s*(\d+(?:\.\d+)?)");
                    decimal leaveLimit = leaveLimitMatch.Success
                        ? decimal.Parse(leaveLimitMatch.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture)
                        : 0m;
                    decimal leaveDays = Math.Max(periodLeaveDays, attendance.TotalLeaveDays);
                    if (attendance.TotalAbsentDays > 0 || attendance.TotalLateDays > lateLimit || leaveDays > leaveLimit) return null;
                    amount = allowance;
                    subtext = $"เบี้ยขยัน (ไม่ขาดงาน, มาสาย {attendance.TotalLateDays} ครั้ง ไม่เกิน {lateLimit} ครั้ง, ลา {leaveDays:0.##} วัน ไม่เกิน {leaveLimit:0.##} วัน)";
                    break;
                }
                case "LATE_ABSENT":
                {
                    if (attendance == null) return null;
                    decimal lateHours = attendance.TotalLateMinutes / 60m;
                    decimal lateAmount = Math.Round(lateHours * hourlyRate, 2, MidpointRounding.AwayFromZero);
                    decimal absentAmount = Math.Round(attendance.TotalAbsentDays * dailyRate, 2, MidpointRounding.AwayFromZero);
                    amount = Math.Min(baseSalary, lateAmount + absentAmount);
                    subtext = $"สาย {attendance.TotalLateMinutes} นาที ({lateAmount:N2}) + ขาดงาน {attendance.TotalAbsentDays} วัน ({absentAmount:N2})";
                    break;
                }
                case "PERCENT_SALARY":
                {
                    decimal percent = ParseFirstNumber(item.FormulaValue) ?? 0;
                    amount = Math.Round(baseSalary * percent / 100m, 2, MidpointRounding.AwayFromZero);
                    quantity = percent;
                    rate = baseSalary;
                    subtext = $"{percent:0.##}% ของเงินเดือน {baseSalary:N2} บาท";
                    break;
                }
                default:
                    return null;
            }
        }

        if (amount <= 0) return null;
        return new CalcLine(item, amount, quantity, rate, subtext, IsRegular: item.CalculationType == "FIXED" || item.FormulaTemplate?.ToUpperInvariant() == "PERCENT_SALARY");
    }

    /// <summary>จำนวนวันลาไม่รับค่าจ้างที่ตกอยู่ในช่วงทำงานของรอบนี้ (เฉลี่ยตามสัดส่วนวันปฏิทินของใบลา)</summary>
    private static decimal CalculateUnpaidLeaveDays(IEnumerable<LeaveRequest> leaves, DateOnly workStart, DateOnly workEnd)
    {
        static DateOnly ToLocalDate(DateTime dt) =>
            DateOnly.FromDateTime(dt.Kind == DateTimeKind.Utc ? dt.AddHours(7) : dt); // เวลาไทย (UTC+7)

        decimal total = 0;
        foreach (var leave in leaves)
        {
            var leaveStart = ToLocalDate(leave.StartDatetime);
            var leaveEnd = ToLocalDate(leave.EndDatetime);
            if (leaveEnd < leaveStart) leaveEnd = leaveStart;

            var overlapStart = leaveStart > workStart ? leaveStart : workStart;
            var overlapEnd = leaveEnd < workEnd ? leaveEnd : workEnd;
            if (overlapEnd < overlapStart) continue;

            int spanDays = leaveEnd.DayNumber - leaveStart.DayNumber + 1;
            int overlapDays = overlapEnd.DayNumber - overlapStart.DayNumber + 1;
            decimal leaveDays = leave.LeaveDays > 0 ? leave.LeaveDays : spanDays;
            total += spanDays <= overlapDays ? leaveDays : Math.Round(leaveDays * overlapDays / spanDays, 2);
        }

        return total;
    }

    /// <summary>หา/สร้างรายการเงินเดือนของระบบ (เงินเดือน, OT, SSO, ภาษี, หักลาไม่รับค่าจ้าง, โบนัส)</summary>
    private async Task<Dictionary<string, PayrollItem>> EnsureSystemPayrollItemsAsync(CancellationToken cancellationToken)
    {
        var definitions = new (string Code, string Name, string Type, string CalcType, string? Template, bool Taxable, bool Sso)[]
        {
            ("INC_BASE", "เงินเดือน", "EARNING", "FORMULA", "BASE_SALARY", true, true),
            ("INC_OT", "ค่าล่วงเวลา (OT)", "EARNING", "FORMULA", "OVERTIME", true, true),
            ("DED_SSO", "เงินสมทบประกันสังคม", "DEDUCTION", "FORMULA", "SSO_STANDARD", false, false),
            ("DED_TAX", "ภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1)", "DEDUCTION", "FORMULA", "TAX_STANDARD", false, false),
            ("DED_UNPAID_LEAVE", "หักวันลาไม่รับค่าจ้าง", "DEDUCTION", "FORMULA", null, true, true),
            ("INC_BONUS", "โบนัส", "EARNING", "MANUAL", null, true, false)
        };

        var allItems = await _context.PayrollItems.ToListAsync(cancellationToken);
        var result = new Dictionary<string, PayrollItem>();
        bool added = false;

        foreach (var def in definitions)
        {
            var item = allItems.FirstOrDefault(i => i.ItemCode == def.Code)
                ?? (def.Template != null
                    ? allItems.FirstOrDefault(i => i.Status == "ACTIVE" && string.Equals(i.FormulaTemplate, def.Template, StringComparison.OrdinalIgnoreCase))
                    : null);

            if (item == null)
            {
                item = new PayrollItem
                {
                    ItemCode = def.Code,
                    ItemName = def.Name,
                    Description = "รายการระบบ (สร้างอัตโนมัติสำหรับการคำนวณเงินเดือน)",
                    ItemType = def.Type,
                    CalculationType = def.CalcType,
                    FormulaTemplate = def.Template,
                    FormulaValue = null,
                    IsTaxable = def.Taxable,
                    IsSocialSecurityCalculated = def.Sso,
                    Status = "ACTIVE"
                };
                _context.PayrollItems.Add(item);
                allItems.Add(item);
                added = true;
            }

            result[def.Code] = item;
        }

        if (added)
            await _context.SaveChangesAsync(cancellationToken);

        return result;
    }

    /// <summary>หาหรือสร้างรายการเงินเดือนสำหรับสวัสดิการพนักงาน (หมวด ALLOWANCE / เบี้ยเลี้ยง)</summary>
    private Task<PayrollItem> EnsureBenefitPayrollItemAsync(BenefitItem benefit, CancellationToken cancellationToken) =>
        BenefitPayCode.EnsureAsync(_context, benefit, cancellationToken);

    /// <summary>
    /// ภาษีเงินได้ทั้งปี: หักค่าใช้จ่าย 50% ไม่เกิน 100,000 / ลดหย่อนส่วนตัว 60,000 / เงินสมทบประกันสังคมทั้งปี
    /// / เงินสะสมกองทุนสำรองเลี้ยงชีพ แล้วคิดตามขั้นบันได
    /// </summary>
    private static decimal CalculateAnnualTax(decimal annualIncome, decimal annualSso, List<TaxBracket> taxBrackets, decimal annualPvdAllowance = 0)
    {
        decimal standardExpenses = Math.Min(Math.Max(0, annualIncome) * 0.50m, 100000.0m);
        decimal taxableIncome = Math.Max(0, annualIncome - standardExpenses - 60000.0m - annualSso - Math.Max(0, annualPvdAllowance));

        decimal annualTax = 0;
        foreach (var bracket in taxBrackets)
        {
            decimal lower = Math.Floor(bracket.IncomeFrom);
            if (taxableIncome > lower)
            {
                decimal upper = bracket.IncomeTo ?? taxableIncome;
                decimal ratePercent = bracket.TaxRate <= 1.0m ? bracket.TaxRate * 100.0m : bracket.TaxRate;
                annualTax += Math.Round((Math.Min(taxableIncome, upper) - lower) * (ratePercent / 100.0m), 2);
            }
        }

        return annualTax;
    }

    /// <summary>รายการหักที่เป็นเงินสะสมกองทุนสำรองเลี้ยงชีพ (ดูจากรหัส PVD/PROVIDENT หรือชื่อ "สำรองเลี้ยงชีพ")</summary>
    private static bool IsProvidentFund(PayrollItem item)
    {
        if (!string.Equals(item.ItemType, "DEDUCTION", StringComparison.OrdinalIgnoreCase)) return false;
        var code = item.ItemCode?.ToUpperInvariant() ?? string.Empty;
        return code.Contains("PVD") || code.Contains("PROVIDENT")
            || (item.ItemName?.Contains("สำรองเลี้ยงชีพ") ?? false);
    }

    /// <summary>ค่าลดหย่อนกองทุนสำรองเลี้ยงชีพทั้งปี: ไม่เกิน 15% ของค่าจ้าง และไม่เกิน 500,000 บาท</summary>
    private static decimal CalculatePvdAllowance(decimal annualContribution, decimal annualWage)
    {
        if (annualContribution <= 0) return 0;
        return Math.Min(annualContribution, Math.Min(Math.Max(0, annualWage) * 0.15m, 500000m));
    }

    /// <summary>เงินเดือนล่าสุดของพนักงานแต่ละคนที่มีผลภายในปีที่กำหนด (ใช้คำนวณโบนัส)</summary>
    private async Task<List<EmployeeSalary>> LoadLatestSalariesForYearAsync(int year, CancellationToken cancellationToken)
    {
        var yearEnd = new DateOnly(year, 12, 31);
        var salaries = await _context.EmployeeSalaries
            .Where(s => s.EffectiveFrom <= yearEnd)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return salaries
            .GroupBy(s => s.EmployeeId)
            .Select(g => g.OrderByDescending(s => s.EffectiveFrom).ThenByDescending(s => s.Id).First())
            .ToList();
    }

    /// <summary>ช่วงเวลาการจ้างงาน (วันเริ่มงาน / วันทำงานวันสุดท้าย) ใช้ตัดสินว่าพนักงานอยู่ในรอบเงินเดือนหรือไม่</summary>
    private sealed record EmploymentWindow(DateOnly? Start, DateOnly? End);

    /// <summary>อัตราประกันสังคมที่ใช้ในการคำนวณ (หน่วยเป็น % เช่น 5 = 5%)</summary>
    private sealed record SsoRateInfo(decimal EmployeePercent, decimal EmployerPercent, decimal MinWage, decimal MaxWage);

    // ค่าตั้งต้นตามกฎหมาย ปี 2569 (ใช้เมื่อยังไม่มีการตั้งค่าในระบบ): 5% ฐานค่าจ้าง 1,650 - 17,500 บาท
    private const decimal DefaultSsoPercent = 5.0m;
    private const decimal DefaultSsoMinWage = 1650.0m;
    private const decimal DefaultSsoMaxWage = 17500.0m;

    private static bool IsPayableRecord(Domain.Entities.Payroll p) => p.Status == "CALCULATED" && p.NetPayableSalary > 0;

    private async Task<Dictionary<long, EmploymentWindow>> LoadEmploymentWindowsAsync(List<Employee> employees, CancellationToken cancellationToken)
    {
        var ids = employees.Select(e => e.Id).ToList();
        var result = new Dictionary<long, EmploymentWindow>();
        if (!ids.Any()) return result;

        var contracts = await _context.EmploymentContracts
            .Where(c => ids.Contains(c.EmployeeId) && c.Status != "CANCELLED")
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var exits = await _context.EmployeeStatusHistories
            .Where(h => ids.Contains(h.EmployeeId) && (h.Status == "RESIGNED" || h.Status == "TERMINATED"))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        foreach (var emp in employees)
        {
            var empContracts = contracts.Where(c => c.EmployeeId == emp.Id).ToList();

            DateOnly? start = empContracts.Any()
                ? empContracts.Min(c => c.StartDate)
                : (emp.Assignments.Any() ? emp.Assignments.Min(a => a.EffectiveFrom) : (DateOnly?)null);

            // วันทำงานวันสุดท้าย: จากประวัติสถานะลาออก/เลิกจ้าง หรือวันสิ้นสุดสัญญาที่ถูกยกเลิก
            DateOnly? end = exits.Where(h => h.EmployeeId == emp.Id).Select(h => (DateOnly?)h.EffectiveFrom).Max();
            var terminationDate = empContracts.Where(c => c.TerminationDate.HasValue).Select(c => c.TerminationDate).Max();
            if (terminationDate.HasValue && (!end.HasValue || terminationDate.Value > end.Value))
                end = terminationDate;

            // กรณีกลับเข้ามาทำงานใหม่ (มีสัญญา ACTIVE ที่เริ่มหลังวันออก) ให้ถือว่ายังทำงานอยู่
            if (end.HasValue && empContracts.Any(c => c.Status == "ACTIVE" && c.StartDate > end.Value))
                end = null;

            result[emp.Id] = new EmploymentWindow(start, end);
        }

        return result;
    }

    private static bool IsEligibleForPeriod(Employee emp, EmploymentWindow window, PayrollPeriod period)
    {
        if (window.Start.HasValue && window.Start.Value > period.EndDate) return false; // ยังไม่เริ่มงาน
        if (window.End.HasValue && window.End.Value < period.StartDate) return false;   // ออกก่อนเริ่มรอบ

        // พนักงานที่ปิดสถานะแล้ว (INACTIVE) โดยไม่ทราบวันออก จะไม่ถูกนำมาคิดเงินเดือน
        bool isActive = string.Equals(emp.EmploymentStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase);
        if (!isActive && !window.End.HasValue) return false;

        return true;
    }

    private async Task<SsoRateInfo> GetEffectiveSsoRateAsync(DateOnly start, DateOnly end, CancellationToken cancellationToken)
    {
        var rates = await _context.SocialSecurityRates
            .Where(s => s.Status == "ACTIVE")
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var rate = rates
                .Where(r => r.EffectiveFrom <= end && (r.EffectiveTo == null || r.EffectiveTo >= start))
                .OrderByDescending(r => r.EffectiveFrom).ThenByDescending(r => r.Id)
                .FirstOrDefault()
            ?? rates.OrderByDescending(r => r.EffectiveFrom).ThenByDescending(r => r.Id).FirstOrDefault();

        if (rate == null)
            return new SsoRateInfo(DefaultSsoPercent, DefaultSsoPercent, DefaultSsoMinWage, DefaultSsoMaxWage);

        // ค่าในฐานข้อมูลเก็บเป็นทศนิยม (0.05 = 5%) แต่รองรับข้อมูลเก่าที่เก็บเป็นเปอร์เซ็นต์
        static decimal ToPercent(decimal v) => v < 1.0m ? v * 100.0m : v;

        return new SsoRateInfo(
            ToPercent(rate.EmployeeContributionPercent),
            ToPercent(rate.EmployerContributionPercent),
            rate.MinWageBaseAmount,
            rate.MaxWageBaseAmount > 0 ? rate.MaxWageBaseAmount : DefaultSsoMaxWage);
    }

    private async Task<List<TaxBracket>> GetEffectiveTaxBracketsAsync(DateOnly start, DateOnly end, CancellationToken cancellationToken)
    {
        var brackets = await _context.TaxBrackets
            .Where(t => t.Status == "ACTIVE")
            .OrderBy(t => t.IncomeFrom)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var effective = brackets
            .Where(t => t.EffectiveFrom <= end && (t.EffectiveTo == null || t.EffectiveTo >= start))
            .ToList();

        return effective.Any() ? effective : brackets;
    }

    /// <summary>
    /// เงินสมทบประกันสังคม: ฐานค่าจ้างถูกจำกัดระหว่างขั้นต่ำ-เพดาน
    /// ปัดเศษเป็นบาท (ตั้งแต่ 50 สตางค์ขึ้นไปปัดขึ้น ต่ำกว่านั้นปัดทิ้ง) ตามหลักเกณฑ์ สปส.
    /// </summary>
    private static decimal CalculateSsoContribution(decimal wage, decimal percent, SsoRateInfo rate)
    {
        if (wage <= 0 || percent <= 0) return 0;
        decimal wageBase = Math.Min(Math.Max(wage, rate.MinWage), rate.MaxWage);
        return Math.Round(wageBase * (percent / 100.0m), 0, MidpointRounding.AwayFromZero);
    }

    #endregion

    public async Task DeletePayrollPeriodAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
                .ThenInclude(p => p.Details)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        // Allow deletion ONLY in DRAFT or REVIEW status
        if (period.Status != "DRAFT" && period.Status != "REVIEW")
        {
            throw new BusinessRuleException(
                $"ไม่สามารถลบรอบเงินเดือนในสถานะ '{period.Status}' ได้ " +
                "เนื่องจากรอบเงินเดือนได้ถูกส่งต่อไปยังขั้นตอนตรวจสอบ/อนุมัติ/จ่ายเงินแล้ว (สามารถลบได้เฉพาะสถานะ 'DRAFT' หรือ 'REVIEW' เท่านั้น)");
        }

        // คำขอเบิกที่อยู่ในรอบนี้ → กลับไปรอสรุปรอบถัดไป
        await _context.EmployeeBenefitClaims
            .Where(c => c.PayrollPeriodId == period.Id && c.PaymentStatus == BenefitPayCode.PaymentInPayroll)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.PaymentStatus, BenefitPayCode.PaymentUnpaid)
                .SetProperty(c => c.PayrollPeriodId, (long?)null), cancellationToken);

        // Clean up payroll details and payroll records
        foreach (var pr in period.Payrolls)
        {
            if (pr.Details.Any())
            {
                _context.PayrollDetails.RemoveRange(pr.Details);
            }
        }
        _context.Payrolls.RemoveRange(period.Payrolls);
        _context.PayrollPeriods.Remove(period);

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<BankTransferSummaryDto> GetBankTransferSummaryAsync(long periodId, string? bankCode = null, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
                .ThenInclude(pr => pr.Employee)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken);

        if (period == null)
            throw new NotFoundException("PayrollPeriod", periodId);

        // เฉพาะพนักงานที่มียอดต้องโอนจริง (ไม่รวมคนที่ยังไม่คำนวณ / ยอด 0 บาท)
        var payableRecords = period.Payrolls
            .Where(pr => pr.NetPayableSalary > 0 && pr.Status != "DRAFT")
            .ToList();

        var employeeIds = payableRecords.Select(pr => pr.EmployeeId).Distinct().ToList();
        var employeeBankAccounts = employeeIds.Any()
            ? await _context.EmployeeBankAccounts
                .Include(b => b.Bank)
                .Where(b => employeeIds.Contains(b.EmployeeId) && b.Status == "ACTIVE")
                .AsNoTracking()
                .ToListAsync(cancellationToken)
            : new List<Domain.Entities.EmployeeBankAccount>();

        bool filterByBank = !string.IsNullOrWhiteSpace(bankCode) && bankCode.ToUpper() != "ALL";
        var items = new List<BankTransferItemDto>();
        decimal totalAmount = 0;

        foreach (var pr in payableRecords)
        {
            var empBank = employeeBankAccounts.FirstOrDefault(b => b.EmployeeId == pr.EmployeeId && b.IsPrimary)
                       ?? employeeBankAccounts.FirstOrDefault(b => b.EmployeeId == pr.EmployeeId);

            var empCode = pr.Employee?.EmployeeCode ?? $"EMP{pr.EmployeeId:D3}";
            var empName = pr.SnapshotEmployeeName
                ?? (pr.Employee != null ? $"{pr.Employee.FirstName} {pr.Employee.LastName}".Trim() : $"พนักงาน #{pr.EmployeeId}");

            // ห้ามเดาเลขบัญชี: ถ้าไม่มีบัญชีธนาคาร ให้แสดงเป็น MISSING_ACCOUNT เพื่อให้ HR/การเงินแก้ไขก่อน
            bool hasAccount = empBank != null
                && !string.IsNullOrWhiteSpace(empBank.AccountNumber)
                && !string.IsNullOrWhiteSpace(empBank.Bank?.BankCode);

            var bCode = hasAccount ? empBank!.Bank!.BankCode : string.Empty;
            if (filterByBank && bCode != bankCode)
            {
                continue;
            }

            if (hasAccount)
            {
                totalAmount += pr.NetPayableSalary;
            }

            items.Add(new BankTransferItemDto
            {
                EmployeeId = pr.EmployeeId,
                EmployeeCode = empCode,
                EmployeeName = empName,
                BankCode = bCode,
                BankName = hasAccount ? (empBank!.Bank?.BankName ?? string.Empty) : "ยังไม่มีข้อมูลบัญชีธนาคาร",
                AccountNumber = hasAccount ? AccountForViewer(empBank!.AccountNumber) : string.Empty,
                AccountName = hasAccount ? (empBank!.AccountName ?? empName) : empName,
                NetPayableSalary = pr.NetPayableSalary,
                Status = hasAccount ? "READY" : "MISSING_ACCOUNT"
            });
        }

        var payer = await GetPayrollPayerAccountAsync(cancellationToken);
        var pendingChangeCount = employeeIds.Any()
            ? await _context.EmployeeBankAccounts.AsNoTracking()
                .Where(b => employeeIds.Contains(b.EmployeeId) && b.Status == "PENDING_VERIFY")
                .Select(b => b.EmployeeId).Distinct().CountAsync(cancellationToken)
            : 0;

        return new BankTransferSummaryDto
        {
            PeriodId = period.Id,
            PeriodName = GetThaiPeriodName(period.Year, period.Month),
            SelectedBankCode = bankCode ?? "ALL",
            TotalTransferAmount = totalAmount,
            TotalEmployees = items.Count(i => i.Status == "READY"),
            MissingAccountCount = items.Count(i => i.Status == "MISSING_ACCOUNT"),
            PendingBankChangeCount = pendingChangeCount,
            HasPayerAccount = payer != null,
            PayerBankCode = payer?.Bank?.BankCode,
            PayerBankName = payer?.Bank?.BankName,
            PayerAccountNumber = payer != null ? _crypto.MaskAccountNumber(payer.AccountNumber) : null,
            PayerAccountName = payer?.AccountName,
            Items = items.OrderBy(i => i.EmployeeCode).ToList()
        };
    }

    public async Task<byte[]> GenerateBankTransferFileAsync(long periodId, string bankCode, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("PayrollPeriod", periodId);

        // ตรวจทั้งรอบเสมอ (ไม่ใช่เฉพาะธนาคารที่เลือก) เพื่อไม่ให้มีพนักงานตกหล่นไม่ได้รับเงิน
        var fullSummary = await GetBankTransferSummaryAsync(periodId, "ALL", cancellationToken);
        var missing = fullSummary.Items.Where(i => i.Status == "MISSING_ACCOUNT").ToList();
        if (missing.Any())
        {
            var codes = string.Join(", ", missing.Take(10).Select(i => i.EmployeeCode));
            var more = missing.Count > 10 ? $" และอีก {missing.Count - 10} คน" : string.Empty;
            throw new BusinessRuleException(
                $"ไม่สามารถสร้างไฟล์ธนาคารได้ เนื่องจากมีพนักงาน {missing.Count} คนที่ยังไม่มีข้อมูลบัญชีธนาคาร ({codes}{more}) กรุณาเพิ่มบัญชีธนาคารในข้อมูลพนักงานก่อน");
        }

        var summary = string.IsNullOrWhiteSpace(bankCode) || bankCode.ToUpper() == "ALL"
            ? fullSummary
            : await GetBankTransferSummaryAsync(periodId, bankCode, cancellationToken);

        if (!summary.Items.Any())
            throw new BusinessRuleException("ไม่มีรายการที่ต้องโอนเงินในรอบนี้ (หรือในธนาคารที่เลือก)");

        // บัญชีบริษัทที่ตัดเงินจ่าย (บัญชีหลักสำหรับจ่ายเงินเดือน) — ไฟล์ธนาคารต้องระบุบัญชีต้นทาง
        var payer = await GetPayrollPayerAccountAsync(cancellationToken)
            ?? throw new BusinessRuleException("ยังไม่ได้ตั้งบัญชีธนาคารหลักสำหรับจ่ายเงินเดือน กรุณาตั้งที่ โครงสร้างองค์กร → บัญชีธนาคารบริษัท (เลือกเป็นบัญชีหลักจ่ายเงินเดือน)");

        var paymentDate = (period.PaymentDate ?? period.EndDate).ToString("yyyyMMdd");
        var readyItems = summary.Items.Where(i => i.Status == "READY").ToList();
        var sb = BuildBankFile(payer, readyItems, paymentDate);

        var preamble = System.Text.Encoding.UTF8.GetPreamble();
        var contentBytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return preamble.Concat(contentBytes).ToArray();
    }

    /// <summary>บัญชีบริษัทที่ใช้จ่ายเงินเดือน (บัญชีหลัก ACTIVE)</summary>
    private Task<CompanyBankAccount?> GetPayrollPayerAccountAsync(CancellationToken cancellationToken) =>
        _context.CompanyBankAccounts
            .Include(a => a.Bank)
            .AsNoTracking()
            .Where(a => a.IsPrimaryPayrollAccount && a.Status == "ACTIVE")
            .OrderBy(a => a.Id)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>
    /// ไฟล์โอนเงินเดือนรูปแบบกลาง (CSV: H = บัญชีต้นทาง, D = รายการโอน, T = ยอดรวม)
    /// หมายเหตุ: ไฟล์ Payroll ของแต่ละธนาคารมีรูปแบบเฉพาะ (มักเป็น fixed-width) — เมื่อได้ spec จากธนาคาร
    /// ให้เพิ่มรูปแบบโดยแยกตามรหัสธนาคารของบัญชีบริษัท (payer.Bank.BankCode) ที่ฟังก์ชันนี้
    /// </summary>
    private static System.Text.StringBuilder BuildBankFile(CompanyBankAccount payer, List<BankTransferItemDto> items, string paymentDate)
    {
        static string Csv(string? value) => $"\"{(value ?? string.Empty).Replace("\"", "\"\"")}\"";
        static string Digits(string? value) => new string((value ?? string.Empty).Where(char.IsDigit).ToArray());
        var inv = System.Globalization.CultureInfo.InvariantCulture;
        var total = items.Sum(i => i.NetPayableSalary);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("RECORD_TYPE,PAYER_BANK_CODE,PAYER_ACCOUNT_NUMBER,PAYER_ACCOUNT_NAME,PAYMENT_DATE,TOTAL_RECORDS,TOTAL_AMOUNT,CURRENCY");
        sb.AppendLine(string.Join(",", "H",
            payer.Bank?.BankCode ?? string.Empty,
            Digits(payer.AccountNumber),
            Csv(payer.AccountName),
            paymentDate,
            items.Count.ToString(inv),
            total.ToString("F2", inv),
            "THB"));

        sb.AppendLine("RECORD_TYPE,SEQUENCE,EMPLOYEE_CODE,RECEIVER_BANK_CODE,RECEIVER_ACCOUNT_NUMBER,RECEIVER_ACCOUNT_NAME,AMOUNT,CURRENCY");
        int seq = 1;
        foreach (var item in items)
        {
            // เลขบัญชีเป็นตัวเลขล้วน (ไม่ใช้สูตร Excel ="...") เพื่อให้ระบบธนาคารนำเข้าไฟล์ได้
            sb.AppendLine(string.Join(",", "D",
                seq.ToString("D4", inv),
                Csv(item.EmployeeCode),
                item.BankCode,
                Digits(item.AccountNumber),
                Csv(item.AccountName),
                item.NetPayableSalary.ToString("F2", inv),
                "THB"));
            seq++;
        }

        sb.AppendLine(string.Join(",", "T", items.Count.ToString(inv), total.ToString("F2", inv)));
        return sb;
    }

    public async Task<TaxSsoSummaryDto> GetTaxSsoSummaryAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
                .ThenInclude(pr => pr.Details)
                    .ThenInclude(d => d.PayrollItem)
            .Include(p => p.Payrolls)
                .ThenInclude(pr => pr.Employee)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken);

        if (period == null)
            throw new NotFoundException("PayrollPeriod", periodId);

        var ssoRate = await GetEffectiveSsoRateAsync(period.StartDate, period.EndDate, cancellationToken);

        var items = new List<TaxSsoItemDto>();
        decimal totalGross = 0;
        decimal totalPnd1 = 0;
        decimal totalSsoEmployee = 0;
        decimal totalSsoEmployer = 0;

        // อ่านยอดจากผลการคำนวณจริง (payroll_detail) แทนการคำนวณใหม่ด้วยสูตรตายตัว
        foreach (var pr in period.Payrolls.Where(p => p.Status == "CALCULATED"))
        {
            var emp = pr.Employee;
            decimal gross = pr.TotalGrossIncome;
            decimal ssoEmp = pr.Details.Where(d => d.PayrollItem?.ItemCode == "DED_SSO").Sum(d => d.Amount);
            decimal pnd1 = pr.Details.Where(d => d.PayrollItem?.ItemCode == "DED_TAX").Sum(d => d.Amount);

            // นายจ้างสมทบเฉพาะพนักงานที่อยู่ในระบบประกันสังคม (มีการหักส่วนลูกจ้าง)
            decimal ssoCompany = ssoEmp > 0 ? CalculateSsoContribution(gross, ssoRate.EmployerPercent, ssoRate) : 0;

            totalGross += gross;
            totalPnd1 += pnd1;
            totalSsoEmployee += ssoEmp;
            totalSsoEmployer += ssoCompany;

            items.Add(new TaxSsoItemDto
            {
                EmployeeId = pr.EmployeeId,
                EmployeeCode = emp?.EmployeeCode ?? $"EMP{pr.EmployeeId:D3}",
                EmployeeName = pr.SnapshotEmployeeName ?? (emp != null ? $"{emp.FirstName} {emp.LastName}" : $"พนักงาน #{pr.EmployeeId}"),
                CitizenId = emp?.CitizenIdMasked ?? "-",
                GrossIncome = gross,
                Pnd1Tax = pnd1,
                SsoEmployee = ssoEmp,
                SsoEmployer = ssoCompany
            });
        }

        return new TaxSsoSummaryDto
        {
            PeriodId = period.Id,
            PeriodName = GetThaiPeriodName(period.Year, period.Month),
            TotalGrossIncome = totalGross,
            TotalPnd1Tax = totalPnd1,
            TotalSsoEmployee = totalSsoEmployee,
            TotalSsoEmployer = totalSsoEmployer,
            TotalSsoCombined = totalSsoEmployee + totalSsoEmployer,
            EmployeeCount = items.Count,
            Items = items.OrderBy(i => i.EmployeeCode).ToList()
        };
    }

    public async Task<List<EmployeeBonusDto>> GetEmployeeBonusesAsync(int? year = null, CancellationToken cancellationToken = default)
    {
        int targetYear = year ?? DateTime.Today.Year;

        var employees = await _context.Employees
            .Where(e => e.EmploymentStatus == "ACTIVE")
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var salaries = await LoadLatestSalariesForYearAsync(targetYear, cancellationToken);

        // ดึงข้อมูลโบนัสที่เคยบันทึกไว้ในฐานข้อมูลสำหรับปีนี้
        var savedBonuses = await _context.EmployeeBonuses
            .Where(b => b.Year == targetYear)
            .ToListAsync(cancellationToken);

        var result = new List<EmployeeBonusDto>();

        foreach (var emp in employees)
        {
            var sal = salaries.FirstOrDefault(s => s.EmployeeId == emp.Id)?.BaseSalary ?? 0m;
            var deptName = emp.Assignments.FirstOrDefault()?.Department?.DepartmentName ?? "ฝ่ายบริหารทั่วไป";
            var posName = emp.Assignments.FirstOrDefault()?.Position?.PositionName ?? "-";

            var existing = savedBonuses.FirstOrDefault(b => b.EmployeeId == emp.Id);
            if (existing != null)
            {
                result.Add(new EmployeeBonusDto
                {
                    Id = existing.Id,
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    EmployeeName = $"{emp.FirstName} {emp.LastName}",
                    DepartmentName = deptName,
                    PositionName = posName,
                    Year = targetYear,
                    BaseSalary = existing.BaseSalary > 0 ? existing.BaseSalary : sal,
                    Multiplier = existing.Multiplier,
                    BonusAmount = existing.BonusAmount,
                    CalculationMode = existing.CalculationMode,
                    Note = existing.Note,
                    Status = existing.Status,
                    StatusText = existing.Status == "APPROVED" ? "อนุมัติแล้ว" : "คำนวณแล้ว"
                });
            }
            else
            {
                decimal defaultMultiplier = 2.0m;
                result.Add(new EmployeeBonusDto
                {
                    Id = emp.Id,
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    EmployeeName = $"{emp.FirstName} {emp.LastName}",
                    DepartmentName = deptName,
                    PositionName = posName,
                    Year = targetYear,
                    BaseSalary = sal,
                    Multiplier = defaultMultiplier,
                    BonusAmount = sal > 0 ? sal * defaultMultiplier : 0,
                    CalculationMode = "MULTIPLIER",
                    Note = null,
                    Status = "CALCULATED",
                    StatusText = "คำนวณแล้ว"
                });
            }
        }

        return result.OrderBy(r => r.EmployeeCode).ToList();
    }

    public async Task<List<EmployeeBonusDto>> CalculateEmployeeBonusesAsync(CalculateBonusRequest request, CancellationToken cancellationToken = default)
    {
        int targetYear = request.Year <= 0 ? DateTime.Today.Year : request.Year;
        decimal multiplier = request.DefaultMultiplier > 0 ? request.DefaultMultiplier : 2.0m;

        var employees = await _context.Employees
            .Where(e => e.EmploymentStatus == "ACTIVE")
            .Include(e => e.Assignments).ThenInclude(a => a.Department)
            .Include(e => e.Assignments).ThenInclude(a => a.Position)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var salaries = await LoadLatestSalariesForYearAsync(targetYear, cancellationToken);

        var existingBonuses = await _context.EmployeeBonuses
            .Where(b => b.Year == targetYear)
            .ToListAsync(cancellationToken);

        foreach (var emp in employees)
        {
            var sal = salaries.FirstOrDefault(s => s.EmployeeId == emp.Id)?.BaseSalary ?? 0m;
            if (sal <= 0) continue; // ยังไม่มีฐานเงินเดือน → ไม่คำนวณโบนัส (ห้ามใช้เงินเดือนสมมติ)
            decimal bonusAmount = Math.Round(sal * multiplier, 2);

            var existing = existingBonuses.FirstOrDefault(b => b.EmployeeId == emp.Id);
            if (existing != null)
            {
                existing.BaseSalary = sal;
                existing.Multiplier = multiplier;
                existing.BonusAmount = bonusAmount;
                existing.CalculationMode = "MULTIPLIER";
                existing.Status = "CALCULATED";
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.EmployeeBonuses.Add(new EmployeeBonus
                {
                    EmployeeId = emp.Id,
                    Year = targetYear,
                    BaseSalary = sal,
                    Multiplier = multiplier,
                    BonusAmount = bonusAmount,
                    CalculationMode = "MULTIPLIER",
                    Status = "CALCULATED",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetEmployeeBonusesAsync(targetYear, cancellationToken);
    }

    public async Task<List<EmployeeBonusDto>> SaveEmployeeBonusesAsync(SaveEmployeeBonusesRequest request, CancellationToken cancellationToken = default)
    {
        int targetYear = request.Year <= 0 ? DateTime.Today.Year : request.Year;

        var salaries = await LoadLatestSalariesForYearAsync(targetYear, cancellationToken);

        var existingBonuses = await _context.EmployeeBonuses
            .Where(b => b.Year == targetYear)
            .ToListAsync(cancellationToken);

        foreach (var item in request.Items)
        {
            var sal = salaries.FirstOrDefault(s => s.EmployeeId == item.EmployeeId)?.BaseSalary ?? 0m;
            decimal bonusAmount = Math.Max(0, item.BonusAmount);
            decimal multiplier = item.Multiplier ?? (sal > 0 ? Math.Round(bonusAmount / sal, 2) : 0);

            var existing = existingBonuses.FirstOrDefault(b => b.EmployeeId == item.EmployeeId);
            if (existing != null)
            {
                existing.BaseSalary = sal;
                existing.Multiplier = multiplier;
                existing.BonusAmount = bonusAmount;
                existing.CalculationMode = request.CalculationMode ?? "MANUAL";
                existing.Note = item.Note;
                existing.Status = "APPROVED";
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.EmployeeBonuses.Add(new EmployeeBonus
                {
                    EmployeeId = item.EmployeeId,
                    Year = targetYear,
                    BaseSalary = sal,
                    Multiplier = multiplier,
                    BonusAmount = bonusAmount,
                    CalculationMode = request.CalculationMode ?? "MANUAL",
                    Note = item.Note,
                    Status = "APPROVED",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetEmployeeBonusesAsync(targetYear, cancellationToken);
    }

    #endregion

        #region Payment Workflow

    /// <summary>แปลงและตรวจวันตัดรอบเงินเบิก: ว่าง = null, ต้องอยู่ระหว่างวันเริ่มรอบถึงวันกำหนดจ่าย</summary>
    private static DateOnly? ParseClaimCutoff(string? value, DateOnly startDate, DateOnly latest)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (!DateOnly.TryParse(value, out var cutoff))
            throw new BusinessRuleException("รูปแบบวันตัดรอบเงินเบิกไม่ถูกต้อง");
        if (cutoff < startDate.AddMonths(-1))
            throw new BusinessRuleException("วันตัดรอบเงินเบิกเร็วเกินไป (ต้องไม่ก่อนวันเริ่มรอบเกิน 1 เดือน)");
        if (cutoff > latest)
            throw new BusinessRuleException("วันตัดรอบเงินเบิกต้องไม่หลังวันกำหนดจ่ายเงิน");
        return cutoff;
    }

    public async Task<PayrollPeriodDto> UpdateClaimCutoffAsync(long periodId, UpdateClaimCutoffRequest request, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (BenefitPayCode.LockedPeriodStatuses.Contains(period.Status))
            throw new BusinessRuleException("รอบเงินเดือนนี้อนุมัติ/ปิดแล้ว ไม่สามารถเปลี่ยนวันตัดรอบเงินเบิกได้");

        period.ClaimCutoffDate = ParseClaimCutoff(request.ClaimCutoffDate, period.StartDate, period.PaymentDate ?? period.EndDate);
        await _context.SaveChangesAsync(cancellationToken);
        return MapPeriodToDto(period);
    }

    public async Task<PayrollPeriodDto> SetPaymentMethodAsync(long periodId, SetPaymentMethodRequest request, CancellationToken cancellationToken = default)
    {
        var validMethods = new[] { "BANK_BATCH", "DIRECT_TRANSFER" };
        if (!validMethods.Contains(request.PaymentMethod))
            throw new BusinessRuleException($"วิธีการจ่ายเงินไม่ถูกต้อง ต้องเป็น BANK_BATCH หรือ DIRECT_TRANSFER");

        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "APPROVED")
            throw new BusinessRuleException("รอบเงินเดือนต้องอยู่ในสถานะ APPROVED เพื่อตั้งค่าวิธีการจ่ายเงิน");

        period.PaymentMethod = request.PaymentMethod;

        if (request.PaymentMethod == "DIRECT_TRANSFER")
        {
            foreach (var payroll in period.Payrolls)
            {
                if (payroll.SlipData == null || payroll.SlipData.Length == 0)
                {
                    payroll.PaymentStatus = "PENDING";
                    payroll.TransferredAt = null;
                    payroll.TransferReference = null;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return MapPeriodToDto(period);
    }

    public async Task<PayrollTransferListDto> GetTransferListAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
                .ThenInclude(payroll => payroll.Employee)
                    .ThenInclude(emp => emp!.BankAccounts.Where(b => b.IsPrimary && b.Status == "ACTIVE"))
                        .ThenInclude(ba => ba.Bank)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        var items = period.Payrolls.Where(IsPayableRecord).Select(payroll =>
        {
            var primaryBank = payroll.Employee?.BankAccounts.FirstOrDefault();
            bool hasSlip = payroll.SlipData != null && payroll.SlipData.Length > 0;
            
            // In Direct Transfer mode, payment status is only TRANSFERRED if a slip is actually uploaded!
            string effectiveStatus = (period.PaymentMethod == "DIRECT_TRANSFER" || string.IsNullOrEmpty(period.PaymentMethod))
                ? (hasSlip ? "TRANSFERRED" : "PENDING")
                : payroll.PaymentStatus;

            return new PayrollTransferItemDto
            {
                PayrollId = payroll.Id,
                EmployeeId = payroll.EmployeeId,
                EmployeeCode = payroll.Employee?.EmployeeCode ?? "",
                EmployeeName = payroll.SnapshotEmployeeName ?? $"{payroll.Employee?.FirstName} {payroll.Employee?.LastName}",
                DepartmentName = payroll.SnapshotDepartmentName ?? "",
                BankCode = primaryBank?.Bank?.BankCode ?? "",
                BankName = primaryBank?.Bank?.BankName ?? "",
                AccountNumber = primaryBank?.AccountNumber ?? "",
                AccountName = primaryBank?.AccountName ?? "",
                AccountType = primaryBank?.AccountType ?? "",
                NetPayableSalary = payroll.NetPayableSalary,
                PaymentStatus = effectiveStatus,
                PaymentStatusText = MapPaymentStatusText(effectiveStatus),
                TransferredAt = effectiveStatus == "TRANSFERRED" ? payroll.TransferredAt : null,
                TransferReference = effectiveStatus == "TRANSFERRED" ? payroll.TransferReference : null,
                HasSlip = hasSlip,
                SlipFileName = payroll.SlipFileName,
                SlipUploadedAt = payroll.SlipUploadedAt,
            };
        }).OrderBy(i => i.EmployeeCode).ToList();

        int transferredCount = items.Count(i => i.PaymentStatus == "TRANSFERRED");
        // CanConfirm: ทุกคนต้องเป็น TRANSFERRED และมี Slip
        bool canConfirm = items.Count > 0
            && items.All(i => i.PaymentStatus == "TRANSFERRED" && i.HasSlip);

        return new PayrollTransferListDto
        {
            PeriodId = period.Id,
            PeriodName = $"{ThaiMonths[period.Month <= 12 ? period.Month : 1]} {period.Year + 543}",
            PaymentMethod = period.PaymentMethod,
            Status = period.Status,
            TotalEmployees = items.Count,
            TransferredCount = transferredCount,
            PendingCount = items.Count - transferredCount,
            TotalNetSalary = items.Sum(i => i.NetPayableSalary),
            CanConfirmPayment = canConfirm,
            Items = items
        };
    }

    public async Task<PayrollTransferItemDto> MarkTransferredAsync(long periodId, long payrollId, MarkTransferredRequest request, CancellationToken cancellationToken = default)
    {
        // Validate Slip fields — Slip is REQUIRED
        if (string.IsNullOrWhiteSpace(request.SlipBase64))
            throw new BusinessRuleException("กรุณาแนบสลิปการโอนเงินสำหรับพนักงานทุกคน");
        if (string.IsNullOrWhiteSpace(request.SlipFileName))
            throw new BusinessRuleException("กรุณาระบุชื่อไฟล์ Slip");
        if (string.IsNullOrWhiteSpace(request.SlipContentType))
            throw new BusinessRuleException("กรุณาระบุประเภทไฟล์ Slip");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" };
        if (!allowedTypes.Contains(request.SlipContentType.ToLower()))
            throw new BusinessRuleException("ไฟล์ Slip ต้องเป็น JPG, PNG, WEBP หรือ PDF เท่านั้น");

        byte[] slipBytes;
        try { slipBytes = Convert.FromBase64String(request.SlipBase64); }
        catch { throw new BusinessRuleException("ข้อมูล Slip ไม่ถูกต้อง (Base64 Invalid)"); }

        if (slipBytes.Length > 10 * 1024 * 1024) // 10MB limit
            throw new BusinessRuleException("ขนาดไฟล์ Slip ต้องไม่เกิน 10 MB");

        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
                .ThenInclude(e => e!.BankAccounts.Where(b => b.IsPrimary && b.Status == "ACTIVE"))
                    .ThenInclude(ba => ba.Bank)
            .FirstOrDefaultAsync(p => p.Id == payrollId && p.PeriodId == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลเงินเดือนพนักงาน");

        var period = await _context.PayrollPeriods.FindAsync(new object[] { periodId }, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "APPROVED" && period.Status != "PROCESSING")
            throw new BusinessRuleException("รอบเงินเดือนต้องอยู่ในสถานะ APPROVED หรือ PROCESSING");

        if (period.PaymentMethod == "BANK_BATCH")
            throw new BusinessRuleException("รอบเงินเดือนนี้จ่ายผ่านไฟล์ธนาคาร (BANK_BATCH) ไม่สามารถบันทึกการโอนรายบุคคลได้");

        if (!IsPayableRecord(payroll))
            throw new BusinessRuleException("พนักงานคนนี้ไม่มียอดเงินเดือนที่ต้องโอนในรอบนี้");

        var primaryBank = payroll.Employee?.BankAccounts.FirstOrDefault();
        if (primaryBank == null || string.IsNullOrWhiteSpace(primaryBank.AccountNumber))
            throw new BusinessRuleException("ไม่สามารถบันทึกการโอนเงินได้ เนื่องจากพนักงานยังไม่มีข้อมูลบัญชีธนาคารหลัก กรุณาเพิ่มข้อมูลบัญชีธนาคารของพนักงานก่อน");

        // Mark payroll record
        payroll.PaymentStatus = "TRANSFERRED";
        payroll.TransferredAt = DateTimeOffset.UtcNow;
        payroll.TransferReference = request.TransferReference?.Trim();
        payroll.SlipData = slipBytes;
        payroll.SlipFileName = request.SlipFileName;
        payroll.SlipContentType = request.SlipContentType;
        payroll.SlipUploadedAt = DateTimeOffset.UtcNow;

        // Update period status to PROCESSING if first transfer
        if (period.Status == "APPROVED")
            period.Status = "PROCESSING";

        await _context.SaveChangesAsync(cancellationToken);

        // Update transferred count
        period.TotalTransferredCount = await _context.Payrolls
            .CountAsync(p => p.PeriodId == periodId && p.PaymentStatus == "TRANSFERRED", cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new PayrollTransferItemDto
        {
            PayrollId = payroll.Id,
            EmployeeId = payroll.EmployeeId,
            EmployeeCode = payroll.Employee?.EmployeeCode ?? "",
            EmployeeName = payroll.SnapshotEmployeeName ?? "",
            DepartmentName = payroll.SnapshotDepartmentName ?? "",
            BankCode = primaryBank?.Bank?.BankCode ?? "",
            BankName = primaryBank?.Bank?.BankName ?? "",
            AccountNumber = primaryBank?.AccountNumber ?? "",
            AccountName = primaryBank?.AccountName ?? "",
            AccountType = primaryBank?.AccountType ?? "",
            NetPayableSalary = payroll.NetPayableSalary,
            PaymentStatus = payroll.PaymentStatus,
            PaymentStatusText = MapPaymentStatusText(payroll.PaymentStatus),
            TransferredAt = payroll.TransferredAt,
            TransferReference = payroll.TransferReference,
            HasSlip = payroll.SlipData != null,
            SlipFileName = payroll.SlipFileName,
            SlipUploadedAt = payroll.SlipUploadedAt,
        };
    }

    public async Task<PayrollPeriodDto> ConfirmPaymentAsync(long periodId, ConfirmPaymentRequest request, long confirmedByEmployeeId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "PROCESSING" && period.Status != "APPROVED")
            throw new BusinessRuleException("รอบเงินเดือนต้องอยู่ในสถานะ APPROVED หรือ PROCESSING เพื่อ Confirm การจ่ายเงิน");

        if (period.PaymentMethod == "BANK_BATCH")
            throw new BusinessRuleException("รอบเงินเดือนนี้จ่ายผ่านไฟล์ธนาคาร กรุณาใช้ขั้นตอนยืนยันการโอนผ่านธนาคารแทน");

        // Business Rule: ทุกคนต้องมี Slip และ TRANSFERRED
        // เฉพาะพนักงานที่มียอดต้องโอนจริง (คนที่ได้ 0 บาทไม่ต้องแนบสลิป)
        var payrolls = period.Payrolls.Where(IsPayableRecord).ToList();
        if (!payrolls.Any())
            throw new BusinessRuleException("ไม่มีข้อมูลเงินเดือนในรอบนี้");

        var missingSlip = payrolls.Where(p => p.SlipData == null || p.SlipData.Length == 0).ToList();
        if (missingSlip.Any())
            throw new BusinessRuleException($"ยังมีพนักงาน {missingSlip.Count} คนที่ยังไม่ได้แนบสลิปการโอนเงิน ไม่อนุญาตให้กดโอนเงินเรียบร้อย ห้ามเปลี่ยนสถานะจนกว่าจะโอนเงินและแนบสลิปครบทุกคน");

        var notTransferred = payrolls.Where(p => p.PaymentStatus != "TRANSFERRED").ToList();
        if (notTransferred.Any())
            throw new BusinessRuleException($"ยังมีพนักงาน {notTransferred.Count} คนที่ยังไม่ได้โอนเงิน ไม่อนุญาตให้กดโอนเงินเรียบร้อย ห้ามเปลี่ยนสถานะจนกว่าจะโอนเงินและแนบสลิปครบทุกคน");

        // Confirm payment
        period.Status = "PAID";
        period.PaymentConfirmedAt = DateTimeOffset.UtcNow;
        period.PaymentConfirmedBy = confirmedByEmployeeId;
        period.PaymentNote = request.Note?.Trim();
        period.TotalTransferredCount = payrolls.Count;

        await _context.SaveChangesAsync(cancellationToken);
        return MapPeriodToDto(period);
    }

    public async Task<SlipDownloadDto> GetPayrollSlipAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        var payroll = await _context.Payrolls
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลเงินเดือนพนักงาน");

        if (payroll.SlipData == null || payroll.SlipData.Length == 0)
            throw new BusinessRuleException("ไม่พบไฟล์ Slip สำหรับพนักงานคนนี้");

        return new SlipDownloadDto
        {
            FileName = payroll.SlipFileName ?? "slip.jpg",
            ContentType = payroll.SlipContentType ?? "application/octet-stream",
            Data = payroll.SlipData
        };
    }

    public async Task<byte[]> GenerateAndMarkBankFileAsync(long periodId, string? bankCode, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods.FindAsync(new object[] { periodId }, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "APPROVED" && period.Status != "PROCESSING")
            throw new BusinessRuleException("รอบเงินเดือนต้องอยู่ในสถานะ APPROVED หรือ PROCESSING");

        if (period.PaymentMethod == "DIRECT_TRANSFER")
            throw new BusinessRuleException("รอบเงินเดือนนี้ใช้วิธีโอนเงินรายบุคคล (DIRECT_TRANSFER) ไม่สามารถสร้างไฟล์ธนาคารได้");

        // Generate file (reuse existing logic)
        var bytes = await GenerateBankTransferFileAsync(periodId, bankCode ?? "ALL", cancellationToken);

        // Mark as file generated
        period.PaymentMethod ??= "BANK_BATCH";
        period.BankFileGeneratedAt = DateTimeOffset.UtcNow;
        if (period.Status == "APPROVED")
            period.Status = "PROCESSING";

        await _context.SaveChangesAsync(cancellationToken);
        return bytes;
    }

    public async Task<PayrollPeriodDto> ConfirmBankTransferAsync(long periodId, ConfirmPaymentRequest request, long confirmedByEmployeeId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "PROCESSING" && period.Status != "APPROVED" && period.Status != "PROCESSING_BANK")
            throw new BusinessRuleException("รอบเงินเดือนต้องอยู่ในสถานะ PROCESSING เพื่อ Confirm Bank Transfer");

        if (string.IsNullOrEmpty(period.PaymentMethod))
        {
            period.PaymentMethod = "BANK_BATCH";
        }
        else if (period.PaymentMethod != "BANK_BATCH")
        {
            throw new BusinessRuleException("รอบเงินเดือนนี้ไม่ได้ใช้วิธีการจ่ายผ่านธนาคาร");
        }

        if (period.BankFileGeneratedAt == null)
        {
            period.BankFileGeneratedAt = DateTimeOffset.UtcNow;
        }

        // Mark all individual payrolls as transferred (bank did it)
        foreach (var payroll in period.Payrolls.Where(IsPayableRecord))
        {
            payroll.PaymentStatus = "TRANSFERRED";
            payroll.TransferredAt = DateTimeOffset.UtcNow;
        }

        period.Status = "PROCESSING_BANK";
        period.PaymentConfirmedAt = DateTimeOffset.UtcNow;
        period.PaymentConfirmedBy = confirmedByEmployeeId;
        period.PaymentNote = request.Note?.Trim();
        period.TotalTransferredCount = period.Payrolls.Count(IsPayableRecord);

        await _context.SaveChangesAsync(cancellationToken);
        return MapPeriodToDto(period);
    }

    public async Task<PayrollPeriodDto> SubmitToFinanceAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "REVIEW")
            throw new BusinessRuleException($"ส่งให้ฝ่ายการเงินได้เฉพาะรอบที่อยู่ในสถานะ 'REVIEW' (คำนวณแล้ว) เท่านั้น สถานะปัจจุบัน: '{period.Status}'");

        if (!period.Payrolls.Any(p => p.Status == "CALCULATED"))
            throw new BusinessRuleException("กรุณากดคำนวณเงินเดือนก่อนส่งให้ฝ่ายการเงิน/บัญชี");

        period.Status = "SUBMITTED_TO_FINANCE";
        await _context.SaveChangesAsync(cancellationToken);
        return MapPeriodToDto(period);
    }

    public async Task<PayrollPeriodDto> VerifyByFinanceAsync(long periodId, long employeeId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.Status != "SUBMITTED_TO_FINANCE")
            throw new BusinessRuleException($"ฝ่ายการเงินตรวจสอบได้เฉพาะรอบที่ HR ส่งมาแล้ว (สถานะ 'SUBMITTED_TO_FINANCE') สถานะปัจจุบัน: '{period.Status}'");

        period.Status = "FINANCE_VERIFIED";
        period.FinanceVerifiedAt = DateTimeOffset.UtcNow;
        period.FinanceVerifiedBy = employeeId;
        await _context.SaveChangesAsync(cancellationToken);
        return MapPeriodToDto(period);
    }

    public async Task<PayrollPeriodDto> UploadBankReceiptAndMarkPaidAsync(long periodId, UploadBankReceiptRequest request, long employeeId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Base64Data))
            throw new BusinessRuleException("กรุณาแนบไฟล์สลิป/ใบเสร็จการโอนเงินรวมของธนาคาร");

        var allowedReceiptTypes = new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" };
        if (string.IsNullOrWhiteSpace(request.ContentType) || !allowedReceiptTypes.Contains(request.ContentType.ToLower()))
            throw new BusinessRuleException("ไฟล์สลิปธนาคารต้องเป็น JPG, PNG, WEBP หรือ PDF เท่านั้น");

        byte[] receiptBytes;
        try { receiptBytes = Convert.FromBase64String(request.Base64Data); }
        catch { throw new BusinessRuleException("ข้อมูลสลิปธนาคารไม่ถูกต้อง (Base64 Invalid)"); }

        if (receiptBytes.Length > 10 * 1024 * 1024) // 10MB limit
            throw new BusinessRuleException("ขนาดไฟล์สลิปธนาคารต้องไม่เกิน 10 MB");

        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        var receiptAllowedStatuses = new[] { "APPROVED", "PROCESSING", "PROCESSING_BANK", "PAID" };
        if (!receiptAllowedStatuses.Contains(period.Status))
            throw new BusinessRuleException($"แนบสลิปธนาคารได้เฉพาะรอบที่อนุมัติแล้วเท่านั้น สถานะปัจจุบัน: '{period.Status}'");

        if (request.MarkAsPaid && period.Status != "PAID")
        {
            if (period.PaymentMethod == "DIRECT_TRANSFER")
                throw new BusinessRuleException("รอบเงินเดือนนี้ใช้วิธีโอนเงินรายบุคคล ต้องแนบสลิปครบทุกคนแล้วกดยืนยันการจ่ายเงิน ไม่สามารถยืนยันด้วยสลิปธนาคารรวมได้");
            period.PaymentMethod ??= "BANK_BATCH";
        }

        period.BankReceiptData = receiptBytes;
        period.BankReceiptFileName = request.FileName;
        period.BankReceiptContentType = request.ContentType;

        if (request.MarkAsPaid && period.Status != "PAID")
        {
            period.Status = "PAID";
            period.PaymentConfirmedAt = DateTimeOffset.UtcNow;
            period.PaymentConfirmedBy = employeeId;
            if (!string.IsNullOrWhiteSpace(request.Note))
                period.PaymentNote = request.Note.Trim();
            period.TotalTransferredCount = period.Payrolls.Count(IsPayableRecord);

            foreach (var p in period.Payrolls.Where(IsPayableRecord))
            {
                p.PaymentStatus = "TRANSFERRED";
                if (p.TransferredAt == null)
                    p.TransferredAt = DateTimeOffset.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return MapPeriodToDto(period);
    }

    public async Task<SlipDownloadDto> GetBankReceiptAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (period.BankReceiptData == null || period.BankReceiptData.Length == 0)
            throw new BusinessRuleException("ไม่พบไฟล์สลิป/ใบเสร็จการโอนเงินรวมของธนาคารในรอบนี้");

        return new SlipDownloadDto
        {
            FileName = period.BankReceiptFileName ?? "bank_receipt.pdf",
            ContentType = period.BankReceiptContentType ?? "application/pdf",
            Data = period.BankReceiptData
        };
    }

    // ===== PRIVATE HELPERS =====

    private static string MapPaymentStatusText(string status) => status switch
    {
        "PENDING" => "รอโอน",
        "TRANSFERRED" => "โอนแล้ว",
        "FAILED" => "โอนไม่สำเร็จ",
        _ => status
    };

    private static PayrollPeriodDto MapPeriodToDto(PayrollPeriod period, List<long>? permittedEmployeeIds = null)
    {
        var statusText = period.Status switch
        {
            "DRAFT" => "ร่าง",
            "REVIEW" => "รอตรวจสอบ",
            "SUBMITTED_TO_FINANCE" => "ส่งการเงินตรวจสอบ",
            "FINANCE_VERIFIED" => "การเงินตรวจสอบแล้ว",
            "PENDING_APPROVAL" => "รออนุมัติ",
            "APPROVED" => "อนุมัติแล้ว",
            "PROCESSING" => "กำลังดำเนินการจ่าย",
            "PROCESSING_BANK" => "ส่งโอนธนาคารแล้ว",
            "PAID" => "โอนเงินสำเร็จแล้ว",
            "CLOSED" => "ปิดรอบแล้ว",
            _ => period.Status
        };
        var methodText = period.PaymentMethod switch
        {
            "BANK_BATCH" => "ส่งไฟล์ธนาคาร",
            "DIRECT_TRANSFER" => "CEO โอนเอง",
            _ => null
        };
        var payrolls = period.Payrolls
            .Where(p => permittedEmployeeIds == null || permittedEmployeeIds.Contains(p.EmployeeId))
            .ToList();
        var payableRecords = payrolls.Where(IsPayableRecord).ToList();
        bool canConfirm = payableRecords.Count > 0
            && payableRecords.All(p => p.PaymentStatus == "TRANSFERRED" && p.SlipData != null);

        return new PayrollPeriodDto
        {
            Id = period.Id,
            Year = period.Year,
            Month = period.Month,
            PeriodName = $"{ThaiMonths[period.Month <= 12 ? period.Month : 1]} {period.Year + 543}",
            StartDate = period.StartDate.ToString("yyyy-MM-dd"),
            EndDate = period.EndDate.ToString("yyyy-MM-dd"),
            PaymentDate = period.PaymentDate?.ToString("yyyy-MM-dd"),
            ClaimCutoffDate = period.ClaimCutoffDate?.ToString("yyyy-MM-dd"),
            EffectiveClaimCutoffDate = period.EffectiveClaimCutoffDate.ToString("yyyy-MM-dd"),
            Status = period.Status,
            StatusText = statusText,
            EmployeeCount = payrolls.Count,
            TotalNetSalary = payrolls.Sum(p => p.NetPayableSalary),
            PaymentMethod = period.PaymentMethod,
            PaymentMethodText = methodText,
            FinanceVerifiedAt = period.FinanceVerifiedAt,
            FinanceVerifiedBy = period.FinanceVerifiedBy,
            PaymentConfirmedAt = period.PaymentConfirmedAt,
            PaymentConfirmedBy = period.PaymentConfirmedBy,
            BankFileGeneratedAt = period.BankFileGeneratedAt,
            TotalTransferredCount = period.TotalTransferredCount,
            PaymentNote = period.PaymentNote,
            HasBankReceipt = period.BankReceiptData != null && period.BankReceiptData.Length > 0,
            BankReceiptFileName = period.BankReceiptFileName,
            CanConfirmPayment = canConfirm,
        };
    }

    #endregion
}

