using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Contracts.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Contracts.Services;

/// <summary>
/// Service จัดการข้อมูลสัญญาจ้างงาน และไทม์ไลน์สถานะพนักงาน
/// </summary>
public class EmploymentContractService : IEmploymentContractService
{
    private readonly IHrmsDbContext _context;

    public EmploymentContractService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<EmploymentContractDto>> GetAllAsync(
        string? search,
        string? contractType,
        string? status,
        CancellationToken cancellationToken = default)
    {
        var query = _context.EmploymentContracts
            .Include(c => c.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Position)
            .Include(c => c.EmployeeType)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c =>
                c.Employee != null && (
                    c.Employee.EmployeeCode.ToLower().Contains(s) ||
                    c.Employee.FirstName.ToLower().Contains(s) ||
                    c.Employee.LastName.ToLower().Contains(s) ||
                    (c.Employee.FirstName + " " + c.Employee.LastName).ToLower().Contains(s)
                ));
        }

        if (!string.IsNullOrWhiteSpace(contractType) && contractType != "ALL")
        {
            query = query.Where(c => c.ContractType == contractType);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            query = query.Where(c => c.Status == status);
        }

        var contracts = await query
            .OrderByDescending(c => c.StartDate)
            .ThenByDescending(c => c.Id)
            .ToListAsync(cancellationToken);

        return contracts.Select(MapToDto).ToList();
    }

    public async Task<ContractSummaryStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var allContracts = await _context.EmploymentContracts
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var in7Days = today.AddDays(7);

        var probationCount = allContracts.Count(c => c.Status == "ACTIVE" && c.ContractType == "PROBATION");
        var permanentCount = allContracts.Count(c => c.Status == "ACTIVE" && c.ContractType == "PERMANENT");
        
        // ใกล้ครบทดลองงาน (7 วัน)
        var probationExpiring7Days = allContracts.Count(c =>
            c.Status == "ACTIVE" &&
            c.ContractType == "PROBATION" &&
            c.ProbationEndDate.HasValue &&
            c.ProbationEndDate.Value >= today &&
            c.ProbationEndDate.Value <= in7Days);

        return new ContractSummaryStatsDto
        {
            ProbationCount = probationCount,
            PermanentCount = permanentCount,
            ProbationExpiring7DaysCount = probationExpiring7Days,
            TotalActiveCount = allContracts.Count(c => c.Status == "ACTIVE")
        };
    }

    public async Task<EmploymentContractDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var contract = await _context.EmploymentContracts
            .Include(c => c.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Position)
            .Include(c => c.EmployeeType)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        return MapToDto(contract);
    }

    public async Task<List<EmploymentContractDto>> GetByEmployeeIdAsync(long employeeId, CancellationToken cancellationToken = default)
    {
        var contracts = await _context.EmploymentContracts
            .Include(c => c.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Department)
            .Include(c => c.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Position)
            .Include(c => c.EmployeeType)
            .Where(c => c.EmployeeId == employeeId)
            .OrderByDescending(c => c.StartDate)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return contracts.Select(MapToDto).ToList();
    }

    public async Task<List<EmployeeCareerTimelineDto>> GetTimelineByEmployeeIdAsync(
        long employeeId,
        CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("พนักงาน", employeeId);
        }

        var assignments = await _context.EmployeeAssignments
            .Include(a => a.Position)
            .Include(a => a.Department)
            .Include(a => a.Division)
            .Include(a => a.ManagerEmployee)
            .Where(a => a.EmployeeId == employeeId)
            .OrderBy(a => a.EffectiveFrom)
            .ThenBy(a => a.Id)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var empName = $"{employee.FirstName} {employee.LastName}".Trim();

        return assignments.Select(a =>
        {
            var startStr = FormatBuddhistDate(a.EffectiveFrom);
            var endStr = a.EffectiveTo.HasValue ? FormatBuddhistDate(a.EffectiveTo.Value) : "ปัจจุบัน";
            var dateRangeDisplay = $"{startStr} – {endStr}";

            var divName = a.Division?.DivisionName ?? "-";
            var deptName = a.Department?.DepartmentName ?? "-";
            var mgrName = a.ManagerEmployee != null 
                ? $"{a.ManagerEmployee.FirstName} {a.ManagerEmployee.LastName}".Trim()
                : "-";

            var hierarchyDisplay = $"{divName} / {deptName} · หัวหน้างาน: {mgrName}";

            return new EmployeeCareerTimelineDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = empName,
                EmployeeCode = employee.EmployeeCode,
                PositionName = a.Position?.PositionName ?? "-",
                DivisionName = divName,
                DepartmentName = deptName,
                ManagerName = mgrName,
                EffectiveFrom = a.EffectiveFrom,
                EffectiveTo = a.EffectiveTo,
                IsCurrent = a.IsCurrent,
                DateRangeDisplay = dateRangeDisplay,
                HierarchyDisplay = hierarchyDisplay
            };
        }).ToList();
    }

    public async Task<EmploymentContractDto> CreateAsync(
        CreateEmploymentContractRequest request,
        CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("พนักงาน", request.EmployeeId);
        }

        // ตรวจสอบสัญญาที่มีผลบังคับใช้อยู่เดิม (Active Contract Overlap Check)
        if (request.Status == "ACTIVE")
        {
            var activeContracts = await _context.EmploymentContracts
                .Where(c => c.EmployeeId == request.EmployeeId && c.Status == "ACTIVE")
                .ToListAsync(cancellationToken);

            foreach (var ac in activeContracts)
            {
                var existingStart = ac.StartDate;
                var existingEnd = ac.TerminationDate ?? (ac.ContractEndDate.HasValue ? ac.ContractEndDate.Value.AddDays(1) : (DateOnly?)null);

                // หากสัญญาเดิมไม่มีกำหนดสิ้นสุด (infinity) หรือวันเริ่มสัญญาใหม่ตกอยู่ในช่วงสัญญาเดิม
                if (!existingEnd.HasValue || (request.StartDate >= existingStart && request.StartDate < existingEnd.Value))
                {
                    throw new BusinessRuleException(
                        $"พนักงาน {employee.FirstName} {employee.LastName} มีสัญญาจ้าง ({GetContractTypeDisplay(ac.ContractType)}) ที่ใช้งานอยู่แล้ว " +
                        $"เริ่มตั้งแต่วันที่ {FormatBuddhistDate(existingStart)} " +
                        $"กรุณาบันทึกสิ้นสุดสัญญาเดิมก่อนออกสัญญาฉบับใหม่ เพื่อป้องกันช่วงเวลาทับซ้อน");
                }
            }
        }

        // กำหนดวันสิ้นสุดตามประเภทสัญญา
        DateOnly? probationEndDate = null;
        DateOnly? contractEndDate = null;

        if (request.ContractType == "PROBATION")
        {
            // หากไม่ได้ใส่วันที่สิ้นสุดมา ให้คำนวณตามมาตรฐานกฎหมายแรงงานไทย 119 วัน
            probationEndDate = request.EndDate ?? request.StartDate.AddDays(119);
        }
        else if (request.ContractType == "FIXED_TERM")
        {
            contractEndDate = request.EndDate;
        }

        var contract = new EmploymentContract
        {
            EmployeeId = request.EmployeeId,
            EmployeeTypeId = request.EmployeeTypeId,
            ContractType = request.ContractType,
            WageType = request.WageType ?? "MONTHLY",
            StartDate = request.StartDate,
            ProbationEndDate = probationEndDate,
            ContractEndDate = contractEndDate,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status
        };

        _context.EmploymentContracts.Add(contract);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(contract.Id, cancellationToken);
    }

    public async Task<EmploymentContractDto> UpdateAsync(
        long id,
        UpdateEmploymentContractRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _context.EmploymentContracts
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        if (!string.IsNullOrWhiteSpace(request.ContractType))
            contract.ContractType = request.ContractType;

        if (!string.IsNullOrWhiteSpace(request.WageType))
            contract.WageType = request.WageType;

        if (request.StartDate.HasValue)
            contract.StartDate = request.StartDate.Value;

        if (request.ProbationEndDate.HasValue)
            contract.ProbationEndDate = request.ProbationEndDate;

        if (request.ProbationPassedDate.HasValue)
            contract.ProbationPassedDate = request.ProbationPassedDate;

        if (request.ContractEndDate.HasValue)
            contract.ContractEndDate = request.ContractEndDate;

        if (request.TerminationDate.HasValue)
            contract.TerminationDate = request.TerminationDate;

        if (!string.IsNullOrWhiteSpace(request.TerminationReason))
            contract.TerminationReason = request.TerminationReason;

        if (!string.IsNullOrWhiteSpace(request.Status))
            contract.Status = request.Status;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(contract.Id, cancellationToken);
    }

    public async Task<bool> TerminateAsync(
        long id,
        string? reason,
        DateOnly? terminationDate,
        CancellationToken cancellationToken = default)
    {
        var contract = await _context.EmploymentContracts
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        var tDate = terminationDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        contract.Status = "TERMINATED";
        contract.TerminationDate = tDate;
        contract.TerminationReason = reason ?? "สิ้นสุดสัญญาตามกำหนด";

        var statusHistory = new EmployeeStatusHistory
        {
            EmployeeId = contract.EmployeeId,
            SourceContractId = contract.Id,
            Status = "TERMINATED",
            EffectiveFrom = tDate,
            Reason = contract.TerminationReason,
            CreatedAt = DateTime.UtcNow
        };

        _context.EmployeeStatusHistories.Add(statusHistory);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var contract = await _context.EmploymentContracts
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        _context.EmploymentContracts.Remove(contract);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static EmploymentContractDto MapToDto(EmploymentContract c)
    {
        var currentAssignment = c.Employee?.Assignments?.FirstOrDefault(a => a.IsCurrent);

        DateOnly? effectiveEndDate = null;
        if (c.ContractType == "PROBATION")
            effectiveEndDate = c.ProbationEndDate;
        else if (c.ContractType == "FIXED_TERM")
            effectiveEndDate = c.ContractEndDate;
        else if (c.TerminationDate.HasValue)
            effectiveEndDate = c.TerminationDate;

        return new EmploymentContractDto
        {
            Id = c.Id,
            EmployeeId = c.EmployeeId,
            EmployeeCode = c.Employee?.EmployeeCode ?? string.Empty,
            EmployeeName = c.Employee != null ? $"{c.Employee.FirstName} {c.Employee.LastName}".Trim() : string.Empty,
            DepartmentName = currentAssignment?.Department?.DepartmentName,
            PositionTitle = currentAssignment?.Position?.PositionName,
            EmployeeTypeId = c.EmployeeTypeId,
            EmployeeTypeName = c.EmployeeType?.TypeName,
            ContractType = c.ContractType,
            ContractTypeDisplay = GetContractTypeDisplay(c.ContractType),
            WageType = c.WageType,
            StartDate = c.StartDate,
            StartDateDisplay = FormatBuddhistDate(c.StartDate),
            ProbationEndDate = c.ProbationEndDate,
            ProbationEndDateDisplay = FormatBuddhistDate(c.ProbationEndDate),
            ProbationPassedDate = c.ProbationPassedDate,
            ContractEndDate = c.ContractEndDate,
            ContractEndDateDisplay = FormatBuddhistDate(c.ContractEndDate),
            EffectiveEndDateDisplay = FormatBuddhistDate(effectiveEndDate),
            TerminationDate = c.TerminationDate,
            TerminationReason = c.TerminationReason,
            Status = c.Status,
            StatusDisplay = GetStatusDisplay(c.Status),
            ApprovalInstanceId = c.ApprovalInstanceId
        };
    }

    private static string GetContractTypeDisplay(string contractType)
    {
        return contractType?.ToUpperInvariant() switch
        {
            "PROBATION" => "ทดลองงาน",
            "PERMANENT" => "ประจำ",
            "FIXED_TERM" => "สัญญาจ้าง",
            _ => "อื่นๆ"
        };
    }

    private static string GetStatusDisplay(string status)
    {
        return status?.ToUpperInvariant() switch
        {
            "ACTIVE" => "ใช้งาน",
            "COMPLETED" => "สิ้นสุดแล้ว",
            "TERMINATED" => "สิ้นสุดแล้ว",
            "PENDING_APPROVAL" => "รออนุมัติ",
            "CANCELLED" => "ยกเลิก",
            _ => status ?? "-"
        };
    }

    private static string FormatBuddhistDate(DateOnly? date)
    {
        if (!date.HasValue) return "-";
        // รูปแบบ พ.ศ.: วัน/เดือน/ปี (ปี ค.ศ. + 543)
        var d = date.Value;
        var buddhistYear = d.Year + 543;
        return $"{d.Day:D2}/{d.Month:D2}/{buddhistYear}";
    }
}
