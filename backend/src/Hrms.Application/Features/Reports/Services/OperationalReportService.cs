using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Reports.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Reports.Services;

public class OperationalReportService : IOperationalReportService
{
    private readonly IHrmsDbContext _context;

    public OperationalReportService(IHrmsDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// ดึงรายงานภาพรวมอัตรากำลังคนประจำวัน (Daily Department Headcount Snapshot)
    /// </summary>
    public async Task<DailyHeadcountSummaryDto> GetDailyHeadcountSnapshotAsync(
        DateOnly date,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        // 1. ดึงแผนกทั้งหมดตามตัวกรอง
        var deptQuery = _context.Departments
            .Include(d => d.Division)
            .AsNoTracking();

        if (divisionId.HasValue && divisionId.Value > 0)
        {
            deptQuery = deptQuery.Where(d => d.DivisionId == divisionId.Value);
        }

        if (departmentId.HasValue && departmentId.Value > 0)
        {
            deptQuery = deptQuery.Where(d => d.Id == departmentId.Value);
        }

        var departments = await deptQuery
            .OrderBy(d => d.Division != null ? d.Division.DivisionCode : "")
            .ThenBy(d => d.DepartmentCode)
            .ToListAsync(cancellationToken);

        // 2. ดึงการมอบหมายงานปัจจุบันของพนักงาน (IsCurrent)
        var assignments = await _context.EmployeeAssignments
            .Include(a => a.Employee)
            .Where(a => a.IsCurrent && a.EffectiveFrom <= date && (a.EffectiveTo == null || a.EffectiveTo >= date))
            .Where(a => a.Employee != null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // จัดกลุ่มพนักงานตามแผนก
        var empIds = assignments.Select(a => a.EmployeeId).Distinct().ToList();

        // 3. ดึงบันทึกเวลาประจำวันของพนักงานทั้งหมดในวันนั้น
        var attendanceRecords = await _context.AttendanceDailies
            .Where(att => att.WorkDate == date && empIds.Contains(att.EmployeeId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var attendanceMap = attendanceRecords.ToDictionary(a => a.EmployeeId);

        var result = new DailyHeadcountSummaryDto
        {
            Date = date,
            Departments = new List<DailyDepartmentHeadcountDto>()
        };

        foreach (var dept in departments)
        {
            var deptAssignments = assignments.Where(a => a.DepartmentId == dept.Id).ToList();
            int totalHeadcount = deptAssignments.Count;

            int presentCount = 0;
            int lateCount = 0;
            int earlyLeaveCount = 0;
            int absentCount = 0;

            foreach (var assign in deptAssignments)
            {
                if (attendanceMap.TryGetValue(assign.EmployeeId, out var att))
                {
                    if (att.IsAbsent || att.Status == "ABSENT")
                    {
                        absentCount++;
                    }
                    else if (att.Status == "LATE")
                    {
                        lateCount++;
                        presentCount++;
                    }
                    else if (att.Status == "EARLY_LEAVE")
                    {
                        earlyLeaveCount++;
                        presentCount++;
                    }
                    else if (att.Status == "LATE_AND_EARLY")
                    {
                        lateCount++;
                        earlyLeaveCount++;
                        presentCount++;
                    }
                    else if (att.ActualIn.HasValue || att.Status == "PRESENT")
                    {
                        presentCount++;
                    }
                    else if (att.Status == "PENDING")
                    {
                        // ยังไม่ลงเวลาและเลยเวลาเริ่มกะหรือไม่
                        absentCount++;
                    }
                }
                else
                {
                    // ไม่มี record ใน attendance_daily ถือว่าขาด/ยังไม่มีข้อมูล
                    absentCount++;
                }
            }

            double rate = totalHeadcount > 0 ? Math.Round(((double)presentCount / totalHeadcount) * 100, 1) : 0;

            result.Departments.Add(new DailyDepartmentHeadcountDto
            {
                DepartmentId = dept.Id,
                DepartmentCode = dept.DepartmentCode,
                DepartmentName = dept.DepartmentName,
                DivisionName = dept.Division?.DivisionName ?? "-",
                TotalHeadcount = totalHeadcount,
                PresentCount = presentCount,
                LateCount = lateCount,
                EarlyLeaveCount = earlyLeaveCount,
                AbsentCount = absentCount,
                AttendanceRate = rate
            });

            result.TotalEmployees += totalHeadcount;
            result.TotalPresent += presentCount;
            result.TotalLate += lateCount;
            result.TotalEarlyLeave += earlyLeaveCount;
            result.TotalAbsent += absentCount;
        }

        result.OverallAttendanceRate = result.TotalEmployees > 0
            ? Math.Round(((double)result.TotalPresent / result.TotalEmployees) * 100, 1)
            : 0;

        return result;
    }

    /// <summary>
    /// ส่งออกรายงานอัตรากำลังคนประจำวันเป็น CSV (UTF-8 with BOM)
    /// </summary>
    public async Task<byte[]> ExportDailyHeadcountCsvAsync(
        DateOnly date,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetDailyHeadcountSnapshotAsync(date, divisionId, departmentId, cancellationToken);

        var sb = new StringBuilder();
        // Header
        sb.AppendLine($"รายงานอัตรากำลังคนประจำวัน,วันที่ {date:dd/MM/yyyy}");
        sb.AppendLine($"สรุปภาพรวม: พนักงานทั้งหมด {data.TotalEmployees} คน, มาทำงาน {data.TotalPresent} คน, มาสาย {data.TotalLate} คน, ออกก่อน {data.TotalEarlyLeave} คน, ขาดงาน {data.TotalAbsent} คน, อัตราการเข้างาน {data.OverallAttendanceRate}%");
        sb.AppendLine();
        sb.AppendLine("รหัสแผนก,ชื่อแผนก,ฝ่าย,พนักงานทั้งหมด (คน),มาปฏิบัติงาน (คน),มาสาย (คน),ออกก่อน (คน),ขาดงาน (คน),อัตราการเข้างาน (%)");

        foreach (var item in data.Departments)
        {
            sb.AppendLine($"\"{EscapeCsv(item.DepartmentCode)}\",\"{EscapeCsv(item.DepartmentName)}\",\"{EscapeCsv(item.DivisionName)}\",{item.TotalHeadcount},{item.PresentCount},{item.LateCount},{item.EarlyLeaveCount},{item.AbsentCount},{item.AttendanceRate}%");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fullBytes = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, fullBytes, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, fullBytes, preamble.Length, contentBytes.Length);

        return fullBytes;
    }

    /// <summary>
    /// ดึงรายงานสรุปเวลาและการมาสายประจำเดือน (Monthly Attendance & Lateness Report)
    /// </summary>
    public async Task<MonthlyLatenessReportDto> GetMonthlyAttendanceLatenessReportAsync(
        int year,
        int month,
        long? departmentId = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        // 1. ดึงพนักงานปัจจุบัน (IsCurrent) พร้อม Assignment
        var empQuery = _context.EmployeeAssignments
            .Include(a => a.Employee)
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => a.IsCurrent && a.Employee != null)
            .AsNoTracking();

        if (departmentId.HasValue && departmentId.Value > 0)
        {
            empQuery = empQuery.Where(a => a.DepartmentId == departmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            empQuery = empQuery.Where(a =>
                a.Employee!.EmployeeCode.ToLower().Contains(s) ||
                a.Employee.FirstName.ToLower().Contains(s) ||
                a.Employee.LastName.ToLower().Contains(s));
        }

        var employees = await empQuery.ToListAsync(cancellationToken);
        var empIds = employees.Select(e => e.EmployeeId).Distinct().ToList();

        // 2. ดึงบันทึกเวลาประจำวันของเดือนนี้
        var attendanceRecords = await _context.AttendanceDailies
            .Where(a => a.WorkDate >= startDate && a.WorkDate <= endDate && empIds.Contains(a.EmployeeId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var attendanceGrouped = attendanceRecords.GroupBy(a => a.EmployeeId).ToDictionary(g => g.Key, g => g.ToList());

        var result = new MonthlyLatenessReportDto
        {
            Year = year,
            Month = month,
            TotalAuditedEmployees = employees.Count,
            Items = new List<MonthlyAttendanceLatenessDto>()
        };

        foreach (var emp in employees.OrderBy(e => e.Employee?.EmployeeCode))
        {
            attendanceGrouped.TryGetValue(emp.EmployeeId, out var records);
            records ??= new List<Domain.Entities.AttendanceDaily>();

            // นับเฉพาะวันที่ไม่ใช่วันหยุดนักขัตฤกษ์หรือวันหยุดประจำสัปดาห์
            var workRecords = records.Where(r => r.Status != "HOLIDAY" && r.Status != "OFF").ToList();

            int totalWorkDays = workRecords.Count;
            int presentDays = workRecords.Count(r => r.Status == "PRESENT");
            int lateDays = workRecords.Count(r => r.LateMinutes > 0 || r.Status == "LATE" || r.Status == "LATE_AND_EARLY");
            int totalLateMinutes = workRecords.Sum(r => r.LateMinutes);
            int earlyLeaveDays = workRecords.Count(r => r.EarlyLeaveMinutes > 0 || r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY");
            int totalEarlyLeaveMinutes = workRecords.Sum(r => r.EarlyLeaveMinutes);
            int absentDays = workRecords.Count(r => r.IsAbsent || r.Status == "ABSENT");

            int actualPresentDays = presentDays + lateDays + earlyLeaveDays;
            double rate = totalWorkDays > 0 ? Math.Round(((double)actualPresentDays / totalWorkDays) * 100, 1) : 0;

            result.Items.Add(new MonthlyAttendanceLatenessDto
            {
                EmployeeId = emp.EmployeeId,
                EmployeeCode = emp.Employee?.EmployeeCode ?? "-",
                EmployeeName = $"{emp.Employee?.FirstName} {emp.Employee?.LastName}".Trim(),
                DepartmentName = emp.Department?.DepartmentName ?? "-",
                PositionName = emp.Position?.PositionName ?? "-",
                TotalWorkDays = totalWorkDays,
                PresentDays = presentDays,
                LateDays = lateDays,
                TotalLateMinutes = totalLateMinutes,
                EarlyLeaveDays = earlyLeaveDays,
                TotalEarlyLeaveMinutes = totalEarlyLeaveMinutes,
                AbsentDays = absentDays,
                AttendanceRate = rate
            });

            result.TotalLateOccurrences += lateDays;
            result.TotalLateMinutes += totalLateMinutes;
        }

        if (result.Items.Count > 0)
        {
            result.OverallAttendanceRate = Math.Round(result.Items.Average(i => i.AttendanceRate), 1);
        }

        return result;
    }

    /// <summary>
    /// ส่งออกรายงานสรุปเวลาและการมาสายประจำเดือนเป็น CSV (UTF-8 with BOM)
    /// </summary>
    public async Task<byte[]> ExportMonthlyLatenessCsvAsync(
        int year,
        int month,
        long? departmentId = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetMonthlyAttendanceLatenessReportAsync(year, month, departmentId, search, cancellationToken);

        var thaiMonths = new[] { "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม" };
        string monthName = month >= 1 && month <= 12 ? thaiMonths[month] : month.ToString();
        int thaiYear = year + 543;

        var sb = new StringBuilder();
        sb.AppendLine($"รายงานสรุปเวลาทำงานและการมาสายประจำเดือน,ประจำเดือน {monthName} พ.ศ. {thaiYear}");
        sb.AppendLine($"สรุปภาพรวม: จำนวนพนักงานที่ตรวจ {data.TotalAuditedEmployees} คน, สายรวม {data.TotalLateOccurrences} ครั้ง, เวลารวมที่สาย {data.TotalLateMinutes} นาที, อัตราเข้างานเฉลี่ย {data.OverallAttendanceRate}%");
        sb.AppendLine();
        sb.AppendLine("รหัสพนักงาน,ชื่อ-นามสกุล,แผนก,ตำแหน่ง,วันทำงาน (วัน),เข้างานตรงเวลา (วัน),มาสาย (ครั้ง),เวลาสายรวม (นาที),ออกก่อน (ครั้ง),เวลาออกก่อนรวม (นาที),ขาดงาน (วัน),อัตราการเข้างาน (%)");

        foreach (var item in data.Items)
        {
            sb.AppendLine($"\"{EscapeCsv(item.EmployeeCode)}\",\"{EscapeCsv(item.EmployeeName)}\",\"{EscapeCsv(item.DepartmentName)}\",\"{EscapeCsv(item.PositionName)}\",{item.TotalWorkDays},{item.PresentDays},{item.LateDays},{item.TotalLateMinutes},{item.EarlyLeaveDays},{item.TotalEarlyLeaveMinutes},{item.AbsentDays},{item.AttendanceRate}%");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fullBytes = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, fullBytes, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, fullBytes, preamble.Length, contentBytes.Length);

        return fullBytes;
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        return value.Replace("\"", "\"\"");
    }
}
