using System.Globalization;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

// ───────────────────────── DTOs ─────────────────────────

public class LeaveCalendarItem
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public long? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public long LeaveTypeId { get; set; }
    public string LeaveTypeName { get; set; } = string.Empty;
    public string? FormCategory { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public decimal LeaveDays { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class LeaveCalendarResult
{
    /// <summary>ORG (ทั้งบริษัท) / DIVISION / DEPARTMENT — ขอบเขตที่ผู้ใช้เห็น</summary>
    public string Scope { get; set; } = "DEPARTMENT";
    public List<LeaveCalendarItem> Items { get; set; } = new();
}

public class LeaveReportRow
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Days { get; set; }
    public int Requests { get; set; }
    public int Employees { get; set; }
}

public class LeaveReportCell
{
    public string DepartmentName { get; set; } = string.Empty;
    public string LeaveTypeName { get; set; } = string.Empty;
    public decimal Days { get; set; }
}

public class LeaveReportTopEmployee
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public decimal Days { get; set; }
    public int Requests { get; set; }
}

public class LeaveSummaryReport
{
    public int Year { get; set; }
    public decimal TotalDays { get; set; }
    public int TotalRequests { get; set; }
    public int EmployeesOnLeave { get; set; }
    public int PendingRequests { get; set; }
    public List<LeaveReportRow> ByType { get; set; } = new();
    public List<LeaveReportRow> ByDepartment { get; set; } = new();
    /// <summary>12 เดือน (1-12)</summary>
    public List<LeaveReportRow> ByMonth { get; set; } = new();
    public List<LeaveReportCell> DepartmentByType { get; set; } = new();
    public List<LeaveReportTopEmployee> TopEmployees { get; set; } = new();
}

public interface ILeaveInsightsService
{
    Task<LeaveCalendarResult> GetCalendarAsync(DateOnly from, DateOnly to, long? departmentId, long? divisionId, bool includePending, CancellationToken cancellationToken = default);
    Task<LeaveSummaryReport> GetSummaryReportAsync(int year, long? departmentId, CancellationToken cancellationToken = default);
    string BuildSummaryCsv(LeaveSummaryReport report);
}

/// <summary>
/// ปฏิทินการลาของทีม/แผนก และสรุปรายงานการลา
/// - ปฏิทิน: พนักงานเห็นแผนกตัวเอง, หัวหน้าฝ่ายเห็นทั้งฝ่าย, ฝ่ายบุคคล/ผู้บริหารเห็นทั้งบริษัท (ไม่แสดงเหตุผลการลา)
/// - รายงาน: เฉพาะฝ่ายบุคคล/ผู้บริหาร
/// </summary>
public class LeaveInsightsService : ILeaveInsightsService
{
    private static readonly string[] MonthNames = { "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IDataScopeService _dataScope;

    public LeaveInsightsService(IHrmsDbContext context, ICurrentUserService currentUser, IDataScopeService dataScope)
    {
        _context = context;
        _currentUser = currentUser;
        _dataScope = dataScope;
    }

    public async Task<LeaveCalendarResult> GetCalendarAsync(DateOnly from, DateOnly to, long? departmentId, long? divisionId, bool includePending, CancellationToken cancellationToken = default)
    {
        if (to < from) (from, to) = (to, from);
        if (to.DayNumber - from.DayNumber > 92) to = from.AddDays(92);

        // ขอบเขตที่ผู้ใช้เห็น (ตรวจสอบจากสิทธิ์ LEAVE_BALANCE_VIEW หรือ ESS_LEAVE_VIEW)
        string scope;
        long? scopeDept = null, scopeDiv = null;

        var widestScope = _dataScope.GetScope("LEAVE_BALANCE_VIEW");
        if (string.Equals(widestScope, "SELF", StringComparison.OrdinalIgnoreCase))
        {
            var essScope = _dataScope.GetScope("ESS_LEAVE_VIEW");
            if (!string.Equals(essScope, "SELF", StringComparison.OrdinalIgnoreCase))
                widestScope = essScope;
        }

        bool isOrg = _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER") || string.Equals(widestScope, "ORGANIZATION", StringComparison.OrdinalIgnoreCase);

        if (isOrg)
        {
            scope = "ORG";
            scopeDept = departmentId;
            scopeDiv = divisionId;
        }
        else
        {
            var me = _currentUser.EmployeeId ?? throw new ForbiddenException("ไม่พบข้อมูลพนักงานของผู้ใช้");
            var myAssign = await CurrentAssignmentAsync(me, cancellationToken)
                           ?? throw new ForbiddenException("ยังไม่มีข้อมูลสังกัดของคุณ จึงดูปฏิทินการลาของทีมไม่ได้");
            var isDivisionHead = string.Equals(widestScope, "DIVISION", StringComparison.OrdinalIgnoreCase)
                || await _context.Divisions.AnyAsync(d => d.Id == myAssign.DivisionId && d.HeadEmployeeId == me, cancellationToken);
            if (isDivisionHead)
            {
                scope = "DIVISION";
                scopeDiv = myAssign.DivisionId;
                // หัวหน้าฝ่ายกรองเฉพาะแผนกในฝ่ายตัวเองได้
                if (departmentId.HasValue && await _context.Departments.AnyAsync(d => d.Id == departmentId && d.DivisionId == myAssign.DivisionId, cancellationToken))
                    scopeDept = departmentId;
            }
            else
            {
                // ขอบเขต SELF/TEAM ยังเห็นทั้งแผนก (ไม่แสดงเหตุผลการลา)
                scope = "DEPARTMENT";
                scopeDept = myAssign.DepartmentId;
            }
        }

        var fromUtc = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue).AddHours(-7), DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to.AddDays(1).ToDateTime(TimeOnly.MinValue).AddHours(-7), DateTimeKind.Utc);
        var statuses = includePending ? new[] { "APPROVED", "PENDING" } : new[] { "APPROVED" };

        var raw = await _context.LeaveRequests.AsNoTracking()
            .Where(r => statuses.Contains(r.Status) && r.StartDatetime < toUtc && r.EndDatetime >= fromUtc)
            .Select(r => new
            {
                r.Id, r.EmployeeId, r.LeaveTypeId, r.StartDatetime, r.EndDatetime, r.LeaveDays, r.Status,
                Code = r.Employee!.EmployeeCode, r.Employee.Prefix, r.Employee.FirstName, r.Employee.LastName,
                TypeName = r.LeaveType!.LeaveName, r.LeaveType.FormCategory
            })
            .ToListAsync(cancellationToken);

        var assignments = await AssignmentsAsync(raw.Select(r => r.EmployeeId).Distinct().ToList(), cancellationToken);

        var items = new List<LeaveCalendarItem>();
        foreach (var r in raw)
        {
            assignments.TryGetValue(r.EmployeeId, out var a);
            if (scopeDept.HasValue && a?.DepartmentId != scopeDept) continue;
            if (scopeDiv.HasValue && a?.DivisionId != scopeDiv) continue;
            items.Add(new LeaveCalendarItem
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeCode = r.Code,
                EmployeeName = $"{r.Prefix} {r.FirstName} {r.LastName}".Trim(),
                DepartmentId = a?.DepartmentId,
                DepartmentName = a?.DepartmentName,
                LeaveTypeId = r.LeaveTypeId,
                LeaveTypeName = r.TypeName,
                FormCategory = r.FormCategory,
                StartDate = ToThaiDate(r.StartDatetime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                EndDate = ToThaiDate(r.EndDatetime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                LeaveDays = r.LeaveDays,
                Status = r.Status
            });
        }

        return new LeaveCalendarResult
        {
            Scope = scope,
            Items = items.OrderBy(i => i.StartDate).ThenBy(i => i.EmployeeName).ToList()
        };
    }

    public async Task<LeaveSummaryReport> GetSummaryReportAsync(int year, long? departmentId, CancellationToken cancellationToken = default)
    {
        bool isSuper = _currentUser.HasRole("ADMIN") || _currentUser.HasRole("SYSTEM_SUPER");
        if (!isSuper && !_currentUser.HasPermission("REPORT_LEAVE_VIEW"))
            throw new ForbiddenException("คุณไม่มีสิทธิ์ดูรายงานสรุปการลา");

        departmentId = await _dataScope.ResolveDepartmentFilterAsync(departmentId, "REPORT_LEAVE_VIEW", cancellationToken);
        if (year > 2400) year -= 543; // รับปี พ.ศ.

        var fromUtc = DateTime.SpecifyKind(new DateTime(year, 1, 1).AddHours(-7), DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(new DateTime(year + 1, 1, 1).AddHours(-7), DateTimeKind.Utc);

        var raw = await _context.LeaveRequests.AsNoTracking()
            .Where(r => (r.Status == "APPROVED" || r.Status == "PENDING") && r.StartDatetime >= fromUtc && r.StartDatetime < toUtc)
            .Select(r => new
            {
                r.EmployeeId, r.LeaveTypeId, r.StartDatetime, r.LeaveDays, r.Status,
                Code = r.Employee!.EmployeeCode, r.Employee.Prefix, r.Employee.FirstName, r.Employee.LastName,
                TypeName = r.LeaveType!.LeaveName
            })
            .ToListAsync(cancellationToken);

        var assignments = await AssignmentsAsync(raw.Select(r => r.EmployeeId).Distinct().ToList(), cancellationToken);
        var rows = raw
            .Select(r => new
            {
                r.EmployeeId, r.LeaveTypeId, r.TypeName, r.LeaveDays, r.Status, r.Code,
                Name = $"{r.Prefix} {r.FirstName} {r.LastName}".Trim(),
                Month = ToThaiDate(r.StartDatetime).Month,
                Dept = assignments.TryGetValue(r.EmployeeId, out var a) ? a : null
            })
            .Where(r => !departmentId.HasValue || r.Dept?.DepartmentId == departmentId)
            .ToList();

        var approved = rows.Where(r => r.Status == "APPROVED").ToList();

        var report = new LeaveSummaryReport
        {
            Year = year,
            TotalDays = approved.Sum(r => r.LeaveDays),
            TotalRequests = approved.Count,
            EmployeesOnLeave = approved.Select(r => r.EmployeeId).Distinct().Count(),
            PendingRequests = rows.Count(r => r.Status == "PENDING"),
            ByType = approved.GroupBy(r => (r.LeaveTypeId, r.TypeName))
                .Select(g => new LeaveReportRow
                {
                    Key = g.Key.LeaveTypeId.ToString(), Label = g.Key.TypeName,
                    Days = g.Sum(x => x.LeaveDays), Requests = g.Count(), Employees = g.Select(x => x.EmployeeId).Distinct().Count()
                })
                .OrderByDescending(x => x.Days).ToList(),
            ByDepartment = approved.GroupBy(r => r.Dept?.DepartmentName ?? "ไม่ระบุแผนก")
                .Select(g => new LeaveReportRow
                {
                    Key = g.Key, Label = g.Key,
                    Days = g.Sum(x => x.LeaveDays), Requests = g.Count(), Employees = g.Select(x => x.EmployeeId).Distinct().Count()
                })
                .OrderByDescending(x => x.Days).ToList(),
            ByMonth = Enumerable.Range(1, 12).Select(m =>
            {
                var inMonth = approved.Where(r => r.Month == m).ToList();
                return new LeaveReportRow
                {
                    Key = m.ToString(), Label = MonthNames[m - 1],
                    Days = inMonth.Sum(x => x.LeaveDays), Requests = inMonth.Count, Employees = inMonth.Select(x => x.EmployeeId).Distinct().Count()
                };
            }).ToList(),
            DepartmentByType = approved.GroupBy(r => (Dept: r.Dept?.DepartmentName ?? "ไม่ระบุแผนก", r.TypeName))
                .Select(g => new LeaveReportCell { DepartmentName = g.Key.Dept, LeaveTypeName = g.Key.TypeName, Days = g.Sum(x => x.LeaveDays) })
                .ToList(),
            TopEmployees = approved.GroupBy(r => r.EmployeeId)
                .Select(g => new LeaveReportTopEmployee
                {
                    EmployeeId = g.Key, EmployeeCode = g.First().Code, EmployeeName = g.First().Name,
                    DepartmentName = g.First().Dept?.DepartmentName,
                    Days = g.Sum(x => x.LeaveDays), Requests = g.Count()
                })
                .OrderByDescending(x => x.Days).ThenByDescending(x => x.Requests).Take(10).ToList()
        };
        return report;
    }

    public string BuildSummaryCsv(LeaveSummaryReport report)
    {
        var sb = new System.Text.StringBuilder();
        string Esc(string? s) => "\"" + (s ?? string.Empty).Replace("\"", "\"\"") + "\"";
        sb.AppendLine($"{Esc($"สรุปรายงานการลา ปี {report.Year + 543}")}");
        sb.AppendLine($"{Esc("จำนวนวันลารวม (อนุมัติแล้ว)")},{report.TotalDays}");
        sb.AppendLine($"{Esc("จำนวนใบลา")},{report.TotalRequests}");
        sb.AppendLine($"{Esc("จำนวนพนักงานที่ลา")},{report.EmployeesOnLeave}");
        sb.AppendLine();
        sb.AppendLine("แยกตามประเภทการลา");
        sb.AppendLine("ประเภท,จำนวนวัน,จำนวนใบลา,จำนวนพนักงาน");
        foreach (var r in report.ByType) sb.AppendLine($"{Esc(r.Label)},{r.Days},{r.Requests},{r.Employees}");
        sb.AppendLine();
        sb.AppendLine("แยกตามแผนก");
        sb.AppendLine("แผนก,จำนวนวัน,จำนวนใบลา,จำนวนพนักงาน");
        foreach (var r in report.ByDepartment) sb.AppendLine($"{Esc(r.Label)},{r.Days},{r.Requests},{r.Employees}");
        sb.AppendLine();
        sb.AppendLine("แยกตามเดือน");
        sb.AppendLine("เดือน,จำนวนวัน,จำนวนใบลา,จำนวนพนักงาน");
        foreach (var r in report.ByMonth) sb.AppendLine($"{Esc(r.Label)},{r.Days},{r.Requests},{r.Employees}");
        sb.AppendLine();
        sb.AppendLine("แผนก x ประเภทการลา (วัน)");
        sb.AppendLine("แผนก,ประเภท,จำนวนวัน");
        foreach (var c in report.DepartmentByType) sb.AppendLine($"{Esc(c.DepartmentName)},{Esc(c.LeaveTypeName)},{c.Days}");
        sb.AppendLine();
        sb.AppendLine("พนักงานที่ลามากที่สุด");
        sb.AppendLine("รหัสพนักงาน,ชื่อ,แผนก,จำนวนวัน,จำนวนใบลา");
        foreach (var t in report.TopEmployees) sb.AppendLine($"{Esc(t.EmployeeCode)},{Esc(t.EmployeeName)},{Esc(t.DepartmentName)},{t.Days},{t.Requests}");
        return sb.ToString();
    }

    // ───────────────────────── helpers ─────────────────────────

    private static DateOnly ToThaiDate(DateTime utc) => DateOnly.FromDateTime(utc.AddHours(7));

    private sealed record AssignmentInfo(long? DepartmentId, string? DepartmentName, long? DivisionId);

    private async Task<Dictionary<long, AssignmentInfo>> AssignmentsAsync(List<long> employeeIds, CancellationToken cancellationToken)
    {
        if (employeeIds.Count == 0) return new();
        var list = await _context.EmployeeAssignments.AsNoTracking()
            .Where(a => a.IsCurrent && employeeIds.Contains(a.EmployeeId))
            .Select(a => new { a.EmployeeId, a.EffectiveFrom, a.DepartmentId, DepartmentName = a.Department != null ? a.Department.DepartmentName : null, a.DivisionId })
            .ToListAsync(cancellationToken);
        return list.GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g =>
            {
                var a = g.OrderByDescending(x => x.EffectiveFrom).First();
                return new AssignmentInfo(a.DepartmentId, a.DepartmentName, a.DivisionId);
            });
    }

    private async Task<AssignmentInfo?> CurrentAssignmentAsync(long employeeId, CancellationToken cancellationToken) =>
        (await AssignmentsAsync(new List<long> { employeeId }, cancellationToken)).GetValueOrDefault(employeeId);
}
