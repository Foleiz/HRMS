using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.WorkCalendar.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Features.WorkCalendar.Services;

public class WorkCalendarService : IWorkCalendarService
{
    private readonly IHrmsDbContext _context;
    private readonly ILogger<WorkCalendarService> _logger;

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

    public WorkCalendarService(IHrmsDbContext context, ILogger<WorkCalendarService> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static string GetHolidayTypeThai(string type) => type switch
    {
        "PUBLIC" => "วันหยุดตามประเพณี",
        "COMPANY_SPECIAL" => "วันหยุดพิเศษบริษัท",
        "SUBSTITUTE" => "วันหยุดชดเชย",
        _ => "วันหยุดทั่วไป"
    };

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
                records.Add(new WorkWeek
                {
                    CompanyId = targetCompanyId,
                    DayOfWeek = d,
                    IsWorkingDay = (d >= 1 && d <= 5)
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
            IsWorkingDay = r.IsWorkingDay
        }).ToList();
    }

    public async Task<List<WorkWeekDto>> UpdateWorkWeekAsync(UpdateWorkWeekRequest request, long? companyId = null)
    {
        var targetCompanyId = companyId ?? 1;

        var existing = await _context.WorkWeeks
            .Where(w => w.CompanyId == targetCompanyId)
            .ToListAsync();

        foreach (var item in request.Days)
        {
            var match = existing.FirstOrDefault(w => w.DayOfWeek == item.DayOfWeek);
            if (match != null)
            {
                match.IsWorkingDay = item.IsWorkingDay;
            }
            else
            {
                _context.WorkWeeks.Add(new WorkWeek
                {
                    CompanyId = targetCompanyId,
                    DayOfWeek = item.DayOfWeek,
                    IsWorkingDay = item.IsWorkingDay
                });
            }
        }

        await _context.SaveChangesAsync();
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

        if (!DateOnly.TryParse(request.HolidayDate, CultureInfo.InvariantCulture, out var date))
        {
            throw new ArgumentException("รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้รูปแบบ YYYY-MM-DD");
        }

        var exists = await _context.Holidays
            .AnyAsync(h => h.CompanyId == targetCompanyId && h.HolidayDate == date);

        if (exists)
        {
            throw new InvalidOperationException($"มีวันหยุดสำหรับวันที่ {request.HolidayDate} ถูกบันทึกไว้ในระบบแล้ว");
        }

        var holiday = new Holiday
        {
            CompanyId = targetCompanyId,
            HolidayDate = date,
            HolidayName = request.HolidayName.Trim(),
            HolidayType = string.IsNullOrWhiteSpace(request.HolidayType) ? "PUBLIC" : request.HolidayType.Trim()
        };

        _context.Holidays.Add(holiday);
        await _context.SaveChangesAsync();

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

        if (!DateOnly.TryParse(request.HolidayDate, CultureInfo.InvariantCulture, out var date))
        {
            throw new ArgumentException("รูปแบบวันที่ไม่ถูกต้อง กรุณาใช้รูปแบบ YYYY-MM-DD");
        }

        var exists = await _context.Holidays
            .AnyAsync(h => h.CompanyId == holiday.CompanyId && h.HolidayDate == date && h.Id != id);

        if (exists)
        {
            throw new InvalidOperationException($"มีวันหยุดสำหรับวันที่ {request.HolidayDate} ถูกบันทึกไว้ในระบบแล้ว");
        }

        holiday.HolidayDate = date;
        holiday.HolidayName = request.HolidayName.Trim();
        holiday.HolidayType = string.IsNullOrWhiteSpace(request.HolidayType) ? "PUBLIC" : request.HolidayType.Trim();

        await _context.SaveChangesAsync();

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

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();
        return true;
    }
}
