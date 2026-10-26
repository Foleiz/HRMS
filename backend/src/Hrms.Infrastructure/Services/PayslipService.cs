using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Payroll.Services;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Hrms.Infrastructure.Services.PayslipPdf;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// Service สำหรับสร้างและดาวน์โหลดไฟล์สลิปเงินเดือน E-Payslip PDF พร้อมการเข้ารหัสความปลอดภัย (Password Protection)
/// </summary>
public class PayslipService : IPayslipService
{
    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAesEncryptionService _encryptionService;

    private static readonly string[] ThaiMonths =
    {
        "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    };

    public PayslipService(
        IHrmsDbContext context,
        ICurrentUserService currentUserService,
        IAesEncryptionService encryptionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _encryptionService = encryptionService;
    }

    /// <inheritdoc />
    public async Task<(byte[] FileBytes, string FileName)> GetMyPayslipPdfAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            throw new NotFoundException("ไม่พบข้อมูลพนักงานที่ผูกกับบัญชีนี้");
        }

        var payroll = await _context.Payrolls
            .AsNoTracking()
            .Include(p => p.Period)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken);

        if (payroll == null || payroll.Period == null || payroll.Status == "DRAFT" || !PayslipHelper.AllowedPeriodStatuses.Contains(payroll.Period.Status))
        {
            throw new NotFoundException($"ไม่พบข้อมูลสลิปเงินเดือนรหัส #{payrollId}");
        }

        if (payroll.EmployeeId != employeeId.Value && !_currentUserService.HasRole("ADMIN"))
        {
            throw new ForbiddenException("คุณไม่มีสิทธิ์ดาวน์โหลดสลิปเงินเดือนของพนักงานท่านอื่น");
        }

        return await GenerateOrRetrievePayslipPdfAsync(payrollId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<(byte[] FileBytes, string FileName)> GetPayslipPdfAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        return await GenerateOrRetrievePayslipPdfAsync(payrollId, cancellationToken);
    }

    public async Task FreezePeriodPayslipsAsync(long periodId, CancellationToken cancellationToken = default)
    {
        var payrollIds = await _context.Payrolls.AsNoTracking()
            .Where(p => p.PeriodId == periodId)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);
        var existing = await _context.Payslips.AsNoTracking()
            .Where(s => payrollIds.Contains(s.PayrollId) && s.PdfData != null)
            .Select(s => s.PayrollId)
            .ToListAsync(cancellationToken);
        foreach (var id in payrollIds.Except(existing))
            await GenerateOrRetrievePayslipPdfAsync(id, cancellationToken);
    }

    private async Task<(byte[] FileBytes, string FileName)> GenerateOrRetrievePayslipPdfAsync(long payrollId, CancellationToken cancellationToken)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Period)
            .Include(p => p.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Position)
            .Include(p => p.Employee)
                .ThenInclude(e => e!.Assignments)
                    .ThenInclude(a => a.Department)
            .Include(p => p.Employee)
                .ThenInclude(e => e!.BankAccounts)
                    .ThenInclude(b => b.Bank)
            .Include(p => p.Details)
                .ThenInclude(d => d.PayrollItem)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken);

        if (payroll == null)
        {
            throw new NotFoundException($"ไม่พบข้อมูลสลิปเงินเดือนรหัส #{payrollId}");
        }

        var emp = payroll.Employee;
        var period = payroll.Period;

        // รอบที่เลยขั้นตรวจสอบแล้ว (ยอดล็อก): ใช้สลิปที่เก็บไว้ ไม่สร้างใหม่ — บัญชีธนาคาร/ข้อมูลบริษัทในสลิปไม่เปลี่ยนตามข้อมูลปัจจุบัน
        bool periodLocked = period != null && period.Status != "DRAFT" && period.Status != "REVIEW";
        if (periodLocked)
        {
            var stored = await _context.Payslips.AsNoTracking()
                .Where(s => s.PayrollId == payrollId && s.PdfData != null)
                .Select(s => s.PdfData)
                .FirstOrDefaultAsync(cancellationToken);
            if (stored != null && stored.Length > 0)
                return (stored, $"Payslip_{period!.Year}_{period.Month:D2}_{emp?.EmployeeCode ?? "EMP"}.pdf");
        }
        var periodYear = period?.Year ?? DateTime.Now.Year;
        var periodMonth = period?.Month ?? DateTime.Now.Month;
        var monthName = (periodMonth >= 1 && periodMonth <= 12) ? ThaiMonths[periodMonth] : $"เดือนที่ {periodMonth}";
        var thaiYear = periodYear > 2400 ? periodYear : periodYear + 543;

        // 1. Password Determination (แยกกฎไว้ใน PayslipHelper เพื่อใช้ร่วมกันทั้งระบบ)
        var passwordInfo = PayslipHelper.ResolvePassword(emp?.CitizenId, emp?.BirthDate, emp?.EmployeeCode, _encryptionService);
        string password = passwordInfo.Password;
        string passwordHint = passwordInfo.Hint;

        // 2. Query Company Master
        var company = await _context.Companies.FirstOrDefaultAsync(cancellationToken);
        // ยังไม่ได้ตั้งข้อมูลบริษัท → ไม่ใส่ชื่อสมมติ (เดิมแสดงบริษัทตัวอย่าง)
        string companyName = string.IsNullOrWhiteSpace(company?.CompanyName) ? "(ยังไม่ได้ตั้งค่าข้อมูลบริษัท)" : company!.CompanyName;
        string companyAddress = company?.Address ?? string.Empty;
        string companyPhone = company?.Phone ?? string.Empty;

        // 3. Query YTD totals: งวดที่อนุมัติแล้วขึ้นไป + งวดของสลิปนี้เสมอ (HR พรีวิวรอบ REVIEW ยอดสะสมต้องรวมเดือนนี้)
        var yearPayrolls = await _context.Payrolls
            .AsNoTracking()
            .Include(p => p.Period)
            .Include(p => p.Details)
                .ThenInclude(d => d.PayrollItem)
            .Where(p => p.EmployeeId == payroll.EmployeeId &&
                        p.Period != null &&
                        p.Period.Year == periodYear &&
                        p.Period.Month <= periodMonth &&
                        (p.Id == payroll.Id ||
                         PayslipHelper.AllowedPeriodStatuses.Contains(p.Period.Status)))
            .ToListAsync(cancellationToken);

        decimal ytdGross = yearPayrolls.Sum(p => p.TotalGrossIncome);
        decimal ytdTax = yearPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemCode == "DED_TAX" || d.PayrollItem.ItemType == "TAX"))
            .Sum(d => d.Amount);
        decimal ytdSso = yearPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemCode == "DED_SSO" || d.PayrollItem.ItemType == "SSO"))
            .Sum(d => d.Amount);

        // 4. Employee metadata
        var primaryAssignment = emp?.Assignments.FirstOrDefault(a => a.IsCurrent) ?? emp?.Assignments.FirstOrDefault();
        string positionName = payroll.SnapshotPositionName ?? primaryAssignment?.Position?.PositionName ?? "-";
        string departmentName = payroll.SnapshotDepartmentName ?? primaryAssignment?.Department?.DepartmentName ?? "-";
        string empName = payroll.SnapshotEmployeeName ?? emp?.FullName ?? "พนักงาน";
        string empCode = emp?.EmployeeCode ?? "EMP";

        var primaryBank = emp?.BankAccounts.FirstOrDefault(b => b.IsPrimary && b.Status == "ACTIVE")
                          ?? emp?.BankAccounts.FirstOrDefault(b => b.Status == "ACTIVE");
        string bankText = "-";
        if (primaryBank != null)
        {
            string masked = PayslipHelper.MaskAccountNumber(primaryBank.AccountNumber);
            bankText = $"{primaryBank.Bank?.BankName ?? "ธนาคาร"} ({masked})";
        }

        string paymentDateText = "-";
        if (period?.PaymentDate.HasValue == true)
        {
            var pDate = period.PaymentDate.Value;
            var pYear = pDate.Year > 2400 ? pDate.Year : pDate.Year + 543;
            paymentDateText = $"{pDate.Day:D2}/{pDate.Month:D2}/{pYear}";
        }

        // 5. Categorize Earnings and Deductions
        var earnings = payroll.Details
            .Where(d => d.PayrollItem?.ItemType == "EARNING" ||
                        d.PayrollItem?.ItemType == "ALLOWANCE" ||
                        d.PayrollItem?.ItemType == "OVERTIME" ||
                        d.PayrollItem?.ItemType == "BONUS")
            .OrderBy(d => EarningOrder(d.PayrollItem?.ItemCode))
            .ThenBy(d => d.Id)
            .ToList();

        var deductions = payroll.Details
            .Where(d => d.PayrollItem?.ItemType == "DEDUCTION" ||
                        d.PayrollItem?.ItemType == "TAX" ||
                        d.PayrollItem?.ItemType == "SSO" ||
                        d.PayrollItem?.ItemType == "LEAVE_DEDUCTION")
            .OrderBy(d => DeductionOrder(d.PayrollItem?.ItemCode))
            .ThenBy(d => d.Id)
            .ToList();

        // If no details recorded, add base earnings from TotalGross
        if (!earnings.Any() && payroll.TotalGrossIncome > 0)
        {
            earnings.Add(new PayrollDetail
            {
                Amount = payroll.TotalGrossIncome,
                PayrollItem = new PayrollItem { ItemName = "เงินเดือนพื้นฐาน (Base Salary)" }
            });
        }

        // 6. Generate PDF (หน้าตาอยู่ที่ PayslipPdf/PayslipTheme.cs, การวาดอยู่ที่ PayslipPdf/PayslipRenderer.cs)
        byte[] pdfBytes = PayslipRenderer.Render(new PayslipData(
            companyName, companyAddress, companyPhone,
            empCode, empName, positionName, departmentName,
            monthName, thaiYear, paymentDateText, bankText,
            payroll.TotalGrossIncome, payroll.TotalDeductionAmount, payroll.NetPayableSalary,
            ToThaiBahtText(payroll.NetPayableSalary),
            earnings.Select(d => (d.PayrollItem?.ItemName ?? "รายได้อื่นๆ", d.Amount)).ToList(),
            deductions.Select(d => (d.PayrollItem?.ItemName ?? "รายการหัก", d.Amount)).ToList(),
            ytdGross, ytdTax, ytdSso,
            password, passwordHint));

        // 7. Store or update in hrms.payslip table
        var payslipRecord = await _context.Payslips.FirstOrDefaultAsync(p => p.PayrollId == payrollId, cancellationToken);
        var fileHash = Convert.ToHexString(SHA256.HashData(pdfBytes));
        if (payslipRecord == null)
        {
            payslipRecord = new Payslip
            {
                PayrollId = payrollId,
                GeneratedAt = DateTimeOffset.UtcNow,
                FileHash = fileHash,
                PdfData = pdfBytes
            };
            _context.Payslips.Add(payslipRecord);
        }
        else
        {
            payslipRecord.GeneratedAt = DateTimeOffset.UtcNow;
            payslipRecord.FileHash = fileHash;
            payslipRecord.PdfData = pdfBytes;
        }
        await _context.SaveChangesAsync(cancellationToken);

        string fileName = $"Payslip_{periodYear}_{periodMonth:D2}_{empCode}.pdf";
        return (pdfBytes, fileName);
    }

    /// <summary>ลำดับรายการได้ในสลิป: เงินเดือน → ค่าตำแหน่ง → OT → อื่นๆ → โบนัส/ค่าคอม</summary>
    private static int EarningOrder(string? code) => PayslipHelper.EarningOrder(code);

    /// <summary>ลำดับรายการหักในสลิป: ประกันสังคม → ภาษี → กองทุนสำรองเลี้ยงชีพ → อื่นๆ</summary>
    private static int DeductionOrder(string? code) => PayslipHelper.DeductionOrder(code);

    private static readonly string[] Units = { "", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า" };
    private static readonly string[] Positions = { "", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน" };

    private static string ToThaiBahtText(decimal amount)
    {
        if (amount == 0) return "ศูนย์บาทถ้วน";

        long baht = (long)Math.Truncate(amount);
        long satang = (long)Math.Round((amount - baht) * 100);

        string result = "";
        if (baht > 0)
        {
            result += ConvertNumber(baht) + "บาท";
        }

        if (satang > 0)
        {
            result += ConvertNumber(satang) + "สตางค์";
        }
        else
        {
            result += "ถ้วน";
        }

        return result;
    }

    private static string ConvertNumber(long number)
    {
        if (number == 0) return "";
        string s = number.ToString();
        int len = s.Length;
        string text = "";

        for (int i = 0; i < len; i++)
        {
            int digit = s[i] - '0';
            int pos = len - i - 1;

            if (pos >= 6 && pos % 6 == 0)
            {
                if (digit > 0)
                {
                    if (digit == 1 && len > 1 && i > 0)
                        text += "เอ็ด";
                    else
                        text += Units[digit];
                }
                text += "ล้าน";
                continue;
            }

            int currentPos = pos % 6;
            if (digit != 0)
            {
                if (currentPos == 1 && digit == 1)
                {
                    text += "";
                }
                else if (currentPos == 1 && digit == 2)
                {
                    text += "ยี่";
                }
                else if (currentPos == 0 && digit == 1 && len > 1 && s[i - 1] != '0')
                {
                    text += "เอ็ด";
                }
                else
                {
                    text += Units[digit];
                }

                text += Positions[currentPos];
            }
        }

        return text;
    }
}
