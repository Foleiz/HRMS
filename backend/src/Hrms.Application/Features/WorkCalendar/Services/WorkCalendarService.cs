using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Services;
using Hrms.Application.Features.WorkCalendar.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Features.WorkCalendar.Services;

public class WorkCalendarService : IWorkCalendarService
{
    private readonly IHrmsDbContext _context;
    private readonly ILogger<WorkCalendarService> _logger;
    private readonly IAttendanceDailyService _attendanceDailyService;

    private static readonly (string thai, string eng)[] DayNames = new[]
    {
        ("วันอาทิตย์", "Sunday"),
        ("วันจันทร์", "Monday"),
        ("วันอังคาร", "Tuesday"),
        ("วันพุธ", "Wednesday"),
        ("วันพฤหัสบดี", "Thursday"),
        ("วันศุกร์", "Friday"),
        ("วันเสาร์", "Saturday")
    };

    public WorkCalendarService(IHrmsDbContext context, ILogger<WorkCalendarService> logger, IAttendanceDailyService attendanceDailyService)
    {
        _context = context;
        _logger = logger;
        _attendanceDailyService = attendanceDailyService;
    }

    /// <summary>
    /// หลังเปลี่ยนวัน/เวลาทำงานหรือวันหยุดประจำปี: คำนวณข้อมูลเวลาเข้า-ออก (สาย/ออกก่อน/ขาด/วันหยุด) และสรุปรายเดือนใหม่อัตโนมัติ
    /// ถ้าคำนวณไม่สำเร็จ ไม่ทำให้การบันทึกการตั้งค่าล้ม
    /// </summary>
    private async Task RefreshAttendanceAsync(IReadOnlyCollection<DateOnly>? onlyDates = null)
    {
        try
        {
            // วันหยุดกระทบเฉพาะวันที่นั้น ๆ — คำนวณใหม่แค่วันที่เกี่ยวข้อง ไม่ต้องไล่ทั้งระบบ (กันคำขอช้าจน timeout)
            var changed = onlyDates is { Count: > 0 }
                ? await _attendanceDailyService.ApplyCompanyScheduleAsync(onlyDates)
                : await _attendanceDailyService.ApplyCompanyScheduleAsync();
            if (changed > 0) _logger.LogInformation("คำนวณข้อมูลเวลาใหม่ตามการตั้งค่าวันทำงาน/วันหยุด {Count} รายการ", changed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "คำนวณข้อมูลเวลาใหม่ตามการตั้งค่าวันทำงาน/วันหยุดไม่สำเร็จ");
        }
    }

    private static string GetHolidayTypeThai(string type) => type switch
    {
        "PUBLIC" => "วันหยุดตามประเพณี",
        "COMPANY_SPECIAL" => "วันหยุดพิเศษบริษัท",
        "SUBSTITUTE" => "วันหยุดชดเชย",
        _ => "วันหยุดทั่วไป"
    };

    private static readonly HashSet<string> AllowedHolidayTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "PUBLIC", "COMPANY_SPECIAL", "SUBSTITUTE"
    };

    private static (DateOnly date, string name, string type) ValidateHolidayInput(string? holidayDate, string? holidayName, string? holidayType)
    {
        if (string.IsNullOrWhiteSpace(holidayDate)
            || !DateOnly.TryParseExact(holidayDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            throw new ArgumentException("รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้รูปแบบ YYYY-MM-DD");
        }

        var name = holidayName?.Trim() ?? string.Empty;
        if (name.Length == 0)
            throw new ArgumentException("กรุณาระบุชื่อวันหยุด");
        if (name.Length > 255)
            throw new ArgumentException("ชื่อวันหยุดต้องไม่เกิน 255 ตัวอักษร");

        var type = string.IsNullOrWhiteSpace(holidayType) ? "PUBLIC" : holidayType.Trim().ToUpperInvariant();
        if (!AllowedHolidayTypes.Contains(type))
            throw new ArgumentException("ประเภทวันหยุดไม่ถูกต้อง");

        return (date, name, type);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        (ex.InnerException?.Message.Contains("23505") ?? false) || ex.Message.Contains("23505");

    public async Task<List<WorkWeekDto>> GetWorkWeekAsync(long? companyId = null)
    {
        var targetCompanyId = companyId ?? 1;

        var records = await _context.WorkWeeks
            .Where(w => w.CompanyId == targetCompanyId)
            .OrderBy(w => w.DayOfWeek)
            .ToListAsync();

        // If no records, initialize default work week (Mon-Fri working, Sat-Sun off)
        if (records.Count == 0)
        {
            records = new List<WorkWeek>();
            for (short d = 0; d < 7; d++)
            {
                var isWork = (d >= 1 && d <= 5);
                records.Add(new WorkWeek
                {
                    CompanyId = targetCompanyId,
                    DayOfWeek = d,
                    IsWorkingDay = isWork,
                    StartTime = isWork ? new TimeOnly(8, 30) : null,
                    EndTime = isWork ? new TimeOnly(17, 30) : null
                });
            }
            _context.WorkWeeks.AddRange(records);
            await _context.SaveChangesAsync();
        }

        return records.Select(r => new WorkWeekDto
        {
            Id = r.Id,
            DayOfWeek = r.DayOfWeek,
            DayNameThai = (r.DayOfWeek >= 0 && r.DayOfWeek < 7) ? DayNames[r.DayOfWeek].thai : $"วัน {r.DayOfWeek}",
            DayNameEnglish = (r.DayOfWeek >= 0 && r.DayOfWeek < 7) ? DayNames[r.DayOfWeek].eng : $"Day {r.DayOfWeek}",
            IsWorkingDay = r.IsWorkingDay,
            StartTime = r.StartTime.HasValue ? r.StartTime.Value.ToString("HH:mm") : null,
            EndTime = r.EndTime.HasValue ? r.EndTime.Value.ToString("HH:mm") : null
        }).ToList();
    }

    public async Task<List<WorkWeekDto>> UpdateWorkWeekAsync(UpdateWorkWeekRequest request, long? companyId = null)
    {
        var targetCompanyId = companyId ?? 1;

        var existing = await _context.WorkWeeks
            .Where(w => w.CompanyId == targetCompanyId)
            .ToListAsync();

        static TimeOnly? ParseTime(string? timeStr)
        {
            if (string.IsNullOrWhiteSpace(timeStr)) return null;
            if (TimeOnly.TryParse(timeStr, out var t)) return t;
            return null;
        }

        foreach (var item in request.Days)
        {
            var match = existing.FirstOrDefault(w => w.DayOfWeek == item.DayOfWeek);
            var parsedStart = item.IsWorkingDay ? ParseTime(item.StartTime) : null;
            var parsedEnd = item.IsWorkingDay ? ParseTime(item.EndTime) : null;

            if (item.IsWorkingDay)
            {
                parsedStart ??= new TimeOnly(8, 30);
                parsedEnd ??= new TimeOnly(17, 30);
            }

            if (match != null)
            {
                match.IsWorkingDay = item.IsWorkingDay;
                match.StartTime = parsedStart;
                match.EndTime = parsedEnd;
            }
            else
            {
                _context.WorkWeeks.Add(new WorkWeek
                {
                    CompanyId = targetCompanyId,
                    DayOfWeek = item.DayOfWeek,
                    IsWorkingDay = item.IsWorkingDay,
                    StartTime = parsedStart,
                    EndTime = parsedEnd
                });
            }
        }

        await _context.SaveChangesAsync();
        await RefreshAttendanceAsync();
        return await GetWorkWeekAsync(targetCompanyId);
    }

    public async Task<List<HolidayDto>> GetHolidaysAsync(int? year = null, long? companyId = null)
    {
        var targetCompanyId = companyId ?? 1;

        var query = _context.Holidays
            .Where(h => h.CompanyId == targetCompanyId);

        if (year.HasValue)
        {
            var startOfYear = new DateOnly(year.Value, 1, 1);
            var endOfYear = new DateOnly(year.Value, 12, 31);
            query = query.Where(h => h.HolidayDate >= startOfYear && h.HolidayDate <= endOfYear);
        }

        var list = await query
            .OrderBy(h => h.HolidayDate)
            .ToListAsync();

        return list.Select(h => new HolidayDto
        {
            Id = h.Id,
            HolidayDate = h.HolidayDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            HolidayName = h.HolidayName,
            CompanyId = h.CompanyId,
            HolidayType = h.HolidayType,
            HolidayTypeThai = GetHolidayTypeThai(h.HolidayType)
        }).ToList();
    }

    public async Task<HolidayDto?> GetHolidayByIdAsync(long id)
    {
        var h = await _context.Holidays.FindAsync(id);
        if (h == null) return null;

        return new HolidayDto
        {
            Id = h.Id,
            HolidayDate = h.HolidayDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            HolidayName = h.HolidayName,
            CompanyId = h.CompanyId,
            HolidayType = h.HolidayType,
            HolidayTypeThai = GetHolidayTypeThai(h.HolidayType)
        };
    }

    public async Task<HolidayDto> CreateHolidayAsync(CreateHolidayRequest request)
    {
        var targetCompanyId = request.CompanyId ?? 1;
        var (date, name, type) = ValidateHolidayInput(request.HolidayDate, request.HolidayName, request.HolidayType);

        if (!await _context.Companies.AnyAsync(c => c.Id == targetCompanyId))
        {
            throw new InvalidOperationException($"ไม่พบข้อมูลบริษัท (รหัส {targetCompanyId}) กรุณาตั้งค่าข้อมูลบริษัทก่อนเพิ่มวันหยุด");
        }

        var exists = await _context.Holidays
            .AnyAsync(h => h.CompanyId == targetCompanyId && h.HolidayDate == date);

        if (exists)
        {
            throw new InvalidOperationException($"มีวันหยุดสำหรับวันที่ {date:yyyy-MM-dd} ถูกบันทึกไว้ในระบบแล้ว");
        }

        var holiday = new Holiday
        {
            CompanyId = targetCompanyId,
            HolidayDate = date,
            HolidayName = name,
            HolidayType = type
        };

        _context.Holidays.Add(holiday);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // ชนกับ unique (company_id, holiday_date) หรือ sequence ของ id ไม่ตรงกับข้อมูลในตาราง
            _logger.LogError(ex, "บันทึกวันหยุดไม่สำเร็จ (ข้อมูลซ้ำ)");
            throw new InvalidOperationException(
                $"ไม่สามารถบันทึกวันหยุดได้ เนื่องจากข้อมูลซ้ำ (วันที่ {date:yyyy-MM-dd} อาจมีอยู่แล้ว หรือลำดับรหัสในตาราง holiday ไม่ตรง — แจ้งผู้ดูแลระบบให้รัน backend/scripts/holiday_fix_sequence.sql)");
        }
        await RefreshAttendanceAsync(new[] { date });

        return new HolidayDto
        {
            Id = holiday.Id,
            HolidayDate = holiday.HolidayDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            HolidayName = holiday.HolidayName,
            CompanyId = holiday.CompanyId,
            HolidayType = holiday.HolidayType,
            HolidayTypeThai = GetHolidayTypeThai(holiday.HolidayType)
        };
    }

    public async Task<HolidayDto> UpdateHolidayAsync(long id, UpdateHolidayRequest request)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
        {
            throw new KeyNotFoundException($"ไม่พบข้อมูลวันหยุดรหัส {id}");
        }

        var (date, name, type) = ValidateHolidayInput(request.HolidayDate, request.HolidayName, request.HolidayType);

        var exists = await _context.Holidays
            .AnyAsync(h => h.CompanyId == holiday.CompanyId && h.HolidayDate == date && h.Id != id);

        if (exists)
        {
            throw new InvalidOperationException($"มีวันหยุดสำหรับวันที่ {date:yyyy-MM-dd} ถูกบันทึกไว้ในระบบแล้ว");
        }

        var oldDate = holiday.HolidayDate;
        holiday.HolidayDate = date;
        holiday.HolidayName = name;
        holiday.HolidayType = type;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new InvalidOperationException($"มีวันหยุดสำหรับวันที่ {date:yyyy-MM-dd} ถูกบันทึกไว้ในระบบแล้ว");
        }
        // วันเดิมต้องกลับไปเป็นวันทำงาน/ขาด และวันใหม่เป็นวันหยุด
        await RefreshAttendanceAsync(oldDate == date ? new[] { date } : new[] { oldDate, date });

        return new HolidayDto
        {
            Id = holiday.Id,
            HolidayDate = holiday.HolidayDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            HolidayName = holiday.HolidayName,
            CompanyId = holiday.CompanyId,
            HolidayType = holiday.HolidayType,
            HolidayTypeThai = GetHolidayTypeThai(holiday.HolidayType)
        };
    }

    public async Task<bool> DeleteHolidayAsync(long id)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null) return false;

        var removedDate = holiday.HolidayDate;
        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();
        await RefreshAttendanceAsync(new[] { removedDate });
        return true;
    }
}
