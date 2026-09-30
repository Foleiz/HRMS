using System.Globalization;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

/// <summary>
/// ตัวตรวจกฎการลา (จุดเดียวฝั่ง server) — ใช้ตอนยื่นจริง และให้หน้าฟอร์มเรียกตรวจล่วงหน้า (dry-run)
/// ตรวจ: ลาซ้อน, สิทธิ์ตามกลุ่มพนักงาน, ทดลองงาน, อายุงาน, ยื่นล่วงหน้า/ย้อนหลัง,
///       สูงสุดต่อครั้ง/ต่อปี/ตลอดอายุงาน, เอกสารแนบ (โควตาตรวจแยกใน EnsureQuotaAvailableAsync)
/// </summary>
public partial class LeaveRequestService
{
    private static readonly string[] ActiveRequestStatuses = { "PENDING", "APPROVED" };

    private static string ThaiDate(DateOnly d) =>
        $"{d.Day:D2}/{d.Month:D2}/{d.Year + 543}";

    private static string Days(decimal d) => d.ToString("0.##", CultureInfo.InvariantCulture);

    public async Task<LeaveValidationResultDto> ValidateLeaveRequestAsync(
        long employeeId,
        long leaveTypeId,
        DateTime startDatetime,
        DateTime endDatetime,
        decimal requestedDays,
        bool hasAttachment,
        long? excludeRequestId,
        CancellationToken cancellationToken = default)
    {
        var result = new LeaveValidationResultDto();

        // 0) จำนวนวันลา (วันทำงานเท่านั้น)
        LeaveDaysCalculationDto calc;
        try
        {
            calc = await ResolveLeaveDaysAsync(startDatetime, endDatetime, requestedDays, allowZero: false, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            result.Errors.Add(ex.Message);
            return result;
        }
        result.LeaveDays = calc.LeaveDays;

        var startDate = ToThaiDate(startDatetime);
        var endDate = ToThaiDate(endDatetime);
        var today = LeavePolicyRules.ThaiToday();

        // คำขอที่ยังมีผลของพนักงาน (รออนุมัติ / อนุมัติแล้ว) ไม่นับใบที่กำลังแก้ไข
        var activeRequests = await _context.LeaveRequests.AsNoTracking()
            .Where(r => r.EmployeeId == employeeId
                        && ActiveRequestStatuses.Contains(r.Status)
                        && (excludeRequestId == null || r.Id != excludeRequestId))
            .Select(r => new { r.RequestNo, r.LeaveTypeId, r.StartDatetime, r.EndDatetime })
            .ToListAsync(cancellationToken);

        // 1) ลาซ้อนวันกับคำขอเดิม
        foreach (var r in activeRequests)
        {
            var rs = ToThaiDate(r.StartDatetime);
            var re = ToThaiDate(r.EndDatetime);
            if (rs <= endDate && re >= startDate)
                result.Errors.Add($"ช่วงวันที่ซ้อนกับคำขอลาเลขที่ {r.RequestNo} ({ThaiDate(rs)} – {ThaiDate(re)})");
        }

        // 2) นโยบายที่ใช้กับพนักงาน
        var policies = await _context.LeavePolicies.AsNoTracking()
            .Where(p => p.LeaveTypeId == leaveTypeId)
            .ToListAsync(cancellationToken);
        if (policies.Count == 0) return result; // ประเภทที่ไม่ได้กำหนดนโยบาย = ไม่จำกัดเงื่อนไข

        var group = await LeaveEmployeeGroups.ResolveAsync(_context, employeeId, startDate, cancellationToken);
        var policy = LeavePolicyRules.SelectPolicy(policies, group.EmployeeTypeId, group.EmployeeLevelId, startDate);
        if (policy == null)
        {
            result.Errors.Add("ประเภทการลานี้ไม่ได้กำหนดสิทธิ์ให้กับกลุ่มพนักงานของคุณ (ประเภท/ระดับพนักงาน) กรุณาติดต่อฝ่ายบุคคล");
            return result;
        }
        result.PolicySummary = DescribePolicy(policy);

        // 3) ทดลองงาน / อายุงาน (จากสัญญาจ้าง)
        var contracts = await _context.EmploymentContracts.AsNoTracking()
            .Where(c => c.EmployeeId == employeeId)
            .Select(c => new { c.StartDate, c.ProbationEndDate, c.ProbationPassedDate, c.Status })
            .ToListAsync(cancellationToken);
        if (contracts.Count > 0)
        {
            var current = contracts
                .Where(c => c.Status != "CANCELLED" && c.Status != "TERMINATED")
                .OrderByDescending(c => c.StartDate)
                .FirstOrDefault() ?? contracts.OrderByDescending(c => c.StartDate).First();

            if (!policy.IsAllowedDuringProbation
                && current.ProbationEndDate.HasValue
                && current.ProbationPassedDate == null
                && startDate <= current.ProbationEndDate.Value)
            {
                result.Errors.Add($"อยู่ระหว่างทดลองงาน (ถึง {ThaiDate(current.ProbationEndDate.Value)}) ยังใช้สิทธิ์ลาประเภทนี้ไม่ได้");
            }

            if (policy.MinimumServiceDays > 0)
            {
                var hireDate = contracts.Min(c => c.StartDate);
                var eligibleFrom = hireDate.AddDays(policy.MinimumServiceDays);
                if (startDate < eligibleFrom)
                    result.Errors.Add($"ต้องมีอายุงานครบ {policy.MinimumServiceDays} วันก่อน (ใช้สิทธิ์ได้ตั้งแต่ {ThaiDate(eligibleFrom)})");
            }
        }

        // 4) ยื่นล่วงหน้า / ย้อนหลัง
        if (startDate >= today)
        {
            var noticeDays = startDate.DayNumber - today.DayNumber;
            if (noticeDays < policy.AdvanceRequestDays)
                result.Errors.Add($"ต้องยื่นล่วงหน้าอย่างน้อย {policy.AdvanceRequestDays} วัน (ลาได้ตั้งแต่วันที่ {ThaiDate(today.AddDays(policy.AdvanceRequestDays))})");
        }
        else if (policy.MaxBackdateDays.HasValue)
        {
            var backDays = today.DayNumber - startDate.DayNumber;
            if (policy.MaxBackdateDays.Value == 0)
                result.Errors.Add("ประเภทการลานี้ไม่อนุญาตให้ยื่นย้อนหลัง");
            else if (backDays > policy.MaxBackdateDays.Value)
                result.Errors.Add($"ยื่นลาย้อนหลังได้ไม่เกิน {policy.MaxBackdateDays.Value} วัน");
        }

        // 5) จำนวนวันสูงสุดต่อครั้ง
        if (policy.MaxDaysPerOccurrence.HasValue && calc.LeaveDays > policy.MaxDaysPerOccurrence.Value)
            result.Errors.Add($"ลาได้สูงสุดครั้งละ {Days(policy.MaxDaysPerOccurrence.Value)} วัน (คำขอนี้ {Days(calc.LeaveDays)} วัน)");

        // 6) จำนวนครั้งต่อปี / ตลอดอายุงาน (นับคำขอที่รออนุมัติและอนุมัติแล้ว)
        var sameType = activeRequests.Where(r => r.LeaveTypeId == leaveTypeId).ToList();
        if (policy.MaxOccurrencesPerYear.HasValue)
        {
            var thisYear = sameType.Count(r => ToThaiDate(r.StartDatetime).Year == startDate.Year);
            if (thisYear + 1 > policy.MaxOccurrencesPerYear.Value)
                result.Errors.Add($"ลาประเภทนี้ได้ไม่เกิน {policy.MaxOccurrencesPerYear.Value} ครั้งต่อปี (ปีนี้ใช้ไปแล้ว {thisYear} ครั้ง)");
        }
        if (policy.MaxLifetimeOccurrences.HasValue && sameType.Count + 1 > policy.MaxLifetimeOccurrences.Value)
            result.Errors.Add($"ลาประเภทนี้ได้ไม่เกิน {policy.MaxLifetimeOccurrences.Value} ครั้งตลอดอายุงาน");

        // 7) เอกสารแนบ
        var docAfter = policy.DocumentRequiredAfterDays ?? 0m;
        result.RequiresDocument = policy.IsDocumentRequired && (docAfter <= 0 || calc.LeaveDays >= docAfter);
        if (result.RequiresDocument && !hasAttachment)
        {
            result.Errors.Add(docAfter > 0
                ? $"ลาตั้งแต่ {Days(docAfter)} วันขึ้นไป ต้องแนบเอกสารประกอบ (เช่น ใบรับรองแพทย์)"
                : "ประเภทการลานี้ต้องแนบเอกสารประกอบทุกครั้ง");
        }

        return result;
    }

    /// <summary>ตรวจกฎก่อนยื่นจริง — ไม่ผ่านจะแจ้งทุกข้อพร้อมกัน</summary>
    private async Task EnsureLeaveRulesAsync(
        long employeeId, long leaveTypeId, DateTime start, DateTime end, decimal requestedDays,
        bool hasAttachment, long? excludeRequestId, CancellationToken cancellationToken)
    {
        var validation = await ValidateLeaveRequestAsync(
            employeeId, leaveTypeId, start, end, requestedDays, hasAttachment, excludeRequestId, cancellationToken);
        if (!validation.IsValid)
            throw new InvalidOperationException(string.Join("\n", validation.Errors));
    }

    /// <summary>สรุปนโยบายเป็นประโยคอ่านง่าย</summary>
    private static string DescribePolicy(LeavePolicy p)
    {
        var parts = new List<string> { $"สิทธิ์ {Days(p.EntitlementDays)} วัน/ปี" };
        if (p.MinimumServiceDays > 0) parts.Add($"อายุงานครบ {p.MinimumServiceDays} วัน");
        if (!p.IsAllowedDuringProbation) parts.Add("ไม่ใช้สิทธิ์ระหว่างทดลองงาน");
        parts.Add(p.AdvanceRequestDays > 0 ? $"ยื่นล่วงหน้า {p.AdvanceRequestDays} วัน" : "ยื่นวันเดียวกันได้");
        if (p.MaxBackdateDays.HasValue)
            parts.Add(p.MaxBackdateDays.Value == 0 ? "ห้ามยื่นย้อนหลัง" : $"ยื่นย้อนหลังได้ {p.MaxBackdateDays.Value} วัน");
        if (p.MaxDaysPerOccurrence.HasValue) parts.Add($"ครั้งละไม่เกิน {Days(p.MaxDaysPerOccurrence.Value)} วัน");
        if (p.MaxOccurrencesPerYear.HasValue) parts.Add($"ไม่เกิน {p.MaxOccurrencesPerYear.Value} ครั้ง/ปี");
        if (p.MaxLifetimeOccurrences.HasValue) parts.Add($"ไม่เกิน {p.MaxLifetimeOccurrences.Value} ครั้งตลอดอายุงาน");
        if (p.IsDocumentRequired)
            parts.Add(p.DocumentRequiredAfterDays is > 0 ? $"แนบเอกสารเมื่อลา {Days(p.DocumentRequiredAfterDays.Value)} วันขึ้นไป" : "แนบเอกสารทุกครั้ง");
        return string.Join(" · ", parts);
    }
}
