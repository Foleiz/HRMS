using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using ShiftEntity = Hrms.Domain.Entities.Shift;

namespace Hrms.Application.Features.Attendance.Services;

public class AttendanceDailyService : IAttendanceDailyService
{
    private readonly IHrmsDbContext _context;
    private static readonly TimeZoneInfo ThaiZone = GetThaiTimeZone();

    public AttendanceDailyService(IHrmsDbContext context)
    {
        _context = context;
    }

    private static TimeZoneInfo GetThaiTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
        catch
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");
            }
            catch
            {
                return TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
            }
        }
    }

    private static DateTime ToThaiLocalTime(DateTime utc)
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), ThaiZone);
    }

    private static DateTime ToUtcTime(DateTime local)
    {
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), ThaiZone);
    }

    public async Task<PagedAttendanceResult> GetDailyAttendanceAsync(DailyAttendanceFilterQuery filter, CancellationToken cancellationToken = default)
    {
        DateOnly queryDate;
        if (!string.IsNullOrWhiteSpace(filter.Date) && DateOnly.TryParse(filter.Date, out var parsedDate))
        {
            queryDate = parsedDate;
        }
        else
        {
            var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);
            queryDate = DateOnly.FromDateTime(nowThai);
        }

        // Auto-generate records for the date if not exists yet
        await EnsureAttendanceRecordsForDateAsync(queryDate, cancellationToken);

        var query = _context.AttendanceDailies
            .AsNoTracking()
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .Where(a => a.WorkDate == queryDate);

        // Filter Department
        if (filter.DepartmentId.HasValue && filter.DepartmentId.Value > 0)
        {
            query = query.Where(a => _context.EmployeeAssignments
                .Any(ea => ea.EmployeeId == a.EmployeeId && ea.IsCurrent && ea.DepartmentId == filter.DepartmentId.Value));
        }

        // Filter Status
        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ALL")
        {
            query = query.Where(a => a.Status == filter.Status);
        }

        // Filter Search Keyword (Employee Name or Code)
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var kw = filter.Search.Trim().ToLower();
            query = query.Where(a =>
                (a.Employee != null && (
                    a.Employee.EmployeeCode.ToLower().Contains(kw) ||
                    a.Employee.FirstName.ToLower().Contains(kw) ||
                    a.Employee.LastName.ToLower().Contains(kw) ||
                    (a.Employee.FirstName + " " + a.Employee.LastName).ToLower().Contains(kw)
                )) ||
                (a.Shift != null && a.Shift.ShiftName.ToLower().Contains(kw))
            );
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var items = await query
            .OrderBy(a => a.Employee != null ? a.Employee.EmployeeCode : "")
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Fetch department and position for displayed employees
        var empIds = items.Select(i => i.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Where(ea => empIds.Contains(ea.EmployeeId) && ea.IsCurrent)
            .ToDictionaryAsync(ea => ea.EmployeeId, cancellationToken);

        var dtos = items.Select(item =>
        {
            assignments.TryGetValue(item.EmployeeId, out var assign);
            return MapToDto(item, assign);
        }).ToList();

        return new PagedAttendanceResult
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<DailyAttendanceSummaryDto> GetDailySummaryAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        await EnsureAttendanceRecordsForDateAsync(date, cancellationToken);

        var records = await _context.AttendanceDailies
            .AsNoTracking()
            .Where(a => a.WorkDate == date)
            .ToListAsync(cancellationToken);

        var total = records.Count;
        var present = records.Count(r => r.Status == "PRESENT");
        var late = records.Count(r => r.Status == "LATE" || r.Status == "LATE_AND_EARLY");
        var early = records.Count(r => r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY");
        var absent = records.Count(r => r.Status == "ABSENT" || r.IsAbsent);
        var holidayOrOff = records.Count(r => r.Status == "HOLIDAY" || r.Status == "OFF");

        var workingTotal = total - holidayOrOff;
        var rate = workingTotal > 0 ? Math.Round((double)(present + late) / workingTotal * 100.0, 1) : 100.0;

        return new DailyAttendanceSummaryDto
        {
            Date = date.ToString("yyyy-MM-dd"),
            TotalEmployees = total,
            PresentCount = present,
            LateCount = late,
            EarlyLeaveCount = early,
            AbsentCount = absent,
            HolidayOrOffCount = holidayOrOff,
            AttendanceRate = rate
        };
    }

    public async Task<AttendanceDailyDto> ClockInAsync(ClockInRequest request, CancellationToken cancellationToken = default)
    {
        DateOnly workDate;
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);

        if (!string.IsNullOrWhiteSpace(request.WorkDate) && DateOnly.TryParse(request.WorkDate, out var parsedDate))
        {
            workDate = parsedDate;
        }
        else
        {
            workDate = DateOnly.FromDateTime(nowThai);
        }

        var clockInTime = request.ClockInTime ?? DateTime.UtcNow;

        var record = await _context.AttendanceDailies
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.WorkDate == workDate, cancellationToken);

        if (record == null)
        {
            record = new AttendanceDaily
            {
                EmployeeId = request.EmployeeId,
                WorkDate = workDate,
            };
            _context.AttendanceDailies.Add(record);
        }

        record.ActualIn = clockInTime;
        record.IsAbsent = false;

        // Lookup shift if not already assigned
        if (record.ShiftId == null)
        {
            var shiftInfo = await ResolveShiftForEmployeeAsync(request.EmployeeId, workDate, cancellationToken);
            if (shiftInfo != null)
            {
                record.ShiftId = shiftInfo.Id;
                record.Shift = shiftInfo;
                PopulateScheduledTimes(record, shiftInfo, workDate);
            }
        }

        // Calculate late & status
        RecalculateAttendance(record);

        await _context.SaveChangesAsync(cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == request.EmployeeId && ea.IsCurrent, cancellationToken);

        return MapToDto(record, assign);
    }

    public async Task<AttendanceDailyDto> ClockOutAsync(ClockOutRequest request, CancellationToken cancellationToken = default)
    {
        DateOnly workDate;
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);

        if (!string.IsNullOrWhiteSpace(request.WorkDate) && DateOnly.TryParse(request.WorkDate, out var parsedDate))
        {
            workDate = parsedDate;
        }
        else
        {
            workDate = DateOnly.FromDateTime(nowThai);
        }

        var clockOutTime = request.ClockOutTime ?? DateTime.UtcNow;

        var record = await _context.AttendanceDailies
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.WorkDate == workDate, cancellationToken);

        if (record == null)
        {
            record = new AttendanceDaily
            {
                EmployeeId = request.EmployeeId,
                WorkDate = workDate,
            };
            _context.AttendanceDailies.Add(record);
        }

        record.ActualOut = clockOutTime;
        record.IsAbsent = false;

        if (record.ShiftId == null)
        {
            var shiftInfo = await ResolveShiftForEmployeeAsync(request.EmployeeId, workDate, cancellationToken);
            if (shiftInfo != null)
            {
                record.ShiftId = shiftInfo.Id;
                record.Shift = shiftInfo;
                PopulateScheduledTimes(record, shiftInfo, workDate);
            }
        }

        RecalculateAttendance(record);

        await _context.SaveChangesAsync(cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == request.EmployeeId && ea.IsCurrent, cancellationToken);

        return MapToDto(record, assign);
    }

    public async Task<AttendanceDailyDto> UpdateAttendanceAsync(long id, UpdateAttendanceRequest request, CancellationToken cancellationToken = default)
    {
        var record = await _context.AttendanceDailies
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (record == null)
            throw new KeyNotFoundException($"ไม่พบรายการบันทึกเวลา ID {id}");

        if (request.ShiftId.HasValue)
        {
            record.ShiftId = request.ShiftId.Value;
            var shift = await _context.Shifts.FindAsync(new object[] { request.ShiftId.Value }, cancellationToken);
            record.Shift = shift;
            if (shift != null)
            {
                PopulateScheduledTimes(record, shift, record.WorkDate);
            }
        }

        if (request.ActualIn.HasValue)
            record.ActualIn = request.ActualIn.Value;

        if (request.ActualOut.HasValue)
            record.ActualOut = request.ActualOut.Value;

        if (request.IsAbsent.HasValue)
            record.IsAbsent = request.IsAbsent.Value;

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            record.Status = request.Status;
        }
        else
        {
            RecalculateAttendance(record);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == record.EmployeeId && ea.IsCurrent, cancellationToken);

        return MapToDto(record, assign);
    }

    public async Task<int> CalculateDailyAttendanceForDateAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        return await EnsureAttendanceRecordsForDateAsync(date, cancellationToken);
    }

    private async Task<int> EnsureAttendanceRecordsForDateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var employees = await _context.Employees
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var existingMap = await _context.AttendanceDailies
            .Where(a => a.WorkDate == date)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var holiday = await _context.Holidays
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.HolidayDate == date, cancellationToken);

        var activeShifts = await _context.EmployeeShifts
            .AsNoTracking()
            .Include(es => es.Shift)
            .Where(es => es.EffectiveFrom <= date && (es.EffectiveTo == null || es.EffectiveTo >= date))
            .ToListAsync(cancellationToken);

        var shiftByEmp = activeShifts
            .GroupBy(es => es.EmployeeId)
            .ToDictionary(g => g.Key, g => g.First());

        int countNew = 0;
        int dayOfWeekInt = (int)date.DayOfWeek; // 0=Sun, 1=Mon, ..., 6=Sat

        foreach (var emp in employees)
        {
            if (existingMap.TryGetValue(emp.Id, out var existingRecord))
            {
                // If existing record has no shift, resolve it
                if (existingRecord.ShiftId == null && shiftByEmp.TryGetValue(emp.Id, out var esMatch))
                {
                    existingRecord.ShiftId = esMatch.ShiftId;
                    existingRecord.Shift = esMatch.Shift;
                    if (esMatch.Shift != null)
                    {
                        PopulateScheduledTimes(existingRecord, esMatch.Shift, date);
                        RecalculateAttendance(existingRecord);
                    }
                }
                continue;
            }

            var newRecord = new AttendanceDaily
            {
                EmployeeId = emp.Id,
                WorkDate = date,
            };

            // 1. Holiday Check
            if (holiday != null)
            {
                newRecord.Status = "HOLIDAY";
                newRecord.IsAbsent = false;
            }
            // 2. Shift & Work Days Check
            else if (shiftByEmp.TryGetValue(emp.Id, out var es))
            {
                var workDays = es.WorkDays ?? new int[] { 1, 2, 3, 4, 5 };
                bool isWorkDay = workDays.Contains(dayOfWeekInt);

                if (!isWorkDay)
                {
                    newRecord.Status = "OFF";
                    newRecord.IsAbsent = false;
                }
                else
                {
                    newRecord.ShiftId = es.ShiftId;
                    newRecord.Shift = es.Shift;
                    if (es.Shift != null)
                    {
                        PopulateScheduledTimes(newRecord, es.Shift, date);
                    }

                    // Check if date is in the past
                    var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);
                    var today = DateOnly.FromDateTime(nowThai);
                    if (date < today)
                    {
                        newRecord.IsAbsent = true;
                        newRecord.Status = "ABSENT";
                    }
                    else
                    {
                        newRecord.Status = "PENDING";
                    }
                }
            }
            else
            {
                // Standard default Monday-Friday check
                if (dayOfWeekInt == 0 || dayOfWeekInt == 6)
                {
                    newRecord.Status = "OFF";
                    newRecord.IsAbsent = false;
                }
                else
                {
                    var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);
                    var today = DateOnly.FromDateTime(nowThai);
                    if (date < today)
                    {
                        newRecord.IsAbsent = true;
                        newRecord.Status = "ABSENT";
                    }
                    else
                    {
                        newRecord.Status = "PENDING";
                    }
                }
            }

            _context.AttendanceDailies.Add(newRecord);
            countNew++;
        }

        if (countNew > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return countNew;
    }

    private static void PopulateScheduledTimes(AttendanceDaily record, ShiftEntity shift, DateOnly workDate)
    {
        var startTime = shift.StartTime;
        var startLocal = new DateTime(workDate.Year, workDate.Month, workDate.Day, startTime.Hour, startTime.Minute, 0);
        record.ScheduledStart = ToUtcTime(startLocal);

        var endTime = shift.EndTime;
        var endWorkDate = shift.IsCrossDay ? workDate.AddDays(1) : workDate;
        var endLocal = new DateTime(endWorkDate.Year, endWorkDate.Month, endWorkDate.Day, endTime.Hour, endTime.Minute, 0);
        record.ScheduledEnd = ToUtcTime(endLocal);
    }

    private void RecalculateAttendance(AttendanceDaily record)
    {
        if (record.IsAbsent)
        {
            record.Status = "ABSENT";
            record.LateMinutes = 0;
            record.EarlyLeaveMinutes = 0;
            record.WorkedMinutes = 0;
            return;
        }

        if (record.ActualIn == null && record.ActualOut == null)
        {
            return;
        }

        var shift = record.Shift;
        int lateMinutes = 0;
        int earlyMinutes = 0;

        // 1. Calculate Late Minutes
        if (record.ActualIn.HasValue && record.ScheduledStart.HasValue)
        {
            var actualInLocal = ToThaiLocalTime(record.ActualIn.Value);
            var scheduledStartLocal = ToThaiLocalTime(record.ScheduledStart.Value);
            var lateGrace = shift?.LateGraceMinutes ?? 10;
            var lateThreshold = scheduledStartLocal.AddMinutes(lateGrace);

            if (actualInLocal > lateThreshold)
            {
                lateMinutes = (int)Math.Max(0, (actualInLocal - scheduledStartLocal).TotalMinutes);
            }
        }
        record.LateMinutes = lateMinutes;

        // 2. Calculate Early Leave Minutes
        if (record.ActualOut.HasValue && record.ScheduledEnd.HasValue)
        {
            var actualOutLocal = ToThaiLocalTime(record.ActualOut.Value);
            var scheduledEndLocal = ToThaiLocalTime(record.ScheduledEnd.Value);
            var earlyGrace = shift?.EarlyLeaveGraceMinutes ?? 5;
            var earlyThreshold = scheduledEndLocal.AddMinutes(-earlyGrace);

            if (actualOutLocal < earlyThreshold)
            {
                earlyMinutes = (int)Math.Max(0, (scheduledEndLocal - actualOutLocal).TotalMinutes);
            }
        }
        record.EarlyLeaveMinutes = earlyMinutes;

        // 3. Calculate Worked Minutes
        if (record.ActualIn.HasValue && record.ActualOut.HasValue)
        {
            var totalMin = (int)Math.Max(0, (record.ActualOut.Value - record.ActualIn.Value).TotalMinutes);
            var breakMin = shift?.BreakMinutes ?? 60;
            record.WorkedMinutes = Math.Max(0, totalMin - breakMin);
        }

        // 4. Update Status
        if (lateMinutes > 0 && earlyMinutes > 0)
        {
            record.Status = "LATE_AND_EARLY";
        }
        else if (lateMinutes > 0)
        {
            record.Status = "LATE";
        }
        else if (earlyMinutes > 0)
        {
            record.Status = "EARLY_LEAVE";
        }
        else if (record.ActualIn.HasValue)
        {
            record.Status = "PRESENT";
        }
    }

    private async Task<ShiftEntity?> ResolveShiftForEmployeeAsync(long employeeId, DateOnly workDate, CancellationToken cancellationToken)
    {
        var assignment = await _context.EmployeeShifts
            .AsNoTracking()
            .Include(es => es.Shift)
            .Where(es => es.EmployeeId == employeeId && es.EffectiveFrom <= workDate && (es.EffectiveTo == null || es.EffectiveTo >= workDate))
            .OrderByDescending(es => es.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        return assignment?.Shift;
    }

    private static AttendanceDailyDto MapToDto(AttendanceDaily item, EmployeeAssignment? assignment)
    {
        var emp = item.Employee;
        var shift = item.Shift;

        string statusText = item.Status switch
        {
            "PRESENT" => "ตรงเวลา",
            "LATE" => "มาสาย",
            "EARLY_LEAVE" => "ออกก่อนเวลา",
            "LATE_AND_EARLY" => "สายและออกก่อน",
            "ABSENT" => "ขาดงาน",
            "HOLIDAY" => "วันหยุดประเพณี",
            "OFF" => "วันหยุดประจำสัปดาห์",
            "PENDING" => "รอดำเนินการ",
            _ => item.Status
        };

        string? timeWindow = null;
        if (shift != null)
        {
            timeWindow = $"{shift.StartTime:HH\\:mm} - {shift.EndTime:HH\\:mm} น.";
            if (shift.IsCrossDay) timeWindow += " (ข้ามวัน)";
        }

        return new AttendanceDailyDto
        {
            Id = item.Id,
            EmployeeId = item.EmployeeId,
            EmployeeCode = emp?.EmployeeCode ?? "",
            EmployeeName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : "",
            DepartmentId = assignment?.DepartmentId,
            DepartmentName = assignment?.Department?.DepartmentName,
            PositionName = assignment?.Position?.PositionName,
            WorkDate = item.WorkDate.ToString("yyyy-MM-dd"),
            ShiftId = item.ShiftId,
            ShiftName = shift?.ShiftName,
            ShiftCode = shift?.ShiftCode,
            ShiftTimeWindow = timeWindow,
            ScheduledStart = item.ScheduledStart,
            ScheduledEnd = item.ScheduledEnd,
            ActualIn = item.ActualIn,
            ActualOut = item.ActualOut,
            WorkedMinutes = item.WorkedMinutes,
            LateMinutes = item.LateMinutes,
            EarlyLeaveMinutes = item.EarlyLeaveMinutes,
            IsAbsent = item.IsAbsent,
            Status = item.Status,
            StatusText = statusText
        };
    }
}
