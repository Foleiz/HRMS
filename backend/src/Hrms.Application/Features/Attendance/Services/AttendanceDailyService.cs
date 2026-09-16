using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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

    public AttendanceDailyService(IHrmsDbContext context)
    {
        _context = context;
    }

    public static readonly TimeZoneInfo ThaiZone = GetThaiTimeZone();

    public static TimeZoneInfo GetThaiTimeZone()
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

    public static DateTime ToThaiLocalTime(DateTime utc)
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), ThaiZone);
    }

    public static DateTime ToUtcTime(DateTime local)
    {
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), ThaiZone);
    }

    public async Task<PagedAttendanceResult> GetDailyAttendanceAsync(DailyAttendanceFilterQuery filter, CancellationToken cancellationToken = default)
    {
        DateOnly queryDate;
        if (!string.IsNullOrWhiteSpace(filter.Date) && DateOnly.TryParse(filter.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDate))
        {
            queryDate = parsedDate;
        }
        else
        {
            var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);
            queryDate = DateOnly.FromDateTime(nowThai);
        }

        var query = _context.AttendanceDailies
            .AsNoTracking()
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .Where(a => a.WorkDate == queryDate && (a.ImportBatchId != null || a.ActualIn != null || a.ActualOut != null || (a.Status != "PENDING" && a.Status != "OFF")));

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
        var assignmentsList = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Where(ea => empIds.Contains(ea.EmployeeId) && ea.IsCurrent)
            .ToListAsync(cancellationToken);

        var assignments = assignmentsList
            .GroupBy(ea => ea.EmployeeId)
            .ToDictionary(g => g.Key, g => g.First());

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
        var records = await _context.AttendanceDailies
            .AsNoTracking()
            .Where(a => a.WorkDate == date && (a.ImportBatchId != null || a.ActualIn != null || a.ActualOut != null || (a.Status != "PENDING" && a.Status != "OFF")))
            .ToListAsync(cancellationToken);

        if (records.Count == 0)
        {
            return new DailyAttendanceSummaryDto
            {
                Date = date.ToString("yyyy-MM-dd"),
                TotalEmployees = 0,
                PresentCount = 0,
                LateCount = 0,
                EarlyLeaveCount = 0,
                AbsentCount = 0,
                HolidayOrOffCount = 0,
                AttendanceRate = 0
            };
        }

        var total = records.Count;
        var present = records.Count(r => r.Status == "PRESENT");
        var late = records.Count(r => r.Status == "LATE" || r.Status == "LATE_AND_EARLY");
        var early = records.Count(r => r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY");
        var leave = records.Count(r => r.Status == "LEAVE");
        var absent = records.Count(r => (r.Status == "ABSENT" || r.IsAbsent) && r.Status != "LEAVE");
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
            LeaveCount = leave,
            AbsentCount = absent,
            HolidayOrOffCount = holidayOrOff,
            AttendanceRate = rate
        };
    }

    public async Task<AttendanceDailyDto> ClockInAsync(ClockInRequest request, CancellationToken cancellationToken = default)
    {
        DateOnly workDate;
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);

        if (!string.IsNullOrWhiteSpace(request.WorkDate) && DateOnly.TryParse(request.WorkDate, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDate))
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

        if (!string.IsNullOrWhiteSpace(request.WorkDate) && DateOnly.TryParse(request.WorkDate, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedDate))
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

    private static readonly SemaphoreSlim _ensureLock = new(1, 1);

    private async Task<int> EnsureAttendanceRecordsForDateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        await _ensureLock.WaitAsync(cancellationToken);
        try
        {
            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var existingList = await _context.AttendanceDailies
                .Where(a => a.WorkDate == date)
                .ToListAsync(cancellationToken);

            var existingMap = existingList
                .GroupBy(a => a.EmployeeId)
                .ToDictionary(g => g.Key, g => g.First());

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
                    // If existing record has no shift or needs scheduled times refreshed
                    if (shiftByEmp.TryGetValue(emp.Id, out var esMatch) && esMatch.Shift != null)
                    {
                        if (existingRecord.ShiftId == null || existingRecord.ShiftId == esMatch.ShiftId)
                        {
                            existingRecord.ShiftId = esMatch.ShiftId;
                            PopulateScheduledTimes(existingRecord, esMatch.Shift, date);
                            if (existingRecord.ActualIn != null || existingRecord.ActualOut != null)
                            {
                                RecalculateAttendance(existingRecord, esMatch.Shift);
                            }
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
                try
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException)
                {
                    // Detach tracked entries to keep DbContext clean if another request already inserted
                    if (_context is DbContext db)
                    {
                        foreach (var entry in db.ChangeTracker.Entries<AttendanceDaily>().ToList())
                        {
                            entry.State = EntityState.Detached;
                        }
                    }
                }
            }

            return countNew;
        }
        finally
        {
            _ensureLock.Release();
        }
    }

    public static void PopulateScheduledTimes(AttendanceDaily record, ShiftEntity shift, DateOnly workDate)
    {
        var startTime = shift.StartTime;
        var startLocal = new DateTime(workDate.Year, workDate.Month, workDate.Day, startTime.Hour, startTime.Minute, 0);
        record.ScheduledStart = ToUtcTime(startLocal);

        var endTime = shift.EndTime;
        var endWorkDate = shift.IsCrossDay ? workDate.AddDays(1) : workDate;
        var endLocal = new DateTime(endWorkDate.Year, endWorkDate.Month, endWorkDate.Day, endTime.Hour, endTime.Minute, 0);
        record.ScheduledEnd = ToUtcTime(endLocal);
    }

    public static void RecalculateAttendance(AttendanceDaily record, ShiftEntity? shiftOverride = null)
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

        var shift = shiftOverride ?? record.Shift;
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
            "LEAVE" => "ลา",
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

    public async Task<AttendanceDailyDto?> GetMyTodayAttendanceAsync(long employeeId, CancellationToken cancellationToken = default)
    {
        var nowThai = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ThaiZone);
        var today = DateOnly.FromDateTime(nowThai);

        var record = await _context.AttendanceDailies
            .AsNoTracking()
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.WorkDate == today, cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == employeeId && ea.IsCurrent, cancellationToken);

        if (record == null)
        {
            // If no record exists yet, check if employee has an assigned shift today
            var shift = await ResolveShiftForEmployeeAsync(employeeId, today, cancellationToken);
            var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);
            
            if (emp == null) return null;

            return new AttendanceDailyDto
            {
                Id = 0,
                EmployeeId = employeeId,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = $"{emp.FirstName} {emp.LastName}".Trim(),
                DepartmentId = assign?.DepartmentId,
                DepartmentName = assign?.Department?.DepartmentName,
                PositionName = assign?.Position?.PositionName,
                WorkDate = today.ToString("yyyy-MM-dd"),
                ShiftId = shift?.Id,
                ShiftName = shift?.ShiftName,
                ShiftCode = shift?.ShiftCode,
                ShiftTimeWindow = shift != null ? $"{shift.StartTime:HH\\:mm} - {shift.EndTime:HH\\:mm} น." : null,
                Status = "PENDING",
                StatusText = "ยังไม่ลงเวลา"
            };
        }

        return MapToDto(record, assign);
    }

    public async Task<List<AttendanceDailyDto>> GetMyAttendanceHistoryAsync(long employeeId, int year, int month, CancellationToken cancellationToken = default)
    {
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var records = await _context.AttendanceDailies
            .AsNoTracking()
            .Include(a => a.Employee)
            .Include(a => a.Shift)
            .Where(a => a.EmployeeId == employeeId && a.WorkDate >= startDate && a.WorkDate <= endDate)
            .OrderByDescending(a => a.WorkDate)
            .ToListAsync(cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == employeeId && ea.IsCurrent, cancellationToken);

        return records.Select(r => MapToDto(r, assign)).ToList();
    }

    public async Task<MyAttendanceMonthlySummaryDto> GetMyMonthlySummaryAsync(long employeeId, int year, int month, CancellationToken cancellationToken = default)
    {
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var records = await _context.AttendanceDailies
            .AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.WorkDate >= startDate && a.WorkDate <= endDate)
            .ToListAsync(cancellationToken);

        var summary = new MyAttendanceMonthlySummaryDto
        {
            Year = year,
            Month = month,
            TotalWorkDays = records.Count(r => r.Status != "OFF" && r.Status != "HOLIDAY"),
            PresentCount = records.Count(r => r.Status == "PRESENT" || (r.ActualIn != null && r.Status != "ABSENT")),
            LateCount = records.Count(r => r.LateMinutes > 0 || r.Status == "LATE" || r.Status == "LATE_AND_EARLY"),
            TotalLateMinutes = records.Sum(r => r.LateMinutes),
            EarlyLeaveCount = records.Count(r => r.EarlyLeaveMinutes > 0 || r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY"),
            TotalEarlyLeaveMinutes = records.Sum(r => r.EarlyLeaveMinutes),
            AbsentCount = records.Count(r => r.IsAbsent || r.Status == "ABSENT"),
            HolidayCount = records.Count(r => r.Status == "HOLIDAY"),
            OffCount = records.Count(r => r.Status == "OFF")
        };

        return summary;
    }

    public async Task<MonthlyAttendanceOverviewDto> GetMonthlyAttendanceSummaryAsync(int year, int month, long? departmentId = null, CancellationToken cancellationToken = default)
    {
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var employeesQuery = _context.Employees
            .AsNoTracking();

        if (departmentId.HasValue && departmentId.Value > 0)
        {
            employeesQuery = employeesQuery.Where(e => _context.EmployeeAssignments
                .Any(ea => ea.EmployeeId == e.Id && ea.IsCurrent && ea.DepartmentId == departmentId.Value));
        }

        var employees = await employeesQuery.OrderBy(e => e.EmployeeCode).ToListAsync(cancellationToken);
        var empIds = employees.Select(e => e.Id).ToList();

        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Where(ea => empIds.Contains(ea.EmployeeId) && ea.IsCurrent)
            .ToListAsync(cancellationToken);
        var assignMap = assignments.GroupBy(ea => ea.EmployeeId).ToDictionary(g => g.Key, g => g.First());

        var summaries = await _context.AttendanceMonthlySummaries
            .AsNoTracking()
            .Where(s => s.Year == year && s.Month == month && empIds.Contains(s.EmployeeId))
            .ToListAsync(cancellationToken);
        var summaryMap = summaries.ToDictionary(s => s.EmployeeId);

        var dailies = await _context.AttendanceDailies
            .AsNoTracking()
            .Where(a => empIds.Contains(a.EmployeeId) && a.WorkDate >= startDate && a.WorkDate <= endDate)
            .ToListAsync(cancellationToken);

        var approvedOvertimes = await _context.OvertimeRequests
            .AsNoTracking()
            .Where(o => empIds.Contains(o.EmployeeId) && o.Status == "APPROVED" && o.WorkDate >= startDate && o.WorkDate <= endDate)
            .ToListAsync(cancellationToken);
        var otMap = approvedOvertimes
            .GroupBy(o => o.EmployeeId)
            .ToDictionary(g => g.Key, g => g.Sum(o => o.OvertimeHours));

        DateTime? lastProcessedAt = summaries.Count > 0 ? summaries.Max(s => s.GeneratedAt) : null;

        var empDtos = new List<MonthlyEmployeeAttendanceDto>();

        foreach (var emp in employees)
        {
            assignMap.TryGetValue(emp.Id, out var assign);
            bool hasSummary = summaryMap.TryGetValue(emp.Id, out var summary);

            int totalWorkDays;
            int actualWorkDays;
            int lateDays;
            int lateMinutes;
            int earlyLeaveDays;
            int earlyLeaveMinutes;
            decimal leaveDays;
            int absentDays;
            decimal otHours;

            if (hasSummary && summary != null)
            {
                totalWorkDays = summary.TotalWorkDays;
                actualWorkDays = summary.TotalActualWorkDays;
                lateDays = summary.TotalLateDays;
                lateMinutes = summary.TotalLateMinutes;
                earlyLeaveDays = summary.TotalEarlyLeaveDays;
                earlyLeaveMinutes = summary.TotalEarlyLeaveMinutes;
                leaveDays = summary.TotalLeaveDays;
                absentDays = summary.TotalAbsentDays;
                otHours = summary.TotalOvertimeHours;
            }
            else
            {
                var empRecords = dailies.Where(d => d.EmployeeId == emp.Id).ToList();
                totalWorkDays = empRecords.Count(r => r.Status != "OFF" && r.Status != "HOLIDAY");
                actualWorkDays = empRecords.Count(r => r.Status == "PRESENT" || (r.ActualIn != null && r.Status != "ABSENT" && r.Status != "LEAVE"));
                lateDays = empRecords.Count(r => r.LateMinutes > 0 || r.Status == "LATE" || r.Status == "LATE_AND_EARLY");
                lateMinutes = empRecords.Sum(r => r.LateMinutes);
                earlyLeaveDays = empRecords.Count(r => r.EarlyLeaveMinutes > 0 || r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY");
                earlyLeaveMinutes = empRecords.Sum(r => r.EarlyLeaveMinutes);
                leaveDays = (decimal)empRecords.Count(r => r.Status == "LEAVE");
                absentDays = empRecords.Count(r => (r.IsAbsent || r.Status == "ABSENT") && r.Status != "LEAVE");
                otMap.TryGetValue(emp.Id, out otHours);
            }

            double rate = totalWorkDays > 0 ? Math.Min(100.0, Math.Round((double)(actualWorkDays + (int)leaveDays) / totalWorkDays * 100.0, 1)) : 0;

            empDtos.Add(new MonthlyEmployeeAttendanceDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = $"{emp.FirstName} {emp.LastName}".Trim(),
                DepartmentName = assign?.Department?.DepartmentName,
                PositionName = assign?.Position?.PositionName,
                TotalWorkDays = totalWorkDays,
                ActualWorkDays = actualWorkDays,
                LateDays = lateDays,
                LateMinutes = lateMinutes,
                EarlyLeaveDays = earlyLeaveDays,
                EarlyLeaveMinutes = earlyLeaveMinutes,
                LeaveDays = leaveDays,
                AbsentDays = absentDays,
                OvertimeHours = otHours,
                AttendanceRate = rate,
                HasProcessedSummary = hasSummary
            });
        }

        var overview = new MonthlyAttendanceOverviewDto
        {
            Year = year,
            Month = month,
            TotalEmployees = empDtos.Count,
            TotalPlannedDays = empDtos.Sum(e => e.TotalWorkDays),
            TotalActualDays = empDtos.Sum(e => e.ActualWorkDays),
            TotalLateMinutes = empDtos.Sum(e => e.LateMinutes),
            TotalLeaveDays = empDtos.Sum(e => e.LeaveDays),
            TotalAbsentDays = empDtos.Sum(e => e.AbsentDays),
            AverageAttendanceRate = empDtos.Count > 0 ? Math.Round(empDtos.Average(e => e.AttendanceRate), 1) : 0,
            LastProcessedAt = lastProcessedAt,
            Employees = empDtos
        };

        return overview;
    }

    public async Task<MonthlyAttendanceOverviewDto> ProcessMonthlyAttendanceSummaryAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var employees = await _context.Employees
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync(cancellationToken);

        var empIds = employees.Select(e => e.Id).ToList();

        var dailies = await _context.AttendanceDailies
            .Where(a => empIds.Contains(a.EmployeeId) && a.WorkDate >= startDate && a.WorkDate <= endDate)
            .ToListAsync(cancellationToken);

        var approvedOvertimes = await _context.OvertimeRequests
            .AsNoTracking()
            .Where(o => empIds.Contains(o.EmployeeId) && o.Status == "APPROVED" && o.WorkDate >= startDate && o.WorkDate <= endDate)
            .ToListAsync(cancellationToken);
        var otMap = approvedOvertimes
            .GroupBy(o => o.EmployeeId)
            .ToDictionary(g => g.Key, g => g.Sum(o => o.OvertimeHours));

        var existingSummaries = await _context.AttendanceMonthlySummaries
            .Where(s => s.Year == year && s.Month == month && empIds.Contains(s.EmployeeId))
            .ToListAsync(cancellationToken);

        var summaryMap = existingSummaries.ToDictionary(s => s.EmployeeId);

        var nowUtc = DateTime.UtcNow;

        foreach (var emp in employees)
        {
            var empRecords = dailies.Where(d => d.EmployeeId == emp.Id).ToList();

            var totalWorkDays = empRecords.Count(r => r.Status != "OFF" && r.Status != "HOLIDAY");
            var actualWorkDays = empRecords.Count(r => r.Status == "PRESENT" || (r.ActualIn != null && r.Status != "ABSENT" && r.Status != "LEAVE"));
            var totalWorkedMinutes = empRecords.Sum(r => r.WorkedMinutes);
            var lateDays = empRecords.Count(r => r.LateMinutes > 0 || r.Status == "LATE" || r.Status == "LATE_AND_EARLY");
            var lateMinutes = empRecords.Sum(r => r.LateMinutes);
            var earlyLeaveDays = empRecords.Count(r => r.EarlyLeaveMinutes > 0 || r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY");
            var earlyLeaveMinutes = empRecords.Sum(r => r.EarlyLeaveMinutes);
            var leaveDays = (decimal)empRecords.Count(r => r.Status == "LEAVE");
            var absentDays = empRecords.Count(r => (r.IsAbsent || r.Status == "ABSENT") && r.Status != "LEAVE");
            otMap.TryGetValue(emp.Id, out var otHours);

            if (summaryMap.TryGetValue(emp.Id, out var existing))
            {
                existing.TotalWorkDays = totalWorkDays;
                existing.TotalActualWorkDays = actualWorkDays;
                existing.TotalWorkedMinutes = totalWorkedMinutes;
                existing.TotalLateDays = lateDays;
                existing.TotalLateMinutes = lateMinutes;
                existing.TotalEarlyLeaveDays = earlyLeaveDays;
                existing.TotalEarlyLeaveMinutes = earlyLeaveMinutes;
                existing.TotalLeaveDays = leaveDays;
                existing.TotalAbsentDays = absentDays;
                existing.TotalOvertimeHours = otHours;
                existing.GeneratedAt = nowUtc;
            }
            else
            {
                var newSummary = new AttendanceMonthlySummary
                {
                    EmployeeId = emp.Id,
                    Year = year,
                    Month = month,
                    TotalWorkDays = totalWorkDays,
                    TotalActualWorkDays = actualWorkDays,
                    TotalWorkedMinutes = totalWorkedMinutes,
                    TotalLateDays = lateDays,
                    TotalLateMinutes = lateMinutes,
                    TotalEarlyLeaveDays = earlyLeaveDays,
                    TotalEarlyLeaveMinutes = earlyLeaveMinutes,
                    TotalLeaveDays = leaveDays,
                    TotalAbsentDays = absentDays,
                    TotalOvertimeHours = otHours,
                    GeneratedAt = nowUtc
                };
                _context.AttendanceMonthlySummaries.Add(newSummary);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await GetMonthlyAttendanceSummaryAsync(year, month, null, cancellationToken);
    }

    public async Task<byte[]> ExportMonthlyAttendanceCsvAsync(int year, int month, long? departmentId = null, CancellationToken cancellationToken = default)
    {
        var data = await GetMonthlyAttendanceSummaryAsync(year, month, departmentId, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("รหัสพนักงาน,ชื่อ-นามสกุล,แผนก,ตำแหน่ง,วันทำงานตามแผน,วันทำงานจริง,สาย(ครั้ง),สาย(นาที),ออกก่อน(ครั้ง),ออกก่อน(นาที),ลางาน(วัน),ขาดงาน(วัน),OT(ชม.),อัตราการเข้างาน(%),สถานะ");

        foreach (var emp in data.Employees)
        {
            var statusStr = emp.HasProcessedSummary ? "ประมวลผลแล้ว" : "รอดำเนินการ";
            sb.AppendLine($"\"{emp.EmployeeCode}\",\"{emp.EmployeeName}\",\"{emp.DepartmentName ?? "-"}\",\"{emp.PositionName ?? "-"}\",{emp.TotalWorkDays},{emp.ActualWorkDays},{emp.LateDays},{emp.LateMinutes},{emp.EarlyLeaveDays},{emp.EarlyLeaveMinutes},{emp.LeaveDays},{emp.AbsentDays},{emp.OvertimeHours},{emp.AttendanceRate}%,{statusStr}");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        return preamble.Concat(contentBytes).ToArray();
    }
}
