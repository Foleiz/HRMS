using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Payroll.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Payroll.Services;

public class MySalaryService : IMySalaryService
{
    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAesEncryptionService _encryptionService;

    public MySalaryService(
        IHrmsDbContext context,
        ICurrentUserService currentUserService,
        IAesEncryptionService encryptionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _encryptionService = encryptionService;
    }

    public async Task<MySalaryOverviewDto> GetMySalaryOverviewAsync(int? year, CancellationToken cancellationToken = default)
    {
        long? currentEmpId = _currentUserService.EmployeeId;
        if (!currentEmpId.HasValue)
        {
            throw new NotFoundException("ไม่พบข้อมูลพนักงานที่ผูกกับบัญชีนี้");
        }
        long employeeId = currentEmpId.Value;

        int selectedYear = year ?? DateTime.Today.Year;
        if (selectedYear > 2400)
        {
            selectedYear -= 543;
        }

        // 1. Fetch employee's primary bank account
        var bankAccount = await _context.EmployeeBankAccounts
            .Include(b => b.Bank)
            .Where(b => b.EmployeeId == employeeId && b.IsPrimary && b.Status == "ACTIVE")
            .FirstOrDefaultAsync(cancellationToken);

        // ไม่มีบัญชี = แสดง "-"
        string bankName = bankAccount?.Bank?.BankName ?? "-";
        string maskedAccount = bankAccount != null ? PayslipHelper.MaskAccountNumber(bankAccount.AccountNumber) : "-";

        // คำใบ้รหัส PDF — กติกาเดียวกับตัวสร้างสลิป
        var empForHint = await _context.Employees
            .AsNoTracking()
            .Where(e => e.Id == employeeId)
            .Select(e => new { e.CitizenId, e.BirthDate, e.EmployeeCode })
            .FirstOrDefaultAsync(cancellationToken);
        var overviewHint = PayslipHelper.ResolvePassword(
            empForHint?.CitizenId, empForHint?.BirthDate, empForHint?.EmployeeCode, _encryptionService).Hint;

        // 2. Fetch all payroll records for this employee (กรองเฉพาะงวดที่อนุมัติแล้วขึ้นไป)
        var payrollQuery = _context.Payrolls
            .Include(p => p.Period)
            .Where(p => p.EmployeeId == employeeId &&
                        p.Status != "DRAFT" && // DRAFT = ไม่ได้คำนวณ (เช่น ไม่มีฐานเงินเดือน) → ไม่มีสลิป
                        p.Period != null &&
                        PayslipHelper.AllowedPeriodStatuses.Contains(p.Period.Status));

        var allPayrolls = await payrollQuery
            .OrderByDescending(p => p.Period!.Year)
            .ThenByDescending(p => p.Period!.Month)
            .ToListAsync(cancellationToken);

        var latestPayroll = allPayrolls.FirstOrDefault();
        var currentYearPayrolls = allPayrolls.Where(p => p.Period != null && p.Period.Year == selectedYear).ToList();

        // 3. Calculate Summary Cards
        decimal latestNetPay = latestPayroll?.NetPayableSalary ?? 0m;
        decimal latestGross = latestPayroll?.TotalGrossIncome ?? 0m;
        decimal latestDeductions = latestPayroll?.TotalDeductionAmount ?? 0m;

        decimal ytdGross = currentYearPayrolls.Sum(p => p.TotalGrossIncome);
        int thaiYear = selectedYear + 543;
        string ytdRange = currentYearPayrolls.Any()
            ? $"ม.ค. - {GetThaiShortMonth(currentYearPayrolls.Max(p => p.Period!.Month))} {thaiYear} * ใช้ยื่นภาษีปลายปี"
            : $"ปี {thaiYear} * ใช้ยื่นภาษีปลายปี";

        // 4. Detailed line items of latest payroll for subtexts and chart
        List<MySalaryLineItemDto> latestItems = new();
        if (latestPayroll != null)
        {
            var details = await _context.PayrollDetails
                .Include(d => d.PayrollItem)
                .Where(d => d.PayrollId == latestPayroll.Id)
                .ToListAsync(cancellationToken);

            latestItems = details.Select(d => new MySalaryLineItemDto
            {
                ItemName = d.PayrollItem?.ItemName ?? "รายการเงินเดือน",
                ItemCode = d.PayrollItem?.ItemCode ?? string.Empty,
                ItemType = d.PayrollItem?.ItemType ?? "EARNING",
                Amount = d.Amount,
                SubDescription = d.PayrollItem?.Description
            }).ToList();
        }

        string grossSubtext = latestItems.Where(i => i.ItemType == "EARNING").Any()
            ? string.Join(" + ", latestItems.Where(i => i.ItemType == "EARNING").Select(i => i.ItemName))
            : "เงินเดือนพื้นฐาน + ค่าตอบแทน";

        string deductionSubtext = latestItems.Where(i => i.ItemType == "DEDUCTION").Any()
            ? string.Join(" ", latestItems.Where(i => i.ItemType == "DEDUCTION").Select(i => i.ItemName))
            : "ภาษี ประกันสังคม";

        // 5. History table (up to 12 months)
        var history = allPayrolls.Take(12).Select(p =>
        {
            int pYear = p.Period?.Year ?? selectedYear;
            int pMonth = p.Period?.Month ?? 1;
            DateTime? payDate = p.Period?.PaymentDate?.ToDateTime(TimeOnly.MinValue);

            return new MySalarySlipItemDto
            {
                PayrollId = p.Id,
                PeriodId = p.PeriodId,
                Year = pYear,
                Month = pMonth,
                PeriodMonthName = GetThaiMonthName(pMonth, pYear),
                TotalGrossIncome = p.TotalGrossIncome,
                TotalDeductions = p.TotalDeductionAmount,
                NetPayableSalary = p.NetPayableSalary,
                PaymentDate = payDate,
                PaymentDateThai = payDate.HasValue ? FormatThaiDate(payDate.Value) : "-",
                Status = PaymentStatusText(p)
            };
        }).ToList();

        // 6. Chart Data
        decimal baseSalary = latestItems.FirstOrDefault(i => i.ItemName.Contains("พื้นฐาน") || i.ItemName.Contains("เงินเดือน"))?.Amount ?? latestGross;
        decimal otAmount = latestItems.Where(i => i.ItemName.Contains("OT") || i.ItemName.Contains("ล่วงเวลา")).Sum(i => i.Amount);
        decimal bonusAmount = latestItems.Where(i => i.ItemName.Contains("โบนัส")).Sum(i => i.Amount);
        decimal allowanceAmount = latestGross - baseSalary - otAmount - bonusAmount;
        if (allowanceAmount < 0) allowanceAmount = 0;

        var trends = allPayrolls.Take(6).Reverse().Select(p => new MonthlySalaryTrendDto
        {
            MonthLabel = GetThaiShortMonth(p.Period?.Month ?? 1),
            GrossIncome = p.TotalGrossIncome,
            Deductions = p.TotalDeductionAmount,
            NetPay = p.NetPayableSalary
        }).ToList();

        return new MySalaryOverviewDto
        {
            LatestNetPay = latestNetPay,
            LatestGrossIncome = latestGross,
            LatestTotalDeductions = latestDeductions,
            YtdTotalGross = ytdGross > 0 ? ytdGross : latestGross,
            YtdPeriodRange = ytdRange,
            GrossSubtext = grossSubtext,
            DeductionSubtext = deductionSubtext,
            BankAccountMasked = maskedAccount,
            BankName = bankName,
            PasswordHint = overviewHint,
            History = history,
            ChartData = new MySalaryChartDataDto
            {
                BaseSalaryAmount = baseSalary,
                OvertimeAmount = otAmount,
                AllowanceAmount = allowanceAmount,
                BonusAmount = bonusAmount,
                DeductionsAmount = latestDeductions,
                MonthlyTrends = trends
            }
        };
    }

    public async Task<MySalaryDetailDto> GetMySalaryDetailAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        long? currentEmpId = _currentUserService.EmployeeId;
        if (!currentEmpId.HasValue)
        {
            throw new NotFoundException("ไม่พบข้อมูลพนักงานที่ผูกกับบัญชีนี้");
        }
        long employeeId = currentEmpId.Value;

        var payroll = await _context.Payrolls
            .Include(p => p.Period)
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken);

        if (payroll == null || payroll.Period == null || payroll.Status == "DRAFT" || !PayslipHelper.AllowedPeriodStatuses.Contains(payroll.Period.Status))
        {
            throw new NotFoundException("Payroll", payrollId);
        }

        // Data Scoping: employee can only view their own payroll unless HR/Admin
        if (payroll.EmployeeId != employeeId &&
            !_currentUserService.HasRole("ADMIN") &&
            !_currentUserService.HasRole("HR") &&
            !_currentUserService.HasPermission("PAYROLL_VIEW"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์เข้าถึงสลิปเงินเดือนของพนักงานท่านอื่น");
        }

        // Fetch bank account
        var bankAccount = await _context.EmployeeBankAccounts
            .Include(b => b.Bank)
            .Where(b => b.EmployeeId == payroll.EmployeeId && b.IsPrimary && b.Status == "ACTIVE")
            .FirstOrDefaultAsync(cancellationToken);

        string bankName = bankAccount?.Bank?.BankName ?? "-";
        string maskedAccount = bankAccount != null ? PayslipHelper.MaskAccountNumber(bankAccount.AccountNumber) : "-";

        int pYear = payroll.Period.Year;
        int pMonth = payroll.Period.Month;
        DateTime? payDate = payroll.Period.PaymentDate?.ToDateTime(TimeOnly.MinValue);

        // Fetch details with ordering matching PDF (B8)
        var details = await _context.PayrollDetails
            .Include(d => d.PayrollItem)
            .Where(d => d.PayrollId == payrollId)
            .ToListAsync(cancellationToken);

        var earnings = details
            .Where(d => d.PayrollItem?.ItemType == "EARNING" ||
                        d.PayrollItem?.ItemType == "ALLOWANCE" ||
                        d.PayrollItem?.ItemType == "OVERTIME" ||
                        d.PayrollItem?.ItemType == "BONUS")
            .OrderBy(d => PayslipHelper.EarningOrder(d.PayrollItem?.ItemCode))
            .ThenBy(d => d.Id)
            .Select(d => new MySalaryLineItemDto
            {
                ItemName = d.PayrollItem?.ItemName ?? "รายได้",
                ItemCode = d.PayrollItem?.ItemCode ?? string.Empty,
                ItemType = "EARNING",
                Amount = d.Amount,
                SubDescription = d.PayrollItem?.Description
            }).ToList();

        var deductions = details
            .Where(d => d.PayrollItem?.ItemType == "DEDUCTION" ||
                        d.PayrollItem?.ItemType == "TAX" ||
                        d.PayrollItem?.ItemType == "SSO" ||
                        d.PayrollItem?.ItemType == "LEAVE_DEDUCTION")
            .OrderBy(d => PayslipHelper.DeductionOrder(d.PayrollItem?.ItemCode))
            .ThenBy(d => d.Id)
            .Select(d => new MySalaryLineItemDto
            {
                ItemName = d.PayrollItem?.ItemName ?? "รายหัก",
                ItemCode = d.PayrollItem?.ItemCode ?? string.Empty,
                ItemType = "DEDUCTION",
                Amount = d.Amount,
                SubDescription = d.PayrollItem?.Description
            }).ToList();

        // Calculate YTD totals from approved periods of same year and month <= current period (B6)
        var ytdPayrolls = await _context.Payrolls
            .AsNoTracking()
            .Include(p => p.Period)
            .Include(p => p.Details)
                .ThenInclude(d => d.PayrollItem)
            .Where(p => p.EmployeeId == payroll.EmployeeId &&
                        p.Period != null &&
                        p.Period.Year == pYear &&
                        p.Period.Month <= pMonth &&
                        p.Status != "DRAFT" &&
                        PayslipHelper.AllowedPeriodStatuses.Contains(p.Period.Status))
            .ToListAsync(cancellationToken);

        decimal ytdGross = ytdPayrolls.Sum(p => p.TotalGrossIncome);
        decimal ytdTax = ytdPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && d.PayrollItem.ItemCode == "DED_TAX")
            .Sum(d => d.Amount);
        decimal ytdSso = ytdPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && d.PayrollItem.ItemCode == "DED_SSO")
            .Sum(d => d.Amount);

        // Derive password hint (A3)
        var passwordInfo = PayslipHelper.ResolvePassword(
            payroll.Employee?.CitizenId,
            payroll.Employee?.BirthDate,
            payroll.Employee?.EmployeeCode,
            _encryptionService);

        // Payment status & transfer status (B7)
        string statusText = PaymentStatusText(payroll);

        return new MySalaryDetailDto
        {
            PayrollId = payroll.Id,
            PeriodId = payroll.PeriodId,
            PeriodMonthName = GetThaiMonthName(pMonth, pYear),
            EmployeeCode = payroll.Employee?.EmployeeCode ?? "-",
            EmployeeName = payroll.SnapshotEmployeeName ?? $"{payroll.Employee?.FirstName} {payroll.Employee?.LastName}".Trim(),
            DepartmentName = payroll.SnapshotDepartmentName ?? "-",
            PositionName = payroll.SnapshotPositionName ?? "-",
            BankName = bankName,
            BankAccountMasked = maskedAccount,
            PaymentDateThai = payDate.HasValue ? FormatThaiDate(payDate.Value) : "-",
            PaymentStatus = payroll.PaymentStatus ?? string.Empty,
            Status = statusText,
            PasswordHint = passwordInfo.Hint,
            TotalGrossIncome = payroll.TotalGrossIncome,
            TotalDeductions = payroll.TotalDeductionAmount,
            NetPayableSalary = payroll.NetPayableSalary,
            YtdGross = ytdGross,
            YtdTax = ytdTax,
            YtdSso = ytdSso,
            Earnings = earnings,
            Deductions = deductions
        };
    }

    private static string GetThaiMonthName(int month, int year)
    {
        string[] months = { "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม" };
        int thaiYear = year < 2400 ? year + 543 : year;
        string mName = month >= 1 && month <= 12 ? months[month] : month.ToString();
        return $"{mName} {thaiYear}";
    }

    private static string GetThaiShortMonth(int month)
    {
        string[] shortMonths = { "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };
        return month >= 1 && month <= 12 ? shortMonths[month] : month.ToString();
    }

    private static string FormatThaiDate(DateTime date)
    {
        int thaiYear = date.Year < 2400 ? date.Year + 543 : date.Year;
        return $"{date.Day} {GetThaiShortMonth(date.Month)} {thaiYear}";
    }

    /// <summary>
    /// สถานะการโอนของสลิป — คนที่ไม่มียอดสุทธิ = "ไม่มียอดโอน" (เดิมขึ้น "โอนแล้ว" ตามสถานะงวด)
    /// </summary>
    private static string PaymentStatusText(Domain.Entities.Payroll p)
    {
        if (p.NetPayableSalary <= 0) return "ไม่มียอดโอน";
        // ข้อมูลเก่าก่อนมี PaymentStatus: งวดที่ PAID/CLOSED ถือว่าโอนครบทุกคนที่มียอด
        bool transferred = p.PaymentStatus == "TRANSFERRED"
            || p.Period?.Status == "PAID" || p.Period?.Status == "CLOSED";
        return transferred ? "โอนแล้ว" : "รอโอน";
    }
}
