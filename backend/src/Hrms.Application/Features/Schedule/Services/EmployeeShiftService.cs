using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Schedule.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Features.Schedule.Services;

/// <summary>
/// Service จัดการการมอบหมายกะการทำงานให้พนักงาน (Employee Shift Assignments)
/// พร้อมการตรวจสอบช่วงเวลาไม่ให้ซ้อนทับกันตามข้อกำหนด PostgreSQL Exclusion Constraint
/// </summary>
public class EmployeeShiftService : IEmployeeShiftService
{
    private readonly IHrmsDbContext _context;
    private readonly ILogger<EmployeeShiftService> _logger;

    public EmployeeShiftService(IHrmsDbContext context, ILogger<EmployeeShiftService> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static DateOnly ParseDate(string dateStr, string fieldName)
    {
        if (DateOnly.TryParseExact(dateStr.Trim(), new[] { "yyyy-MM-dd", "yyyy/MM/dd", "d/M/yyyy", "dd/MM/yyyy" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return date;
        }

        if (DateOnly.TryParse(dateStr.Trim(), CultureInfo.InvariantCulture, out date))
        {
            return date;
        }

        throw new ArgumentException($"รูปแบบวันที่ของ {fieldName} ไม่ถูกต้อง กรุณาระบุในรูปแบบ YYYY-MM-DD เช่น 2026-01-01");
    }

    private static DateOnly? ParseNullableDate(string? dateStr, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;
        return ParseDate(dateStr, fieldName);
    }

    private async Task<Dictionary<long, (string DeptName, string PosName)>> GetEmployeeAssignmentInfoMapAsync()
    {
        var currentAssignments = await _context.EmployeeAssignments
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Where(ea => ea.IsCurrent)
            .ToListAsync();

        return currentAssignments.ToDictionary(
            ea => ea.EmployeeId,
            ea => (ea.Department?.DepartmentName?.Trim() ?? "-", ea.Position?.PositionName?.Trim() ?? "-")
        );
    }

    private async Task EnsureNoOverlapAsync(long employeeId, DateOnly from, DateOnly? to, long? currentAssignmentId = null)
    {
        var maxDate = DateOnly.MaxValue;
        var targetEnd = to ?? maxDate;

        if (to.HasValue && to.Value < from)
        {
            throw new ArgumentException("วันที่สิ้นสุด (effective_to) ต้องไม่น้อยกว่าวันที่เริ่มต้น (effective_from)");
        }

        var existingList = await _context.EmployeeShifts
            .Include(es => es.Shift)
            .Where(es => es.EmployeeId == employeeId && (currentAssignmentId == null || es.Id != currentAssignmentId))
            .ToListAsync();

        foreach (var es in existingList)
        {
            var existingEnd = es.EffectiveTo ?? maxDate;
            // ตรวจสอบเงื่อนไขซ้อนทับกัน: from <= existingEnd && es.EffectiveFrom <= targetEnd
            if (from <= existingEnd && es.EffectiveFrom <= targetEnd)
            {
                var shiftTitle = es.Shift?.ShiftName ?? $"รหัสกะ {es.ShiftId}";
                var rangeText = es.EffectiveTo == null
                    ? $"ตั้งแต่วันที่ {es.EffectiveFrom:dd/MM/yyyy} เป็นต้นไป"
                    : $"ช่วงวันที่ {es.EffectiveFrom:dd/MM/yyyy} ถึง {es.EffectiveTo.Value:dd/MM/yyyy}";

                throw new InvalidOperationException($"พนักงานรายนี้มีการกำหนดกะ '{shiftTitle}' ({rangeText}) ซ้อนทับกับช่วงเวลาที่ระบุแล้ว");
            }
        }
    }

    private static EmployeeShiftDto MapToDto(
        EmployeeShift es, 
        Dictionary<long, (string DeptName, string PosName)> assignmentMap)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var isActive = es.EffectiveFrom <= today && (es.EffectiveTo == null || es.EffectiveTo >= today);

        assignmentMap.TryGetValue(es.EmployeeId, out var info);

        return new EmployeeShiftDto
        {
            Id = es.Id,
            EmployeeId = es.EmployeeId,
            EmployeeCode = es.Employee?.EmployeeCode ?? string.Empty,
            EmployeeName = es.Employee != null ? es.Employee.FullName : string.Empty,
            DepartmentName = info.DeptName,
            PositionName = info.PosName,
            ShiftId = es.ShiftId,
            ShiftCode = es.Shift?.ShiftCode ?? string.Empty,
            ShiftName = es.Shift?.ShiftName ?? string.Empty,
            StartTime = es.Shift?.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture) ?? string.Empty,
            EndTime = es.Shift?.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture) ?? string.Empty,
            IsCrossDay = es.Shift?.IsCrossDay ?? false,
            EffectiveFrom = es.EffectiveFrom.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            EffectiveTo = es.EffectiveTo?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            WorkDays = es.WorkDays != null ? es.WorkDays.ToList() : new List<int> { 1, 2, 3, 4, 5 },
            IsActive = isActive
        };
    }

    public async Task<List<EmployeeShiftDto>> GetAllAssignmentsAsync(
        long? departmentId = null, 
        string? search = null, 
        DateOnly? date = null)
    {
        var query = _context.EmployeeShifts
            .Include(es => es.Employee)
            .Include(es => es.Shift)
            .AsQueryable();

        if (date.HasValue)
        {
            var d = date.Value;
            query = query.Where(es => es.EffectiveFrom <= d && (es.EffectiveTo == null || es.EffectiveTo >= d));
        }

        var list = await query
            .OrderBy(es => es.Employee != null ? es.Employee.EmployeeCode : string.Empty)
            .ThenByDescending(es => es.EffectiveFrom)
            .ToListAsync();

        var assignmentMap = await GetEmployeeAssignmentInfoMapAsync();
        var dtos = list.Select(es => MapToDto(es, assignmentMap)).ToList();

        if (departmentId.HasValue && departmentId.Value > 0)
        {
            var empIdsInDept = (await _context.EmployeeAssignments
                .Where(ea => ea.DepartmentId == departmentId.Value && ea.IsCurrent)
                .Select(ea => ea.EmployeeId)
                .ToListAsync()).ToHashSet();

            dtos = dtos.Where(d => empIdsInDept.Contains(d.EmployeeId)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            dtos = dtos.Where(d =>
                d.EmployeeCode.ToLowerInvariant().Contains(q) ||
                d.EmployeeName.ToLowerInvariant().Contains(q) ||
                (d.DepartmentName != null && d.DepartmentName.ToLowerInvariant().Contains(q)) ||
                d.ShiftCode.ToLowerInvariant().Contains(q) ||
                d.ShiftName.ToLowerInvariant().Contains(q)
            ).ToList();
        }

        return dtos;
    }

    public async Task<List<EmployeeShiftDto>> GetAssignmentsByEmployeeAsync(long employeeId)
    {
        var list = await _context.EmployeeShifts
            .Include(es => es.Employee)
            .Include(es => es.Shift)
            .Where(es => es.EmployeeId == employeeId)
            .OrderByDescending(es => es.EffectiveFrom)
            .ToListAsync();

        var assignmentMap = await GetEmployeeAssignmentInfoMapAsync();
        return list.Select(es => MapToDto(es, assignmentMap)).ToList();
    }

    public async Task<EmployeeShiftDto?> GetAssignmentByIdAsync(long id)
    {
        var es = await _context.EmployeeShifts
            .Include(x => x.Employee)
            .Include(x => x.Shift)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (es == null) return null;

        var assignmentMap = await GetEmployeeAssignmentInfoMapAsync();
        return MapToDto(es, assignmentMap);
    }

    public async Task<EmployeeShiftDto> AssignShiftAsync(AssignEmployeeShiftRequest request)
    {
        var employee = await _context.Employees.FindAsync(request.EmployeeId);
        if (employee == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลพนักงานที่ระบุ");

        var shift = await _context.Shifts.FindAsync(request.ShiftId);
        if (shift == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลกะการทำงานที่ระบุ");

        var from = ParseDate(request.EffectiveFrom, "วันเริ่มต้นกะ");
        var to = ParseNullableDate(request.EffectiveTo, "วันสิ้นสุดกะ");

        await EnsureNoOverlapAsync(request.EmployeeId, from, to);

        var workDays = request.WorkDays != null && request.WorkDays.Count > 0
            ? request.WorkDays.Distinct().ToArray()
            : new[] { 1, 2, 3, 4, 5 };

        var es = new EmployeeShift
        {
            EmployeeId = request.EmployeeId,
            ShiftId = request.ShiftId,
            EffectiveFrom = from,
            EffectiveTo = to,
            WorkDays = workDays
        };

        _context.EmployeeShifts.Add(es);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("23P01") == true || ex.InnerException?.Message.Contains("ex_employee_shift_no_overlap") == true)
        {
            throw new InvalidOperationException("ไม่สามารถบันทึกได้ เนื่องจากพนักงานมีกะการทำงานซ้อนทับกันในช่วงเวลาดังกล่าว (PostgreSQL Exclusion Constraint)");
        }

        _logger.LogInformation("มอบหมายกะสำเร็จ: พนักงาน {EmpCode} -> กะ {ShiftCode} ({From} - {To})",
            employee.EmployeeCode, shift.ShiftCode, from, to);

        es.Employee = employee;
        es.Shift = shift;

        var assignmentMap = await GetEmployeeAssignmentInfoMapAsync();
        return MapToDto(es, assignmentMap);
    }

    public async Task<BatchAssignResultDto> BatchAssignShiftAsync(BatchAssignEmployeeShiftRequest request)
    {
        var shift = await _context.Shifts.FindAsync(request.ShiftId);
        if (shift == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลกะการทำงานที่ระบุ");

        var from = ParseDate(request.EffectiveFrom, "วันเริ่มต้นกะ");
        var to = ParseNullableDate(request.EffectiveTo, "วันสิ้นสุดกะ");

        var batchWorkDays = request.WorkDays != null && request.WorkDays.Count > 0
            ? request.WorkDays.Distinct().ToArray()
            : new[] { 1, 2, 3, 4, 5 };

        var employeeIdsToAssign = new HashSet<long>(request.EmployeeIds ?? new List<long>());

        // ถ้าเลือกแผนกมา และไม่ได้ระบุ employeeIds รายบุคคล ให้ดึงพนักงานทุกคนในแผนกนั้น
        if (employeeIdsToAssign.Count == 0 && request.DepartmentId.HasValue && request.DepartmentId.Value > 0)
        {
            var empIds = await _context.EmployeeAssignments
                .Where(ea => ea.DepartmentId == request.DepartmentId.Value && ea.IsCurrent)
                .Select(ea => ea.EmployeeId)
                .ToListAsync();

            foreach (var id in empIds)
            {
                employeeIdsToAssign.Add(id);
            }
        }

        if (employeeIdsToAssign.Count == 0)
            throw new ArgumentException("กรุณาระบุรายชื่อพนักงานหรือเลือกแผนกที่ต้องการมอบหมายกะ");

        var result = new BatchAssignResultDto
        {
            TotalRequested = employeeIdsToAssign.Count
        };

        foreach (var empId in employeeIdsToAssign)
        {
            var employee = await _context.Employees.FindAsync(empId);
            if (employee == null)
            {
                result.FailedCount++;
                result.Errors.Add($"ไม่พบพนักงานรหัส Id {empId}");
                continue;
            }

            try
            {
                await EnsureNoOverlapAsync(empId, from, to);

                var es = new EmployeeShift
                {
                    EmployeeId = empId,
                    ShiftId = request.ShiftId,
                    EffectiveFrom = from,
                    EffectiveTo = to,
                    WorkDays = batchWorkDays
                };

                _context.EmployeeShifts.Add(es);
                await _context.SaveChangesAsync();
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.FailedCount++;
                result.Errors.Add($"{employee.EmployeeCode} ({employee.FullName}): {ex.Message}");
            }
        }

        return result;
    }

    public async Task<EmployeeShiftDto> UpdateAssignmentAsync(long id, UpdateEmployeeShiftRequest request)
    {
        var es = await _context.EmployeeShifts
            .Include(x => x.Employee)
            .Include(x => x.Shift)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (es == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลการมอบหมายกะที่ต้องการแก้ไข");

        var shift = await _context.Shifts.FindAsync(request.ShiftId);
        if (shift == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลกะการทำงานที่ระบุ");

        var from = ParseDate(request.EffectiveFrom, "วันเริ่มต้นกะ");
        var to = ParseNullableDate(request.EffectiveTo, "วันสิ้นสุดกะ");

        await EnsureNoOverlapAsync(es.EmployeeId, from, to, currentAssignmentId: id);

        es.ShiftId = request.ShiftId;
        es.EffectiveFrom = from;
        es.EffectiveTo = to;
        es.Shift = shift;
        if (request.WorkDays != null && request.WorkDays.Count > 0)
        {
            es.WorkDays = request.WorkDays.Distinct().ToArray();
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("23P01") == true || ex.InnerException?.Message.Contains("ex_employee_shift_no_overlap") == true)
        {
            throw new InvalidOperationException("ไม่สามารถบันทึกได้ เนื่องจากพนักงานมีกะการทำงานซ้อนทับกันในช่วงเวลาดังกล่าว (PostgreSQL Exclusion Constraint)");
        }

        _logger.LogInformation("แก้ไขการมอบหมายกะสำเร็จ: Id {Id}, พนักงาน {EmpCode} -> กะ {ShiftCode}",
            id, es.Employee?.EmployeeCode, shift.ShiftCode);

        var assignmentMap = await GetEmployeeAssignmentInfoMapAsync();
        return MapToDto(es, assignmentMap);
    }

    public async Task<bool> DeleteAssignmentAsync(long id)
    {
        var es = await _context.EmployeeShifts.FindAsync(id);
        if (es == null) return false;

        _context.EmployeeShifts.Remove(es);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ลบการมอบหมายกะสำเร็จ: Id {Id}", id);
        return true;
    }

    public async Task<MonthlyRosterResponse> GetMonthlyRosterAsync(
        int year, 
        int month, 
        long? departmentId = null, 
        string? search = null)
    {
        if (month < 1 || month > 12)
            throw new ArgumentException("เดือนต้องอยู่ระหว่าง 1 ถึง 12");

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var monthStart = new DateOnly(year, month, 1);
        var monthEnd = new DateOnly(year, month, daysInMonth);

        // ดึงพนักงานทั้งหมด
        var employeesQuery = _context.Employees.AsQueryable();

        var employees = await employeesQuery
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync();

        var assignmentMap = await GetEmployeeAssignmentInfoMapAsync();

        // กรองแผนก
        if (departmentId.HasValue && departmentId.Value > 0)
        {
            var empIdsInDept = (await _context.EmployeeAssignments
                .Where(ea => ea.DepartmentId == departmentId.Value && ea.IsCurrent)
                .Select(ea => ea.EmployeeId)
                .ToListAsync()).ToHashSet();

            employees = employees.Where(e => empIdsInDept.Contains(e.Id)).ToList();
        }

        // ค้นหาชื่อ/รหัส
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            employees = employees.Where(e =>
                e.EmployeeCode.ToLowerInvariant().Contains(q) ||
                e.FullName.ToLowerInvariant().Contains(q)
            ).ToList();
        }

        // ดึงกะการทำงานทั้งหมดของพนักงานที่ทับซ้อนกับเดือนนี้
        var empIds = employees.Select(e => e.Id).ToList();
        var shiftsInMonth = await _context.EmployeeShifts
            .Include(es => es.Shift)
            .Where(es => empIds.Contains(es.EmployeeId))
            .Where(es => es.EffectiveFrom <= monthEnd && (es.EffectiveTo == null || es.EffectiveTo >= monthStart))
            .ToListAsync();

        var rosterItems = new List<MonthlyRosterItemDto>();

        foreach (var emp in employees)
        {
            assignmentMap.TryGetValue(emp.Id, out var info);
            var empShifts = shiftsInMonth.Where(es => es.EmployeeId == emp.Id).ToList();

            var item = new MonthlyRosterItemDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.FullName,
                DepartmentName = info.DeptName,
                PositionName = info.PosName
            };

            for (int day = 1; day <= daysInMonth; day++)
            {
                var dayDate = new DateOnly(year, month, day);
                var dayOfWeek = (int)dayDate.DayOfWeek;
                var activeShift = empShifts.FirstOrDefault(es =>
                    es.EffectiveFrom <= dayDate && 
                    (es.EffectiveTo == null || es.EffectiveTo >= dayDate) &&
                    (es.WorkDays == null || es.WorkDays.Length == 0 || es.WorkDays.Contains(dayOfWeek)));

                if (activeShift != null && activeShift.Shift != null)
                {
                    item.Days[day] = new RosterDayShiftDto
                    {
                        ShiftId = activeShift.Shift.Id,
                        ShiftCode = activeShift.Shift.ShiftCode,
                        ShiftName = activeShift.Shift.ShiftName,
                        StartTime = activeShift.Shift.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
                        EndTime = activeShift.Shift.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture),
                        IsCrossDay = activeShift.Shift.IsCrossDay
                    };
                }
                else
                {
                    item.Days[day] = null;
                }
            }

            rosterItems.Add(item);
        }

        return new MonthlyRosterResponse
        {
            Year = year,
            Month = month,
            DaysInMonth = daysInMonth,
            Employees = rosterItems
        };
    }

    public async Task<List<AssignableEmployeeDto>> GetAssignableEmployeesAsync(long? departmentId = null, long? employeeTypeId = null)
    {
        var employees = await _context.Employees
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync();

        var currentAssignments = await _context.EmployeeAssignments
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Include(ea => ea.EmployeeType)
            .Where(ea => ea.IsCurrent)
            .ToListAsync();

        var assignMap = currentAssignments.ToDictionary(
            ea => ea.EmployeeId,
            ea => (
                DepartmentId: ea.DepartmentId,
                DepartmentName: ea.Department?.DepartmentName?.Trim() ?? "-",
                PositionName: ea.Position?.PositionName?.Trim() ?? "-",
                EmployeeTypeId: ea.EmployeeTypeId,
                EmployeeTypeCode: ea.EmployeeType?.TypeCode ?? string.Empty,
                EmployeeTypeName: ea.EmployeeType?.TypeName ?? "พนักงานประจำ"
            )
        );

        var list = new List<AssignableEmployeeDto>();
        foreach (var e in employees)
        {
            assignMap.TryGetValue(e.Id, out var info);
            if (departmentId.HasValue && departmentId.Value > 0 && info.DepartmentId != departmentId.Value)
            {
                continue;
            }

            if (employeeTypeId.HasValue && employeeTypeId.Value > 0 && info.EmployeeTypeId != employeeTypeId.Value)
            {
                continue;
            }

            list.Add(new AssignableEmployeeDto
            {
                Id = e.Id,
                EmployeeCode = e.EmployeeCode,
                FullName = e.FullName,
                DepartmentId = info.DepartmentId == 0 ? null : info.DepartmentId,
                DepartmentName = string.IsNullOrEmpty(info.DepartmentName) ? "-" : info.DepartmentName,
                PositionName = string.IsNullOrEmpty(info.PositionName) ? "-" : info.PositionName,
                EmployeeTypeId = info.EmployeeTypeId,
                EmployeeTypeCode = info.EmployeeTypeCode ?? string.Empty,
                EmployeeTypeName = string.IsNullOrEmpty(info.EmployeeTypeName) ? "พนักงานประจำ" : info.EmployeeTypeName
            });
        }

        return list;
    }

    public async Task<List<EmployeeTypeLookupDto>> GetEmployeeTypesAsync()
    {
        return await _context.EmployeeTypes
            .Where(t => t.Status == "ACTIVE")
            .OrderBy(t => t.Id)
            .Select(t => new EmployeeTypeLookupDto
            {
                Id = t.Id,
                TypeCode = t.TypeCode,
                TypeName = t.TypeName,
                WageType = t.WageType
            })
            .ToListAsync();
    }
}
