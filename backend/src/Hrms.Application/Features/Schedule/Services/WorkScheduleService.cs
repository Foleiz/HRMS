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
/// Service สำหรับจัดการรูปแบบตารางการทำงานหลัก (Work Schedule Master Data)
/// </summary>
public class WorkScheduleService : IWorkScheduleService
{
    private readonly IHrmsDbContext _context;
    private readonly ILogger<WorkScheduleService> _logger;

    public WorkScheduleService(IHrmsDbContext context, ILogger<WorkScheduleService> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static (double? workHours, double? netWorkHours) CalculateHours(TimeOnly? start, TimeOnly? end, int breakMinutes)
    {
        if (start == null || end == null) return (null, null);

        double totalMinutes;
        if (end < start)
        {
            totalMinutes = (24 * 60 - (start.Value.Hour * 60 + start.Value.Minute)) + (end.Value.Hour * 60 + end.Value.Minute);
        }
        else
        {
            totalMinutes = (end.Value.Hour * 60 + end.Value.Minute) - (start.Value.Hour * 60 + start.Value.Minute);
        }

        var workHours = Math.Round(totalMinutes / 60.0, 2);
        var netMinutes = Math.Max(0, totalMinutes - breakMinutes);
        var netWorkHours = Math.Round(netMinutes / 60.0, 2);

        return (workHours, netWorkHours);
    }

    private static WorkScheduleDto MapToDto(WorkSchedule ws)
    {
        var (workHours, netWorkHours) = CalculateHours(ws.WorkStart, ws.WorkEnd, ws.BreakMinutes);

        return new WorkScheduleDto
        {
            Id = ws.Id,
            ScheduleCode = ws.ScheduleCode,
            ScheduleName = ws.ScheduleName,
            WorkStart = ws.WorkStart?.ToString("HH:mm", CultureInfo.InvariantCulture),
            WorkEnd = ws.WorkEnd?.ToString("HH:mm", CultureInfo.InvariantCulture),
            BreakMinutes = ws.BreakMinutes,
            LateGraceMinutes = ws.LateGraceMinutes,
            EarlyLeaveGraceMinutes = ws.EarlyLeaveGraceMinutes,
            Status = ws.Status,
            WorkHours = workHours,
            NetWorkHours = netWorkHours
        };
    }

    private static TimeOnly? ParseNullableTime(string? timeStr, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(timeStr)) return null;

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

    public async Task<List<WorkScheduleDto>> GetAllWorkSchedulesAsync(string? status = null)
    {
        var query = _context.WorkSchedules.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            query = query.Where(ws => ws.Status == status);
        }

        var list = await query
            .OrderBy(ws => ws.ScheduleCode)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<WorkScheduleDto?> GetWorkScheduleByIdAsync(long id)
    {
        var ws = await _context.WorkSchedules.FindAsync(id);
        return ws == null ? null : MapToDto(ws);
    }

    public async Task<WorkScheduleDto> CreateWorkScheduleAsync(CreateWorkScheduleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ScheduleCode))
            throw new ArgumentException("กรุณาระบุรหัสตารางการทำงาน");

        if (string.IsNullOrWhiteSpace(request.ScheduleName))
            throw new ArgumentException("กรุณาระบุชื่อตารางการทำงาน");

        var normalizedCode = request.ScheduleCode.Trim().ToUpperInvariant();

        var exists = await _context.WorkSchedules.AnyAsync(ws => ws.ScheduleCode == normalizedCode);
        if (exists)
            throw new InvalidOperationException($"รหัสตารางการทำงาน '{normalizedCode}' มีอยู่ในระบบแล้ว");

        var workStart = ParseNullableTime(request.WorkStart, "เวลาเริ่มต้นปฏิบัติงาน");
        var workEnd = ParseNullableTime(request.WorkEnd, "เวลาสิ้นสุดปฏิบัติงาน");

        var ws = new WorkSchedule
        {
            ScheduleCode = normalizedCode,
            ScheduleName = request.ScheduleName.Trim(),
            WorkStart = workStart,
            WorkEnd = workEnd,
            BreakMinutes = Math.Max(0, request.BreakMinutes),
            LateGraceMinutes = Math.Max(0, request.LateGraceMinutes),
            EarlyLeaveGraceMinutes = Math.Max(0, request.EarlyLeaveGraceMinutes),
            Status = request.Status?.ToUpperInvariant() == "INACTIVE" ? "INACTIVE" : "ACTIVE"
        };

        _context.WorkSchedules.Add(ws);
        await _context.SaveChangesAsync();

        _logger.LogInformation("สร้างตารางการทำงานสำเร็จ: {Code} ({Name})", ws.ScheduleCode, ws.ScheduleName);
        return MapToDto(ws);
    }

    public async Task<WorkScheduleDto> UpdateWorkScheduleAsync(long id, UpdateWorkScheduleRequest request)
    {
        var ws = await _context.WorkSchedules.FindAsync(id);
        if (ws == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลตารางการทำงานที่ต้องการแก้ไข");

        if (string.IsNullOrWhiteSpace(request.ScheduleName))
            throw new ArgumentException("กรุณาระบุชื่อตารางการทำงาน");

        var workStart = ParseNullableTime(request.WorkStart, "เวลาเริ่มต้นปฏิบัติงาน");
        var workEnd = ParseNullableTime(request.WorkEnd, "เวลาสิ้นสุดปฏิบัติงาน");

        ws.ScheduleName = request.ScheduleName.Trim();
        ws.WorkStart = workStart;
        ws.WorkEnd = workEnd;
        ws.BreakMinutes = Math.Max(0, request.BreakMinutes);
        ws.LateGraceMinutes = Math.Max(0, request.LateGraceMinutes);
        ws.EarlyLeaveGraceMinutes = Math.Max(0, request.EarlyLeaveGraceMinutes);
        ws.Status = request.Status?.ToUpperInvariant() == "INACTIVE" ? "INACTIVE" : "ACTIVE";

        await _context.SaveChangesAsync();

        _logger.LogInformation("อัปเดตตารางการทำงานสำเร็จ: {Code} (Id: {Id})", ws.ScheduleCode, id);
        return MapToDto(ws);
    }

    public async Task<bool> DeleteWorkScheduleAsync(long id)
    {
        var ws = await _context.WorkSchedules.FindAsync(id);
        if (ws == null) return false;

        _context.WorkSchedules.Remove(ws);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ลบตารางการทำงานสำเร็จ: {Code} (Id: {Id})", ws.ScheduleCode, id);
        return true;
    }
}
