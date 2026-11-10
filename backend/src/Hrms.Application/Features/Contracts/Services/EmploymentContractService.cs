using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.Contracts.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Contracts.Services;

/// <summary>
/// Service จัดการข้อมูลสัญญาจ้างงาน และไทม์ไลน์สถานะพนักงาน
/// </summary>
public class EmploymentContractService : IEmploymentContractService
{
    private const long MaxFileBytes = 10 * 1024 * 1024; // 10 MB

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

        var allContracts = await SelectWithoutBlob(query)
            .OrderByDescending(c => c.StartDate)
            .ThenByDescending(c => c.Id)
            .ToListAsync(cancellationToken);

        // จัดกลุ่มตามพนักงาน โดยเลือกสัญญาหลักปัจจุบันเพียงสัญญาเดียวต่อพนักงาน 1 คน (ไม่ให้พนักงานคนเดิมขึ้นแถวซ้ำ)
        // ลำดับการเลือก: สัญญาที่ ACTIVE ก่อน -> ตามด้วยสัญญาที่มีวันเริ่มล่าสุด -> ตามด้วย ID ล่าสุด
        var primaryContracts = allContracts
            .GroupBy(c => c.EmployeeId)
            .Select(g => g
                .OrderByDescending(c => c.Status == "ACTIVE" ? 1 : 0)
                .ThenByDescending(c => c.StartDate)
                .ThenByDescending(c => c.Id)
                .First())
            .ToList();

        if (!string.IsNullOrWhiteSpace(contractType) && contractType != "ALL")
        {
            primaryContracts = primaryContracts.Where(c => c.ContractType == contractType).ToList();
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            primaryContracts = primaryContracts.Where(c => c.Status == status).ToList();
        }

        return primaryContracts
            .OrderByDescending(c => c.StartDate)
            .ThenByDescending(c => c.Id)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<ContractSummaryStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var activeContracts = await _context.EmploymentContracts
            .AsNoTracking()
            .Where(c => c.Status == "ACTIVE")
            .Select(c => new
            {
                c.ContractType,
                c.ProbationEndDate,
                c.ContractEndDate
            })
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var in7Days = today.AddDays(7);
        var in30Days = today.AddDays(30);

        var probationCount = activeContracts.Count(c => c.ContractType == "PROBATION");
        var permanentCount = activeContracts.Count(c => c.ContractType == "PERMANENT");
        var fixedTermCount = activeContracts.Count(c => c.ContractType == "FIXED_TERM");
        
        // ใกล้ครบทดลองงาน (7 วัน)
        var probationExpiring7Days = activeContracts.Count(c =>
            c.ProbationEndDate.HasValue &&
            c.ProbationEndDate.Value >= today &&
            c.ProbationEndDate.Value <= in7Days);

        // ใกล้ครบทดลองงาน (30 วัน)
        var probationExpiring30Days = activeContracts.Count(c =>
            c.ProbationEndDate.HasValue &&
            c.ProbationEndDate.Value >= today &&
            c.ProbationEndDate.Value <= in30Days);

        // สัญญาจ้างใกล้หมดอายุ (30 วัน)
        var contractExpiring30Days = activeContracts.Count(c =>
            c.ContractEndDate.HasValue &&
            c.ContractEndDate.Value >= today &&
            c.ContractEndDate.Value <= in30Days);

        return new ContractSummaryStatsDto
        {
            ProbationCount = probationCount,
            PermanentCount = permanentCount,
            FixedTermCount = fixedTermCount,
            ProbationExpiring7DaysCount = probationExpiring7Days,
            ProbationExpiring30DaysCount = probationExpiring30Days,
            ContractExpiring30DaysCount = contractExpiring30Days,
            TotalActiveCount = activeContracts.Count
        };
    }

    public async Task<EmploymentContractDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var contract = await SelectWithoutBlob(_context.EmploymentContracts.AsNoTracking().Where(c => c.Id == id))
            .FirstOrDefaultAsync(cancellationToken);

        if (contract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        return MapToDto(contract);
    }

    public async Task<List<EmploymentContractDto>> GetByEmployeeIdAsync(long employeeId, CancellationToken cancellationToken = default)
    {
        var contracts = await SelectWithoutBlob(
                _context.EmploymentContracts
                    .AsNoTracking()
                    .Where(c => c.EmployeeId == employeeId))
            .OrderByDescending(c => c.StartDate)
            .ToListAsync(cancellationToken);

        return contracts.Select(MapToDto).ToList();
    }

    /// <summary>
    /// ดึงข้อมูลสัญญาจ้างโดยไม่โหลดคอลัมน์ไฟล์แนบขนาดใหญ่ (document_file_data) มาในหน่วยความจำ
    /// </summary>
    private static IQueryable<EmploymentContract> SelectWithoutBlob(IQueryable<EmploymentContract> source)
    {
        return source.Select(c => new EmploymentContract
        {
            Id = c.Id,
            EmployeeId = c.EmployeeId,
            EmployeeTypeId = c.EmployeeTypeId,
            ContractType = c.ContractType,
            WageType = c.WageType,
            StartDate = c.StartDate,
            ProbationEndDate = c.ProbationEndDate,
            ProbationPassedDate = c.ProbationPassedDate,
            ContractEndDate = c.ContractEndDate,
            TerminationDate = c.TerminationDate,
            TerminationReason = c.TerminationReason,
            Status = c.Status,
            ApprovalInstanceId = c.ApprovalInstanceId,
            Documents = c.Documents
                .OrderBy(d => d.UploadedAt).ThenBy(d => d.Id)
                .Select(d => new EmploymentContractDocument
                {
                    Id = d.Id,
                    ContractId = d.ContractId,
                    FileName = d.FileName,
                    MimeType = d.MimeType,
                    FileSize = d.FileSize,
                    UploadedAt = d.UploadedAt
                }).ToList(),
            Employee = c.Employee == null ? null : new Employee
            {
                Id = c.Employee.Id,
                EmployeeCode = c.Employee.EmployeeCode,
                Prefix = c.Employee.Prefix,
                FirstName = c.Employee.FirstName,
                LastName = c.Employee.LastName,
                AvatarUpdatedAt = c.Employee.AvatarUpdatedAt,
                Assignments = c.Employee.Assignments.Where(a => a.IsCurrent).Select(a => new EmployeeAssignment
                {
                    Id = a.Id,
                    EmployeeId = a.EmployeeId,
                    IsCurrent = a.IsCurrent,
                    Department = a.Department == null ? null : new Department
                    {
                        Id = a.Department.Id,
                        DepartmentName = a.Department.DepartmentName
                    },
                    Position = a.Position == null ? null : new Position
                    {
                        Id = a.Position.Id,
                        PositionName = a.Position.PositionName
                    }
                }).ToList()
            },
            EmployeeType = c.EmployeeType == null ? null : new EmployeeType
            {
                Id = c.EmployeeType.Id,
                TypeName = c.EmployeeType.TypeName
            }
        });
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
        else
        {
            // FIXED_TERM, OTHER (เช่น นักศึกษาฝึกงาน) หรือกรณีระบุวันสิ้นสุดสัญญา
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

        if (!string.IsNullOrWhiteSpace(request.DocumentFileData))
        {
            var (bytes, mime) = FileDataDecoder.Decode(request.DocumentFileData, request.DocumentFileName);
            if (bytes.LongLength > MaxFileBytes) throw new ValidationException("ไฟล์แนบเอกสารสัญญาต้องมีขนาดไม่เกิน 10 MB");
            contract.Documents.Add(NewDocument(bytes, mime, request.DocumentFileName));
        }

        _context.EmploymentContracts.Add(contract);

        // สัญญาที่เริ่มวันนี้หรือก่อนหน้า → อัปเดตประเภทพนักงานทันที (สัญญาล่วงหน้าจะถูกอัปเดตเมื่อถึงวันเริ่ม)
        await TryApplyEmployeeTypeAsync(contract, Today(), cancellationToken);

        var statusHistory = new EmployeeStatusHistory
        {
            EmployeeId = request.EmployeeId,
            // ใช้ navigation แทน contract.Id — ตอนนี้สัญญายังไม่ถูกบันทึก Id จึงเป็น 0 (ทำให้ FK พัง)
            SourceContract = contract,
            Status = request.ContractType,
            EffectiveFrom = request.StartDate,
            Reason = $"ออกสัญญาจ้างงานใหม่ ({GetContractTypeDisplay(request.ContractType)})",
            CreatedAt = DateTime.UtcNow
        };
        _context.EmployeeStatusHistories.Add(statusHistory);

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

        var oldTypeId = contract.EmployeeTypeId;
        var oldStart = contract.StartDate;
        var oldStatus = contract.Status;
        if (request.EmployeeTypeId.HasValue && request.EmployeeTypeId.Value > 0)
            contract.EmployeeTypeId = request.EmployeeTypeId.Value;

        if (!string.IsNullOrWhiteSpace(request.WageType))
            contract.WageType = request.WageType;

        if (request.StartDate.HasValue)
            contract.StartDate = request.StartDate.Value;

        if (request.ProbationEndDate.HasValue)
        {
            // เลื่อนวันสิ้นสุดทดลองงาน → แจ้งเตือนใหม่ตามวันใหม่
            if (contract.ProbationEndDate != request.ProbationEndDate) contract.ProbationNotifiedAt = null;
            contract.ProbationEndDate = request.ProbationEndDate;
        }

        if (request.ProbationPassedDate.HasValue)
            contract.ProbationPassedDate = request.ProbationPassedDate;

        if (request.ContractEndDate.HasValue)
        {
            // ต่อสัญญา/เปลี่ยนวันสิ้นสุด → แจ้งเตือนใหม่ตามวันใหม่
            if (contract.ContractEndDate != request.ContractEndDate) contract.ExpiryNotifiedAt = null;
            contract.ContractEndDate = request.ContractEndDate;
        }

        if (request.TerminationDate.HasValue)
            contract.TerminationDate = request.TerminationDate;

        if (!string.IsNullOrWhiteSpace(request.TerminationReason))
            contract.TerminationReason = request.TerminationReason;

        if (!string.IsNullOrWhiteSpace(request.Status))
            contract.Status = request.Status;

        if (request.DocumentFileData == "REMOVE")
        {
            var docs = await _context.EmploymentContractDocuments
                .Where(d => d.ContractId == contract.Id)
                .ToListAsync(cancellationToken);
            _context.EmploymentContractDocuments.RemoveRange(docs);
            ClearLegacyDocument(contract);
        }
        else if (!string.IsNullOrWhiteSpace(request.DocumentFileData))
        {
            var (bytes, mime) = FileDataDecoder.Decode(request.DocumentFileData, request.DocumentFileName);
            if (bytes.LongLength > MaxFileBytes) throw new ValidationException("ไฟล์แนบเอกสารสัญญาต้องมีขนาดไม่เกิน 10 MB");
            var doc = NewDocument(bytes, mime, request.DocumentFileName);
            doc.ContractId = contract.Id;
            _context.EmploymentContractDocuments.Add(doc);
        }

        // เปลี่ยนประเภท/วันเริ่ม/สถานะของสัญญา → ประเมินการอัปเดตประเภทพนักงานใหม่
        if (contract.EmployeeTypeId != oldTypeId || contract.StartDate != oldStart || contract.Status != oldStatus)
        {
            if (contract.EmployeeTypeId != oldTypeId) contract.EmployeeTypeAppliedAt = null;
            await TryApplyEmployeeTypeAsync(contract, Today(), cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(contract.Id, cancellationToken);
    }

    public async Task<int> ApplyDueEmployeeTypesAsync(CancellationToken cancellationToken = default)
    {
        var today = Today();
        var due = await _context.EmploymentContracts
            .Where(c => c.EmployeeTypeAppliedAt == null
                        && c.Status == "ACTIVE"
                        && c.EmployeeTypeId != null
                        && c.StartDate <= today)
            .OrderBy(c => c.StartDate).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);

        int applied = 0;
        foreach (var contract in due)
        {
            if (await TryApplyEmployeeTypeAsync(contract, today, cancellationToken)) applied++;
        }

        if (due.Count > 0) await _context.SaveChangesAsync(cancellationToken);
        return applied;
    }

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.Now);

    /// <summary>
    /// อัปเดตประเภทพนักงาน (และรายวัน/รายเดือน) ของตำแหน่งปัจจุบันตามสัญญา
    /// ทำเฉพาะสัญญา ACTIVE ที่ถึงวันเริ่มแล้ว ยังไม่สิ้นสุด และยังไม่เคยนำไปใช้ — ไม่ SaveChanges เอง
    /// </summary>
    private async Task<bool> TryApplyEmployeeTypeAsync(EmploymentContract contract, DateOnly today, CancellationToken cancellationToken)
    {
        if (contract.EmployeeTypeAppliedAt != null) return false;
        if (!string.Equals(contract.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase)) return false;
        if (!contract.EmployeeTypeId.HasValue || contract.StartDate > today) return false;

        if (contract.TerminationDate.HasValue && contract.TerminationDate.Value <= today)
        {
            contract.EmployeeTypeAppliedAt = DateTime.UtcNow; // สัญญาจบไปแล้ว ไม่ต้องนำไปใช้อีก
            return false;
        }

        var type = await _context.EmployeeTypes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == contract.EmployeeTypeId.Value, cancellationToken);
        if (type == null) return false;

        var assignment = _context.EmployeeAssignments.Local
                             .FirstOrDefault(a => a.EmployeeId == contract.EmployeeId && a.IsCurrent)
                         ?? await _context.EmployeeAssignments
                             .Where(a => a.EmployeeId == contract.EmployeeId && a.IsCurrent)
                             .OrderByDescending(a => a.EffectiveFrom)
                             .FirstOrDefaultAsync(cancellationToken);
        if (assignment == null) return false; // ยังไม่มีตำแหน่งงาน — รอรอบถัดไป

        assignment.EmployeeTypeId = type.Id;
        var wage = type.WageType?.ToUpperInvariant() switch
        {
            "DAILY" => "DAILY",
            "MONTHLY" => "MONTHLY",
            _ => contract.WageType?.ToUpperInvariant() is "DAILY" or "MONTHLY" ? contract.WageType.ToUpperInvariant() : assignment.WageType
        };
        assignment.WageType = wage;

        contract.EmployeeTypeAppliedAt = DateTime.UtcNow;
        return true;
    }

        public async Task<EmploymentContractDto> RenewAsync(
        long id,
        RenewEmploymentContractRequest request,
        CancellationToken cancellationToken = default)
    {
        var oldContract = await _context.EmploymentContracts
            .Include(c => c.Employee)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (oldContract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        var employee = oldContract.Employee ?? await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == oldContract.EmployeeId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException("พนักงาน", oldContract.EmployeeId);
        }

        if (request.StartDate == default)
        {
            throw new ValidationException("กรุณาระบุวันเริ่มต้นสัญญาใหม่");
        }

        // 1. ปิดสัญญาเดิม โดยตั้งสถานะเป็น COMPLETED และบันทึกวันที่/เหตุผล
        if (oldContract.Status == "ACTIVE")
        {
            oldContract.Status = "COMPLETED";
            oldContract.TerminationDate = request.StartDate.AddDays(-1);
            oldContract.TerminationReason = !string.IsNullOrWhiteSpace(request.Notes)
                ? $"ต่ออายุสัญญา: {request.Notes}"
                : "ต่ออายุสัญญาจ้างงานใหม่";
        }

        // 2. กำหนดวันสิ้นสุดตามประเภทสัญญาใหม่
        DateOnly? probationEndDate = null;
        DateOnly? contractEndDate = null;

        if (request.ContractType == "PROBATION")
        {
            probationEndDate = request.EndDate ?? request.StartDate.AddDays(119);
        }
        else if (request.ContractType == "FIXED_TERM")
        {
            if (!request.EndDate.HasValue)
            {
                throw new ValidationException("สัญญาจ้างแบบมีกำหนดเวลา (Fixed-Term) ต้องระบุวันสิ้นสุดสัญญา");
            }
            if (request.EndDate.Value <= request.StartDate)
            {
                throw new ValidationException("วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา");
            }
            contractEndDate = request.EndDate;
        }

        // 3. สร้างสัญญาฉบับต่ออายุใหม่
        var newContract = new EmploymentContract
        {
            EmployeeId = oldContract.EmployeeId,
            EmployeeTypeId = request.EmployeeTypeId ?? oldContract.EmployeeTypeId,
            ContractType = request.ContractType,
            WageType = !string.IsNullOrWhiteSpace(request.WageType) ? request.WageType : oldContract.WageType,
            StartDate = request.StartDate,
            ProbationEndDate = probationEndDate,
            ContractEndDate = contractEndDate,
            Status = "ACTIVE"
        };

        if (!string.IsNullOrWhiteSpace(request.DocumentFileData))
        {
            var (bytes, mime) = FileDataDecoder.Decode(request.DocumentFileData, request.DocumentFileName);
            if (bytes.LongLength > MaxFileBytes) throw new ValidationException("ไฟล์แนบเอกสารสัญญาต้องมีขนาดไม่เกิน 10 MB");
            newContract.Documents.Add(NewDocument(bytes, mime, request.DocumentFileName));
            newContract.DocumentFileName = request.DocumentFileName;
            newContract.DocumentMimeType = mime;
            newContract.DocumentFileSize = bytes.LongLength;
            newContract.DocumentUploadedAt = DateTime.UtcNow;
        }

        _context.EmploymentContracts.Add(newContract);
        await _context.SaveChangesAsync(cancellationToken);

        // 4. บันทึกประวัติสถานะพนักงาน (Status History)
        var statusHistory = new EmployeeStatusHistory
        {
            EmployeeId = oldContract.EmployeeId,
            SourceContractId = newContract.Id,
            Status = "ACTIVE",
            EffectiveFrom = request.StartDate,
            Reason = !string.IsNullOrWhiteSpace(request.Notes)
                ? $"ต่ออายุสัญญา: {request.Notes}"
                : $"ต่ออายุสัญญาจ้างงาน ({GetContractTypeDisplay(request.ContractType)})",
            CreatedAt = DateTime.UtcNow
        };
        _context.EmployeeStatusHistories.Add(statusHistory);

        // 5. ปรับปรุงประเภทพนักงานของพนักงาน หากมีการเปลี่ยน
        await TryApplyEmployeeTypeAsync(newContract, Today(), cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(newContract.Id, cancellationToken);
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

    public async Task<ContractDocumentFile> GetDocumentFileAsync(
        long id,
        long? documentId = null,
        CancellationToken cancellationToken = default)
    {
        var exists = await _context.EmploymentContracts.AsNoTracking().AnyAsync(c => c.Id == id, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        var query = _context.EmploymentContractDocuments.AsNoTracking().Where(d => d.ContractId == id);
        var doc = documentId.HasValue
            ? await query.FirstOrDefaultAsync(d => d.Id == documentId.Value, cancellationToken)
            : await query.OrderByDescending(d => d.UploadedAt).ThenByDescending(d => d.Id).FirstOrDefaultAsync(cancellationToken);

        if (doc == null || doc.FileData.Length == 0)
        {
            throw new NotFoundException("ไม่พบไฟล์เอกสารสัญญาจ้างที่แนบไว้");
        }

        return new ContractDocumentFile
        {
            Data = doc.FileData,
            FileName = string.IsNullOrWhiteSpace(doc.FileName) ? $"contract_{id}.pdf" : doc.FileName,
            MimeType = string.IsNullOrWhiteSpace(doc.MimeType) ? "application/pdf" : doc.MimeType
        };
    }

    public async Task<EmploymentContractDto> AttachDocumentAsync(
        long id,
        UploadContractDocumentRequest request,
        CancellationToken cancellationToken = default)
    {
        var exists = await _context.EmploymentContracts.AnyAsync(c => c.Id == id, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        if (string.IsNullOrWhiteSpace(request.FileData))
        {
            throw new ValidationException("กรุณาระบุไฟล์เอกสารสัญญา");
        }

        var (bytes, mime) = FileDataDecoder.Decode(request.FileData, request.FileName);
        if (bytes.LongLength == 0) throw new ValidationException("ไฟล์แนบว่างเปล่า");
        if (bytes.LongLength > MaxFileBytes) throw new ValidationException("ไฟล์แนบเอกสารสัญญาต้องมีขนาดไม่เกิน 10 MB");

        var doc = NewDocument(bytes, mime, request.FileName);
        doc.ContractId = id;
        _context.EmploymentContractDocuments.Add(doc);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<EmploymentContractDto> DeleteDocumentAsync(
        long id,
        long? documentId = null,
        CancellationToken cancellationToken = default)
    {
        var contract = await _context.EmploymentContracts
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract == null)
        {
            throw new NotFoundException("สัญญาจ้างงาน", id);
        }

        var docs = await _context.EmploymentContractDocuments
            .Where(d => d.ContractId == id && (!documentId.HasValue || d.Id == documentId.Value))
            .ToListAsync(cancellationToken);

        if (documentId.HasValue && docs.Count == 0)
        {
            throw new NotFoundException("ไม่พบไฟล์เอกสารสัญญาจ้างที่ต้องการลบ");
        }

        _context.EmploymentContractDocuments.RemoveRange(docs);
        if (!documentId.HasValue) ClearLegacyDocument(contract);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(contract.Id, cancellationToken);
    }

    private static EmploymentContractDocument NewDocument(byte[] bytes, string mime, string? fileName) => new()
    {
        FileName = string.IsNullOrWhiteSpace(fileName) ? "contract" : Path.GetFileName(fileName.Trim()),
        MimeType = mime,
        FileSize = bytes.LongLength,
        FileData = bytes,
        UploadedAt = DateTime.UtcNow
    };

    /// <summary>ล้างคอลัมน์ไฟล์แนบแบบเดิม (ไฟล์เดียว) — ย้ายไปตาราง employment_contract_document แล้ว</summary>
    private static void ClearLegacyDocument(EmploymentContract contract)
    {
        contract.DocumentFileData = null;
        contract.DocumentMimeType = null;
        contract.DocumentFileName = null;
        contract.DocumentFileSize = null;
        contract.DocumentUploadedAt = null;
    }

    private static EmploymentContractDto MapToDto(EmploymentContract c)
    {
        var currentAssignment = c.Employee?.Assignments?.FirstOrDefault(a => a.IsCurrent);

        DateOnly? effectiveEndDate = null;
        if (c.ContractType == "PROBATION")
            effectiveEndDate = c.ProbationEndDate;
        else if (c.ContractEndDate.HasValue)
            effectiveEndDate = c.ContractEndDate;
        else if (c.TerminationDate.HasValue)
            effectiveEndDate = c.TerminationDate;

        var docs = (c.Documents ?? new List<EmploymentContractDocument>())
            .OrderBy(d => d.UploadedAt).ThenBy(d => d.Id)
            .ToList();
        var latest = docs.LastOrDefault();
        var hasDoc = docs.Count > 0;

        return new EmploymentContractDto
        {
            Id = c.Id,
            EmployeeId = c.EmployeeId,
            EmployeeCode = c.Employee?.EmployeeCode ?? string.Empty,
            EmployeeName = c.Employee != null ? $"{c.Employee.FirstName} {c.Employee.LastName}".Trim() : string.Empty,
            EmployeePrefix = c.Employee?.Prefix,
            AvatarUrl = c.Employee?.AvatarUpdatedAt != null
                ? $"/api/employees/{c.EmployeeId}/avatar?v={c.Employee.AvatarUpdatedAt.Value.Ticks}"
                : null,
            DepartmentName = currentAssignment?.Department?.DepartmentName,
            PositionTitle = currentAssignment?.Position?.PositionName,
            EmployeeTypeId = c.EmployeeTypeId,
            EmployeeTypeName = c.EmployeeType?.TypeName,
            ContractType = c.ContractType,
            ContractTypeDisplay = !string.IsNullOrWhiteSpace(c.EmployeeType?.TypeName)
                ? c.EmployeeType.TypeName
                : GetContractTypeDisplay(c.ContractType),
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
            ApprovalInstanceId = c.ApprovalInstanceId,
            HasDocument = hasDoc,
            DocumentFileName = latest?.FileName,
            DocumentFileSize = latest?.FileSize,
            DocumentMimeType = latest?.MimeType,
            DocumentUploadedAt = latest?.UploadedAt,
            DocumentUrl = hasDoc ? $"/api/employment-contracts/{c.Id}/document" : null,
            DocumentCount = docs.Count,
            Documents = docs.Select(d => new ContractDocumentDto
            {
                Id = d.Id,
                FileName = d.FileName,
                MimeType = d.MimeType,
                FileSize = d.FileSize,
                UploadedAt = d.UploadedAt
            }).ToList()
        };
    }

    private static string GetContractTypeDisplay(string contractType)
    {
        return contractType?.ToUpperInvariant() switch
        {
            "PROBATION" => "ทดลองงาน",
            "PERMANENT" => "ประจำ",
            "FIXED_TERM" => "สัญญาจ้าง",
            "INTERN" => "นักศึกษาฝึกงาน",
            "DAILY" => "รายวัน",
            "PART" or "PART_TIME" => "พาร์ทไทม์",
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
