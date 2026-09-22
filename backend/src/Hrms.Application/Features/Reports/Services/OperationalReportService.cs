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

            double rate = totalHeadcount > 0 ? Math.Min(100.0, Math.Round(((double)presentCount / totalHeadcount) * 100, 1)) : 0;

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
            ? Math.Min(100.0, Math.Round(((double)result.TotalPresent / result.TotalEmployees) * 100, 1))
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
            // วันที่มาทำงานจริง (ไม่ขาดงาน และไม่ได้ลา)
            int presentDays = workRecords.Count(r => r.Status == "PRESENT" || (r.ActualIn != null && !r.IsAbsent && r.Status != "ABSENT" && r.Status != "LEAVE"));
            int lateDays = workRecords.Count(r => r.LateMinutes > 0 || r.Status == "LATE" || r.Status == "LATE_AND_EARLY");
            int totalLateMinutes = workRecords.Sum(r => r.LateMinutes);
            int earlyLeaveDays = workRecords.Count(r => r.EarlyLeaveMinutes > 0 || r.Status == "EARLY_LEAVE" || r.Status == "LATE_AND_EARLY");
            int totalEarlyLeaveMinutes = workRecords.Sum(r => r.EarlyLeaveMinutes);
            int absentDays = workRecords.Count(r => (r.IsAbsent || r.Status == "ABSENT") && r.Status != "LEAVE");
            int leaveDays = workRecords.Count(r => r.Status == "LEAVE");

            // อัตราการเข้างาน: คิดจากวันที่มาทำงานจริง (รวมการมาสาย/ออกก่อน ซึ่งถือว่ามาทำงาน) เทียบกับวันทำงานทั้งหมด (Max 100%)
            int actualPresentDays = presentDays;
            if (actualPresentDays == 0 && absentDays < totalWorkDays)
            {
                actualPresentDays = Math.Max(0, totalWorkDays - absentDays);
            }

            double rate = totalWorkDays > 0 
                ? Math.Min(100.0, Math.Round(((double)(actualPresentDays + leaveDays) / totalWorkDays) * 100.0, 1)) 
                : 0;

            result.Items.Add(new MonthlyAttendanceLatenessDto
            {
                EmployeeId = emp.EmployeeId,
                EmployeeCode = emp.Employee?.EmployeeCode ?? "-",
                EmployeeName = $"{emp.Employee?.FirstName} {emp.Employee?.LastName}".Trim(),
                DepartmentName = emp.Department?.DepartmentName ?? "-",
                PositionName = emp.Position?.PositionName ?? "-",
                TotalWorkDays = totalWorkDays,
                PresentDays = actualPresentDays,
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
            result.OverallAttendanceRate = Math.Min(100.0, Math.Round(result.Items.Average(i => i.AttendanceRate), 1));
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

    /// <summary>
    /// ดึงรายงานสรุปภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) และประกันสังคม (สปส. 1-10) ประจำเดือน
    /// </summary>
    public async Task<PayrollTaxSummaryDto> GetPayrollTaxSummaryReportAsync(
        int year,
        int month,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
                .ThenInclude(pr => pr.Employee)
            .Include(p => p.Payrolls)
                .ThenInclude(pr => pr.Details)
                    .ThenInclude(d => d.PayrollItem)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Year == year && p.Month == month, cancellationToken);

        var result = new PayrollTaxSummaryDto
        {
            Year = year,
            Month = month,
            PeriodId = period?.Id,
            PeriodStatus = period?.Status ?? "NONE",
            Items = new List<PayrollTaxItemDto>()
        };

        if (period == null || period.Payrolls == null || !period.Payrolls.Any())
        {
            return result;
        }

        // หากมีตัวกรองแผนก ให้หาชื่อแผนก
        string? filterDeptName = null;
        if (departmentId.HasValue && departmentId.Value > 0)
        {
            var targetDept = await _context.Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == departmentId.Value, cancellationToken);
            filterDeptName = targetDept?.DepartmentName;
        }

        var payrolls = period.Payrolls.AsEnumerable();
        if (!string.IsNullOrEmpty(filterDeptName))
        {
            payrolls = payrolls.Where(p => 
                string.Equals(p.SnapshotDepartmentName?.Trim(), filterDeptName.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        foreach (var p in payrolls.OrderBy(x => x.Employee?.EmployeeCode ?? x.Id.ToString()))
        {
            decimal taxAmount = p.Details
                .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemCode == "DED_TAX" || d.PayrollItem.ItemName.Contains("ภาษี")))
                .Sum(d => d.Amount);

            decimal ssoEmpAmount = p.Details
                .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemCode == "DED_SSO" || d.PayrollItem.ItemName.Contains("ประกันสังคม")))
                .Sum(d => d.Amount);

            // นายจ้างสมทบ 5% เท่ากับลูกจ้าง
            decimal ssoEmployerAmount = ssoEmpAmount;

            string citizenId = p.Employee?.CitizenId ?? string.Empty;
            string maskedCitizenId = p.Employee?.CitizenIdMasked ?? string.Empty;
            if (string.IsNullOrEmpty(maskedCitizenId) && !string.IsNullOrEmpty(citizenId))
            {
                if (citizenId.Length >= 13)
                {
                    maskedCitizenId = $"{citizenId[0]}-{citizenId.Substring(1, 4)}-xxxxx-{citizenId.Substring(10, 2)}-{citizenId[12]}";
                }
                else
                {
                    maskedCitizenId = citizenId.Length > 4 ? new string('x', citizenId.Length - 4) + citizenId[^4..] : citizenId;
                }
            }
            if (string.IsNullOrEmpty(maskedCitizenId))
            {
                maskedCitizenId = "-";
            }

            var itemDto = new PayrollTaxItemDto
            {
                EmployeeId = p.EmployeeId,
                EmployeeCode = p.Employee?.EmployeeCode ?? "-",
                EmployeeName = !string.IsNullOrWhiteSpace(p.SnapshotEmployeeName) 
                    ? p.SnapshotEmployeeName 
                    : $"{p.Employee?.FirstName} {p.Employee?.LastName}".Trim(),
                DepartmentName = p.SnapshotDepartmentName ?? "-",
                PositionName = p.SnapshotPositionName ?? "-",
                CitizenIdMasked = maskedCitizenId,
                GrossIncome = p.TotalGrossIncome,
                WithholdingTax = taxAmount,
                SsoEmployee = ssoEmpAmount,
                SsoEmployer = ssoEmployerAmount,
                TotalDeductions = p.TotalDeductionAmount,
                NetSalary = p.NetPayableSalary
            };

            result.Items.Add(itemDto);
        }

        result.TotalEmployees = result.Items.Count;
        result.TaxableEmployeesCount = result.Items.Count(i => i.WithholdingTax > 0);
        result.TotalGrossIncome = result.Items.Sum(i => i.GrossIncome);
        result.TotalWithholdingTax = result.Items.Sum(i => i.WithholdingTax);
        result.TotalSsoEmployee = result.Items.Sum(i => i.SsoEmployee);
        result.TotalSsoEmployer = result.Items.Sum(i => i.SsoEmployer);
        result.TotalSsoRemittance = result.TotalSsoEmployee + result.TotalSsoEmployer;
        result.TotalNetSalary = result.Items.Sum(i => i.NetSalary);

        return result;
    }

    /// <summary>
    /// ส่งออกรายงานภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) เป็นไฟล์ CSV (UTF-8 with BOM)
    /// </summary>
    public async Task<byte[]> ExportPayrollTaxCsvAsync(
        int year,
        int month,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetPayrollTaxSummaryReportAsync(year, month, departmentId, cancellationToken);

        var thaiMonths = new[] { "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม" };
        string monthName = month >= 1 && month <= 12 ? thaiMonths[month] : month.ToString();
        int thaiYear = year + 543;

        var sb = new StringBuilder();
        sb.AppendLine($"รายงานสรุปภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1),ประจำเดือน {monthName} พ.ศ. {thaiYear}");
        sb.AppendLine($"สรุปภาพรวม: จำนวนพนักงานทั้งหมด {data.TotalEmployees} คน, ผู้มีหน้าที่เสียภาษี {data.TaxableEmployeesCount} คน, เงินได้พึงประเมินรวม {data.TotalGrossIncome:N2} บาท, ภาษีหัก ณ ที่จ่ายรวม {data.TotalWithholdingTax:N2} บาท");
        sb.AppendLine();
        sb.AppendLine("ลำดับ,รหัสพนักงาน,เลขประจำตัวประชาชน,ชื่อ-นามสกุล,แผนก,ตำแหน่ง,เงินได้พึงประเมิน (บาท),ภาษีหัก ณ ที่จ่าย (บาท),เงินเดือนสุทธิ (บาท)");

        int seq = 1;
        foreach (var item in data.Items)
        {
            sb.AppendLine($"{seq++},\"{EscapeCsv(item.EmployeeCode)}\",\"{EscapeCsv(item.CitizenIdMasked)}\",\"{EscapeCsv(item.EmployeeName)}\",\"{EscapeCsv(item.DepartmentName)}\",\"{EscapeCsv(item.PositionName)}\",{item.GrossIncome:F2},{item.WithholdingTax:F2},{item.NetSalary:F2}");
        }

        // Summary Row
        sb.AppendLine($",,,รวมทั้งสิ้น,,, {data.TotalGrossIncome:F2},{data.TotalWithholdingTax:F2},{data.TotalNetSalary:F2}");

        return PrependUtf8Bom(sb.ToString());
    }

    /// <summary>
    /// ส่งออกรายงานเงินสมทบประกันสังคม (สปส. 1-10) เป็นไฟล์ CSV (UTF-8 with BOM)
    /// </summary>
    public async Task<byte[]> ExportSsoCsvAsync(
        int year,
        int month,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetPayrollTaxSummaryReportAsync(year, month, departmentId, cancellationToken);

        var thaiMonths = new[] { "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม" };
        string monthName = month >= 1 && month <= 12 ? thaiMonths[month] : month.ToString();
        int thaiYear = year + 543;

        var sb = new StringBuilder();
        sb.AppendLine($"รายงานการนำส่งเงินสมทบกองทุนประกันสังคม (สปส. 1-10),ประจำเดือน {monthName} พ.ศ. {thaiYear}");
        sb.AppendLine($"สรุปภาพรวม: จำนวนผู้ประกันตน {data.TotalEmployees} คน, ค่าจ้างรวม {data.TotalGrossIncome:N2} บาท, สมทบส่วนผู้ประกันตน {data.TotalSsoEmployee:N2} บาท, สมทบส่วนนายจ้าง {data.TotalSsoEmployer:N2} บาท, รวมเงินสมทบนำส่งทั้งสิ้น {data.TotalSsoRemittance:N2} บาท");
        sb.AppendLine();
        sb.AppendLine("ลำดับ,รหัสพนักงาน,เลขประจำตัวประชาชน,ชื่อ-นามสกุล,แผนก,ตำแหน่ง,ค่าจ้างที่ใช้คำนวณ (บาท),เงินสมทบผู้ประกันตน (5%),เงินสมทบนายจ้าง (5%),รวมยอดนำส่ง (บาท)");

        int seq = 1;
        foreach (var item in data.Items)
        {
            decimal totalRemit = item.SsoEmployee + item.SsoEmployer;
            sb.AppendLine($"{seq++},\"{EscapeCsv(item.EmployeeCode)}\",\"{EscapeCsv(item.CitizenIdMasked)}\",\"{EscapeCsv(item.EmployeeName)}\",\"{EscapeCsv(item.DepartmentName)}\",\"{EscapeCsv(item.PositionName)}\",{item.GrossIncome:F2},{item.SsoEmployee:F2},{item.SsoEmployer:F2},{totalRemit:F2}");
        }

        // Summary Row
        sb.AppendLine($",,,รวมทั้งสิ้น,,, {data.TotalGrossIncome:F2},{data.TotalSsoEmployee:F2},{data.TotalSsoEmployer:F2},{data.TotalSsoRemittance:F2}");

        return PrependUtf8Bom(sb.ToString());
    }

    /// <summary>
    /// ดึงรายงานอัตราการเข้า-ออกของพนักงาน (Monthly Turnover Rate)
    /// </summary>
    public async Task<MonthlyTurnoverSummaryDto> GetMonthlyTurnoverReportAsync(
        int year,
        int month,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        DateOnly monthStart = new DateOnly(year, month, 1);
        DateOnly monthEnd = monthStart.AddMonths(1).AddDays(-1);

        // 1. ดึงแผนกทั้งหมดตามเงื่อนไข
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

        // 2. ดึงข้อมูลสัญญาจ้างและการมอบหมายงานปัจจุบันของพนักงานทั้งหมด
        var contracts = await _context.EmploymentContracts
            .Include(c => c.Employee)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var assignments = await _context.EmployeeAssignments
            .Include(a => a.Employee)
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => a.IsCurrent)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var contractMap = contracts.GroupBy(c => c.EmployeeId).ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.Id).First());

        var result = new MonthlyTurnoverSummaryDto
        {
            Year = year,
            Month = month,
            DepartmentTurnovers = new List<DepartmentTurnoverDto>(),
            EventLogs = new List<TurnoverEventLogDto>()
        };

        foreach (var dept in departments)
        {
            var deptAssignments = assignments.Where(a => a.DepartmentId == dept.Id).ToList();

            int startCount = 0;
            int joinedCount = 0;
            int resignedCount = 0;

            foreach (var assign in deptAssignments)
            {
                contractMap.TryGetValue(assign.EmployeeId, out var contract);
                DateOnly empStart = contract?.StartDate ?? assign.EffectiveFrom;
                DateOnly? empEnd = contract?.TerminationDate ?? assign.EffectiveTo;

                // พนักงานต้นงวด: เริ่มงานก่อนต้นเดือน และยังไม่ลาออกก่อนต้นเดือน
                if (empStart < monthStart && (empEnd == null || empEnd >= monthStart))
                {
                    startCount++;
                }

                // พนักงานเข้าใหม่ในเดือนนี้
                if (empStart >= monthStart && empStart <= monthEnd)
                {
                    joinedCount++;
                    result.EventLogs.Add(new TurnoverEventLogDto
                    {
                        EmployeeId = assign.EmployeeId,
                        EmployeeCode = assign.Employee?.EmployeeCode ?? "-",
                        EmployeeName = $"{assign.Employee?.FirstName} {assign.Employee?.LastName}".Trim(),
                        DepartmentName = dept.DepartmentName,
                        PositionName = assign.Position?.PositionName ?? "-",
                        EventType = "JOINED",
                        EventDate = empStart,
                        Reason = "เริ่มงานใหม่"
                    });
                }

                // พนักงานลาออกในเดือนนี้
                if (empEnd.HasValue && empEnd.Value >= monthStart && empEnd.Value <= monthEnd)
                {
                    resignedCount++;
                    result.EventLogs.Add(new TurnoverEventLogDto
                    {
                        EmployeeId = assign.EmployeeId,
                        EmployeeCode = assign.Employee?.EmployeeCode ?? "-",
                        EmployeeName = $"{assign.Employee?.FirstName} {assign.Employee?.LastName}".Trim(),
                        DepartmentName = dept.DepartmentName,
                        PositionName = assign.Position?.PositionName ?? "-",
                        EventType = "RESIGNED",
                        EventDate = empEnd.Value,
                        Reason = contract?.TerminationReason ?? "สิ้นสุดสัญญา / ลาออก"
                    });
                }
            }

            int endCount = startCount + joinedCount - resignedCount;
            if (endCount < 0) endCount = 0;

            double avgCount = (startCount + endCount) / 2.0;
            double turnoverRate = avgCount > 0 ? Math.Round(((double)resignedCount / avgCount) * 100.0, 2) : 0.0;
            double retentionRate = startCount > 0 ? Math.Round(((double)(startCount - resignedCount) / startCount) * 100.0, 2) : 100.0;
            if (retentionRate < 0) retentionRate = 0;
            if (retentionRate > 100) retentionRate = 100;

            result.DepartmentTurnovers.Add(new DepartmentTurnoverDto
            {
                DepartmentId = dept.Id,
                DepartmentCode = dept.DepartmentCode,
                DepartmentName = dept.DepartmentName,
                DivisionName = dept.Division?.DivisionName ?? "-",
                BeginningHeadcount = startCount,
                JoinedCount = joinedCount,
                ResignedCount = resignedCount,
                EndingHeadcount = endCount,
                TurnoverRate = turnoverRate,
                RetentionRate = retentionRate
            });

            result.TotalBeginningHeadcount += startCount;
            result.TotalJoinedCount += joinedCount;
            result.TotalResignedCount += resignedCount;
            result.TotalEndingHeadcount += endCount;
        }

        double totalAvg = (result.TotalBeginningHeadcount + result.TotalEndingHeadcount) / 2.0;
        result.OverallTurnoverRate = totalAvg > 0 
            ? Math.Round(((double)result.TotalResignedCount / totalAvg) * 100.0, 2) 
            : 0.0;

        result.OverallRetentionRate = result.TotalBeginningHeadcount > 0 
            ? Math.Round(((double)(result.TotalBeginningHeadcount - result.TotalResignedCount) / result.TotalBeginningHeadcount) * 100.0, 2) 
            : 100.0;
        if (result.OverallRetentionRate < 0) result.OverallRetentionRate = 0;
        if (result.OverallRetentionRate > 100) result.OverallRetentionRate = 100;

        result.EventLogs = result.EventLogs.OrderByDescending(e => e.EventDate).ToList();

        return result;
    }

    /// <summary>
    /// ส่งออกรายงานอัตราการเข้า-ออกของพนักงานเป็นไฟล์ CSV (UTF-8 with BOM)
    /// </summary>
    public async Task<byte[]> ExportMonthlyTurnoverCsvAsync(
        int year,
        int month,
        long? divisionId = null,
        long? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetMonthlyTurnoverReportAsync(year, month, divisionId, departmentId, cancellationToken);

        var thaiMonths = new[] { "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม" };
        string monthName = month >= 1 && month <= 12 ? thaiMonths[month] : month.ToString();
        int thaiYear = year + 543;

        var sb = new StringBuilder();
        sb.AppendLine($"รายงานสรุปอัตราการเข้า-ออกของพนักงาน (Turnover Rate),ประจำเดือน {monthName} พ.ศ. {thaiYear}");
        sb.AppendLine($"สรุปภาพรวม: ต้นงวด {data.TotalBeginningHeadcount} คน, เข้าใหม่ {data.TotalJoinedCount} คน, ลาออก {data.TotalResignedCount} คน, สิ้นงวด {data.TotalEndingHeadcount} คน, อัตรา Turnover {data.OverallTurnoverRate}%, อัตรา Retention {data.OverallRetentionRate}%");
        sb.AppendLine();
        sb.AppendLine("--- จำแนกตามฝ่ายและแผนก ---");
        sb.AppendLine("ฝ่าย,รหัสแผนก,ชื่อแผนก,ต้นงวด (คน),เข้าใหม่ (คน),ลาออก (คน),สิ้นงวด (คน),Turnover Rate (%),Retention Rate (%)");

        foreach (var d in data.DepartmentTurnovers)
        {
            sb.AppendLine($"\"{EscapeCsv(d.DivisionName)}\",\"{EscapeCsv(d.DepartmentCode)}\",\"{EscapeCsv(d.DepartmentName)}\",{d.BeginningHeadcount},{d.JoinedCount},{d.ResignedCount},{d.EndingHeadcount},{d.TurnoverRate}%,{d.RetentionRate}%");
        }

        sb.AppendLine();
        sb.AppendLine("--- บันทึกประวัติการเคลื่อนไหวพนักงานประจำเดือน ---");
        sb.AppendLine("วันที่,รหัสพนักงาน,ชื่อ-นามสกุล,แผนก,ตำแหน่ง,ประเภทเหตุการณ์,เหตุผล/หมายเหตุ");

        foreach (var ev in data.EventLogs)
        {
            string eventTypeTh = ev.EventType switch
            {
                "JOINED" => "เริ่มงานใหม่",
                "RESIGNED" => "ลาออก",
                "TERMINATED" => "เลิกจ้าง",
                _ => ev.EventType
            };
            sb.AppendLine($"{ev.EventDate:yyyy-MM-dd},\"{EscapeCsv(ev.EmployeeCode)}\",\"{EscapeCsv(ev.EmployeeName)}\",\"{EscapeCsv(ev.DepartmentName)}\",\"{EscapeCsv(ev.PositionName)}\",\"{EscapeCsv(eventTypeTh)}\",\"{EscapeCsv(ev.Reason)}\"");
        }

        return PrependUtf8Bom(sb.ToString());
    }

    private static byte[] PrependUtf8Bom(string content)
    {
        var preamble = Encoding.UTF8.GetPreamble();
        var contentBytes = Encoding.UTF8.GetBytes(content);
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
