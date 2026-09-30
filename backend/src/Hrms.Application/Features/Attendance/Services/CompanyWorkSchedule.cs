using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Services;

/// <summary>
/// วันทำงานและเวลาทำงานปกติของบริษัท (เมนู "วันทำงานและวันหยุด" → วันทำงานประจำสัปดาห์)
/// ใช้เป็นค่าเริ่มต้นกับพนักงานที่ไม่ได้ผูกกะ: เวลาเข้า-เลิกงานตามตาราง (คำนวณสาย/ออกก่อน) และวันทำงาน (นับขาด/วันหยุด)
/// ยังไม่เคยตั้งค่า → จันทร์–ศุกร์ 08:30–17:30 (ค่าเดียวกับหน้าตั้งค่า)
/// </summary>
public sealed class CompanyWorkSchedule
{
    public const long DefaultCompanyId = 1;

    private readonly Dictionary<int, (bool IsWorkingDay, TimeOnly? Start, TimeOnly? End)> _days;

    private CompanyWorkSchedule(Dictionary<int, (bool, TimeOnly?, TimeOnly?)> days) => _days = days;

    public static CompanyWorkSchedule Default()
    {
        var days = new Dictionary<int, (bool, TimeOnly?, TimeOnly?)>();
        for (var d = 0; d < 7; d++)
        {
            var work = d >= 1 && d <= 5;
            days[d] = (work, work ? new TimeOnly(8, 30) : null, work ? new TimeOnly(17, 30) : null);
        }
        return new CompanyWorkSchedule(days);
    }

    public static async Task<CompanyWorkSchedule> LoadAsync(IHrmsDbContext context, CancellationToken cancellationToken = default)
    {
        var rows = await context.WorkWeeks.AsNoTracking()
            .Where(w => w.CompanyId == DefaultCompanyId)
            .ToListAsync(cancellationToken);
        if (rows.Count == 0) return Default();

        var fallback = Default();
        var days = new Dictionary<int, (bool, TimeOnly?, TimeOnly?)>();
        for (var d = 0; d < 7; d++)
        {
            var row = rows.FirstOrDefault(r => r.DayOfWeek == d);
            days[d] = row != null ? (row.IsWorkingDay, row.StartTime, row.EndTime) : fallback._days[d];
        }
        return new CompanyWorkSchedule(days);
    }

    public bool IsWorkingDay(DateOnly date) => _days[(int)date.DayOfWeek].IsWorkingDay;

    /// <summary>ใส่เวลาเข้า-เลิกงานตามตารางของบริษัท (UTC) — วันที่ไม่ใช่วันทำงาน/ไม่มีเวลา = ล้างเป็น null</summary>
    public void PopulateScheduledTimes(AttendanceDaily record, DateOnly date)
    {
        var day = _days[(int)date.DayOfWeek];
        if (!day.IsWorkingDay || day.Start == null || day.End == null)
        {
            record.ScheduledStart = null;
            record.ScheduledEnd = null;
            return;
        }

        var start = day.Start.Value;
        var end = day.End.Value;
        var endDate = end <= start ? date.AddDays(1) : date; // เวลาเลิกงานข้ามวัน
        record.ScheduledStart = AttendanceDailyService.ToUtcTime(new DateTime(date.Year, date.Month, date.Day, start.Hour, start.Minute, 0));
        record.ScheduledEnd = AttendanceDailyService.ToUtcTime(new DateTime(endDate.Year, endDate.Month, endDate.Day, end.Hour, end.Minute, 0));
    }
}
