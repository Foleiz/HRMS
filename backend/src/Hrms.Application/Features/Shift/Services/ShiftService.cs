using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Shift.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Features.Shift.Services;

public class ShiftService : IShiftService
{
    private readonly IHrmsDbContext _context;
    private readonly ILogger<ShiftService> _logger;

    public ShiftService(IHrmsDbContext context, ILogger<ShiftService> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static (double workHours, double netWorkHours) CalculateHours(TimeOnly start, TimeOnly end, bool isCrossDay, int breakMinutes)
    {
        double totalMinutes;
        if (isCrossDay || end < start)
        {
            totalMinutes = (24 * 60 - (start.Hour * 60 + start.Minute)) + (end.Hour * 60 + end.Minute);
        }
        else
        {
            totalMinutes = (end.Hour * 60 + end.Minute) - (start.Hour * 60 + start.Minute);
        }

        var workHours = Math.Round(totalMinutes / 60.0, 2);
        var netMinutes = Math.Max(0, totalMinutes - breakMinutes);
        var netWorkHours = Math.Round(netMinutes / 60.0, 2);

        return (workHours, netWorkHours);
    }

    private static ShiftDto MapToDto(Domain.Entities.Shift s)
    {
        var (workHours, netWorkHours) = CalculateHours(s.StartTime, s.EndTime, s.IsCrossDay, s.BreakMinutes);

        return new ShiftDto
        {
            Id = s.Id,
            ShiftCode = s.ShiftCode,
            ShiftName = s.ShiftName,
            StartTime = s.StartTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            EndTime = s.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture),
            IsCrossDay = s.IsCrossDay,
            BreakMinutes = s.BreakMinutes,
            Status = s.Status,
            LateGraceMinutes = s.LateGraceMinutes,
            EarlyLeaveGraceMinutes = s.EarlyLeaveGraceMinutes,
            WorkHours = workHours,
            NetWorkHours = netWorkHours
        };
    }

    private static TimeOnly ParseTime(string timeStr, string fieldName)
    {
        if (TimeOnly.TryParseExact(timeStr.Trim(), new[] { "HH:mm", "H:mm", "HH:mm:ss" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        {
            return time;
        }

        if (TimeOnly.TryParse(timeStr.Trim(), CultureInfo.InvariantCulture, out time))
        {
            return time;
        }

        throw new ArgumentException($"รูปแบบเวลาของ {fieldName} ไม่ถูกต้อง กรุณาระบุในรูปแบบ HH:mm เช่น 08:30");
    }

    public async Task<List<ShiftDto>> GetAllShiftsAsync(string? status = null)
    {
        var query = _context.Shifts.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            query = query.Where(s => s.Status == status);
        }

        var list = await query
            .OrderBy(s => s.ShiftCode)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<ShiftDto?> GetShiftByIdAsync(long id)
    {
        var shift = await _context.Shifts.FindAsync(id);
        return shift == null ? null : MapToDto(shift);
    }

    public async Task<ShiftDto> CreateShiftAsync(CreateShiftRequest request)
    {
        var code = request.ShiftCode.Trim().ToUpper();
        var exists = await _context.Shifts.AnyAsync(s => s.ShiftCode == code);
        if (exists)
        {
            throw new InvalidOperationException($"รหัสกะการทำงาน '{code}' มีอยู่ในระบบแล้ว");
        }

        var startTime = ParseTime(request.StartTime, "เวลาเริ่มงาน");
        var endTime = ParseTime(request.EndTime, "เวลาเลิกงาน");

        var isCrossDay = request.IsCrossDay ?? (endTime < startTime);
        if (endTime < startTime)
        {
            isCrossDay = true;
        }

        var shift = new Domain.Entities.Shift
        {
            ShiftCode = code,
            ShiftName = request.ShiftName.Trim(),
            StartTime = startTime,
            EndTime = endTime,
            IsCrossDay = isCrossDay,
            BreakMinutes = Math.Max(0, request.BreakMinutes),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim(),
            LateGraceMinutes = Math.Max(0, request.LateGraceMinutes),
            EarlyLeaveGraceMinutes = Math.Max(0, request.EarlyLeaveGraceMinutes)
        };

        _context.Shifts.Add(shift);
        await _context.SaveChangesAsync();

        return MapToDto(shift);
    }

    public async Task<ShiftDto> UpdateShiftAsync(long id, UpdateShiftRequest request)
    {
        var shift = await _context.Shifts.FindAsync(id);
        if (shift == null)
        {
            throw new KeyNotFoundException($"ไม่พบข้อมูลกะการทำงานรหัส {id}");
        }

        var startTime = ParseTime(request.StartTime, "เวลาเริ่มงาน");
        var endTime = ParseTime(request.EndTime, "เวลาเลิกงาน");

        var isCrossDay = request.IsCrossDay ?? (endTime < startTime);
        if (endTime < startTime)
        {
            isCrossDay = true;
        }

        shift.ShiftName = request.ShiftName.Trim();
        shift.StartTime = startTime;
        shift.EndTime = endTime;
        shift.IsCrossDay = isCrossDay;
        shift.BreakMinutes = Math.Max(0, request.BreakMinutes);
        shift.Status = string.IsNullOrWhiteSpace(request.Status) ? "ACTIVE" : request.Status.Trim();
        shift.LateGraceMinutes = Math.Max(0, request.LateGraceMinutes);
        shift.EarlyLeaveGraceMinutes = Math.Max(0, request.EarlyLeaveGraceMinutes);

        await _context.SaveChangesAsync();

        return MapToDto(shift);
    }

    public async Task<bool> DeleteShiftAsync(long id)
    {
        var shift = await _context.Shifts.FindAsync(id);
        if (shift == null) return false;

        _context.Shifts.Remove(shift);
        await _context.SaveChangesAsync();
        return true;
    }
}
