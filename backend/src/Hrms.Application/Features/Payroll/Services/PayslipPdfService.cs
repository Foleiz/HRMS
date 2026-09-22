using System.IO.Compression;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using PdfSharpCore;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using PayrollEntity = Hrms.Domain.Entities.Payroll;

namespace Hrms.Application.Features.Payroll.Services;

public class PayslipPdfService : IPayslipPdfService
{
    private readonly IHrmsDbContext _context;

    public PayslipPdfService(IHrmsDbContext context)
    {
        _context = context;
        ThaiFontResolver.EnsureRegistered();
    }

    private static readonly string[] ThaiMonths =
    {
        "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    };

    private static string GetPeriodTitle(PayrollPeriod period)
    {
        var mName = period.Month >= 1 && period.Month <= 12 ? ThaiMonths[period.Month] : period.Month.ToString();
        return $"{mName} {period.Year + 543}";
    }

    public async Task<byte[]> GeneratePayslipPdfAsync(long payrollId, string? password = null, CancellationToken cancellationToken = default)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Period)
            .Include(p => p.Details)
                .ThenInclude(d => d.PayrollItem)
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรายการเงินเดือนพนักงาน");

        var employee = await _context.Employees
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Position)
            .Include(e => e.Assignments.Where(a => a.IsCurrent))
                .ThenInclude(a => a.Department)
            .Include(e => e.BankAccounts.Where(b => b.IsPrimary))
                .ThenInclude(b => b.Bank)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == payroll.EmployeeId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลพนักงาน");

        var company = await _context.Companies.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

        // Determine password if not explicitly supplied
        string effectivePassword = password?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(effectivePassword))
        {
            // Default: last 4 digits of citizen ID
            var citizenIdClean = employee.CitizenId.Replace("-", "").Replace(" ", "");
            if (citizenIdClean.Length >= 4)
            {
                effectivePassword = citizenIdClean.Substring(citizenIdClean.Length - 4);
            }
        }

        // Calculate YTD totals from closed/paid periods of the same year
        var ytdPayrolls = await _context.Payrolls
            .Include(p => p.Period)
            .Include(p => p.Details)
                .ThenInclude(d => d.PayrollItem)
            .Where(p => p.EmployeeId == employee.Id
                     && p.Period.Year == payroll.Period.Year
                     && p.Period.Month <= payroll.Period.Month
                     && (p.Period.Status == "PAID" || p.Period.Status == "CLOSED" || p.Period.Id == payroll.PeriodId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        decimal ytdGross = ytdPayrolls.Sum(p => p.TotalGrossIncome);
        decimal ytdTax = ytdPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemName.Contains("ภาษี") || d.PayrollItem.ItemName.Contains("Tax")))
            .Sum(d => Math.Abs(d.Amount));
        decimal ytdSso = ytdPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemName.Contains("ประกันสังคม") || d.PayrollItem.ItemName.Contains("SSO")))
            .Sum(d => Math.Abs(d.Amount));

        return RenderPayslipPdf(company, employee, payroll, ytdGross, ytdTax, ytdSso, effectivePassword);
    }

    public async Task<byte[]> GeneratePeriodPayslipsZipAsync(long periodId, string passwordType = "CITIZEN_ID_LAST4", CancellationToken cancellationToken = default)
    {
        var period = await _context.PayrollPeriods
            .Include(p => p.Payrolls)
            .FirstOrDefaultAsync(p => p.Id == periodId, cancellationToken)
            ?? throw new NotFoundException("ไม่พบข้อมูลรอบเงินเดือน");

        if (!period.Payrolls.Any())
            throw new BusinessRuleException("รอบเงินเดือนนี้ยังไม่มีรายการเงินเดือนที่ประมวลผล");

        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            foreach (var payroll in period.Payrolls)
            {
                var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == payroll.EmployeeId, cancellationToken);
                string empCode = employee?.EmployeeCode ?? $"EMP{payroll.EmployeeId}";
                string empName = employee != null ? $"{employee.FirstName}_{employee.LastName}" : $"พนักงาน_{payroll.EmployeeId}";

                // Resolve password per employee based on passwordType
                string? empPassword = null;
                if (passwordType == "CITIZEN_ID_LAST4" && employee != null)
                {
                    var cleanId = employee.CitizenId.Replace("-", "").Replace(" ", "");
                    if (cleanId.Length >= 4) empPassword = cleanId.Substring(cleanId.Length - 4);
                }
                else if (passwordType == "BIRTH_DATE" && employee?.BirthDate.HasValue == true)
                {
                    empPassword = employee.BirthDate.Value.ToString("ddMMyyyy");
                }

                byte[] pdfBytes = await GeneratePayslipPdfAsync(payroll.Id, empPassword, cancellationToken);

                string fileName = $"สลิปเงินเดือน_{period.Year}_{period.Month:D2}_{empCode}_{empName}.pdf";
                var entry = archive.CreateEntry(fileName, CompressionLevel.Optimal);
                using var entryStream = entry.Open();
                await entryStream.WriteAsync(pdfBytes, 0, pdfBytes.Length, cancellationToken);
            }
        }

        return memoryStream.ToArray();
    }

    private byte[] RenderPayslipPdf(
        Company? company,
        Employee employee,
        PayrollEntity payroll,
        decimal ytdGross,
        decimal ytdTax,
        decimal ytdSso,
        string? password)
    {
        using var document = new PdfDocument();
        document.Info.Title = $"ใบแจ้งเงินเดือน - {employee.FullName}";
        document.Info.Subject = $"สลิปเงินเดือนประจำรอบ {GetPeriodTitle(payroll.Period)}";
        document.Info.Author = company?.CompanyName ?? "ระบบบริหารงานบุคคล HRMS";

        // Security / Encryption Settings
        if (!string.IsNullOrWhiteSpace(password))
        {
            document.SecuritySettings.UserPassword = password;
            document.SecuritySettings.OwnerPassword = Guid.NewGuid().ToString("N");
            document.SecuritySettings.PermitFullQualityPrint = true;
            document.SecuritySettings.PermitPrint = true;
            document.SecuritySettings.PermitExtractContent = false;
            document.SecuritySettings.PermitModifyDocument = false;
            document.SecuritySettings.PermitAnnotations = false;
            document.SecuritySettings.PermitAssembleDocument = false;
            document.SecuritySettings.PermitFormsFill = false;
        }

        var page = document.AddPage();
        page.Size = PageSize.A4;
        page.Orientation = PageOrientation.Portrait;

        using var gfx = XGraphics.FromPdfPage(page);

        // Fonts
        var fontCompany = new XFont("Tahoma", 15, XFontStyle.Bold);
        var fontTitle = new XFont("Tahoma", 12, XFontStyle.Bold);
        var fontSection = new XFont("Tahoma", 9.5, XFontStyle.Bold);
        var fontBodyBold = new XFont("Tahoma", 8.5, XFontStyle.Bold);
        var fontBody = new XFont("Tahoma", 8.5, XFontStyle.Regular);
        var fontSmall = new XFont("Tahoma", 7.5, XFontStyle.Regular);

        // Palette
        var colorPrimary = XColor.FromArgb(11, 32, 70); // #0B2046
        var colorHeaderBg = XColor.FromArgb(241, 245, 249); // slate-100
        var colorBoxBg = XColor.FromArgb(248, 250, 252); // slate-50
        var colorBorder = XColor.FromArgb(226, 232, 240); // slate-200
        var colorTextDark = XColor.FromArgb(15, 23, 42); // slate-900
        var colorTextMuted = XColor.FromArgb(100, 116, 139); // slate-500
        var colorEmerald = XColor.FromArgb(16, 185, 129);

        var penBorder = new XPen(colorBorder, 0.8);
        var penDark = new XPen(colorPrimary, 1.2);

        double leftMargin = 36;
        double rightMargin = page.Width - 36;
        double contentWidth = rightMargin - leftMargin; // ~523 pt
        double y = 36;

        // 1. Company Header
        string compName = company?.CompanyName ?? "บริษัท เอ็นเตอร์ไพรส์ บิสซิเนส โซลูชั่นส์ จำกัด";
        gfx.DrawString(compName, fontCompany, new XSolidBrush(colorPrimary), new XRect(leftMargin, y, contentWidth, 22), XStringFormats.TopLeft);
        y += 20;

        string compAddr = company?.Address ?? "สำนักงานใหญ่ กรุงเทพมหานคร";
        gfx.DrawString(compAddr, fontSmall, new XSolidBrush(colorTextMuted), new XRect(leftMargin, y, contentWidth, 14), XStringFormats.TopLeft);
        y += 18;

        // Document Title Banner
        gfx.DrawRectangle(new XSolidBrush(colorHeaderBg), leftMargin, y, contentWidth, 26);
        gfx.DrawRectangle(penBorder, leftMargin, y, contentWidth, 26);
        gfx.DrawString("ใบแจ้งเงินเดือน / PAYSLIP", fontTitle, new XSolidBrush(colorPrimary), new XRect(leftMargin, y + 5, contentWidth, 20), XStringFormats.TopCenter);
        y += 34;

        // 2. Employee & Period Information Grid (Box)
        var currentAssignment = employee.Assignments.FirstOrDefault(a => a.IsCurrent);
        var primaryBank = employee.BankAccounts.FirstOrDefault(b => b.IsPrimary);

        double infoBoxHeight = 60;
        gfx.DrawRoundedRectangle(penBorder, new XSolidBrush(colorBoxBg), leftMargin, y, contentWidth, infoBoxHeight, 4, 4);

        double col1X = leftMargin + 10;
        double col2X = leftMargin + (contentWidth / 3.0);
        double col3X = leftMargin + ((contentWidth / 3.0) * 2);

        double row1Y = y + 8;
        double row2Y = y + 25;
        double row3Y = y + 42;

        // Row 1
        gfx.DrawString("รหัสพนักงาน:", fontBodyBold, new XSolidBrush(colorTextMuted), col1X, row1Y);
        gfx.DrawString(employee.EmployeeCode, fontBodyBold, new XSolidBrush(colorTextDark), col1X + 65, row1Y);

        gfx.DrawString("รอบเงินเดือน:", fontBodyBold, new XSolidBrush(colorTextMuted), col2X, row1Y);
        gfx.DrawString(GetPeriodTitle(payroll.Period), fontBodyBold, new XSolidBrush(colorTextDark), col2X + 65, row1Y);

        gfx.DrawString("วันที่จ่ายเงิน:", fontBodyBold, new XSolidBrush(colorTextMuted), col3X, row1Y);
        string payDateStr = payroll.Period.PaymentDate.HasValue ? payroll.Period.PaymentDate.Value.ToString("dd/MM/yyyy") : "-";
        gfx.DrawString(payDateStr, fontBodyBold, new XSolidBrush(colorTextDark), col3X + 60, row1Y);

        // Row 2
        gfx.DrawString("ชื่อ-นามสกุล:", fontBodyBold, new XSolidBrush(colorTextMuted), col1X, row2Y);
        gfx.DrawString(employee.FullName, fontBodyBold, new XSolidBrush(colorTextDark), col1X + 65, row2Y);

        gfx.DrawString("แผนก/ฝ่าย:", fontBodyBold, new XSolidBrush(colorTextMuted), col2X, row2Y);
        gfx.DrawString(currentAssignment?.Department?.DepartmentName ?? "-", fontBody, new XSolidBrush(colorTextDark), col2X + 65, row2Y);

        gfx.DrawString("ตำแหน่ง:", fontBodyBold, new XSolidBrush(colorTextMuted), col3X, row2Y);
        gfx.DrawString(currentAssignment?.Position?.PositionName ?? "-", fontBody, new XSolidBrush(colorTextDark), col3X + 60, row2Y);

        // Row 3
        gfx.DrawString("เลขบัตร ปชช.:", fontBodyBold, new XSolidBrush(colorTextMuted), col1X, row3Y);
        gfx.DrawString(employee.CitizenIdMasked ?? "-", fontBody, new XSolidBrush(colorTextDark), col1X + 65, row3Y);

        gfx.DrawString("ธนาคาร:", fontBodyBold, new XSolidBrush(colorTextMuted), col2X, row3Y);
        gfx.DrawString(primaryBank?.Bank?.BankName ?? "ธนาคารพาณิชย์", fontBody, new XSolidBrush(colorTextDark), col2X + 65, row3Y);

        gfx.DrawString("เลขที่บัญชี:", fontBodyBold, new XSolidBrush(colorTextMuted), col3X, row3Y);
        gfx.DrawString(primaryBank?.AccountNumber ?? "-", fontBody, new XSolidBrush(colorTextDark), col3X + 60, row3Y);

        y += infoBoxHeight + 14;

        // 3. Two-Column Table for Earnings and Deductions
        double halfWidth = (contentWidth - 10) / 2.0;
        double earningsX = leftMargin;
        double deductionsX = leftMargin + halfWidth + 10;
        double tableStartY = y;

        // Earnings Header
        gfx.DrawRectangle(new XSolidBrush(colorPrimary), earningsX, tableStartY, halfWidth, 22);
        gfx.DrawString("รายการเงินได้ (EARNINGS)", fontSection, XBrushes.White, new XRect(earningsX + 8, tableStartY + 5, halfWidth - 16, 16), XStringFormats.TopLeft);
        gfx.DrawString("จำนวนเงิน (บาท)", fontSection, XBrushes.White, new XRect(earningsX + 8, tableStartY + 5, halfWidth - 16, 16), XStringFormats.TopRight);

        // Deductions Header
        gfx.DrawRectangle(new XSolidBrush(colorPrimary), deductionsX, tableStartY, halfWidth, 22);
        gfx.DrawString("รายการเงินหัก (DEDUCTIONS)", fontSection, XBrushes.White, new XRect(deductionsX + 8, tableStartY + 5, halfWidth - 16, 16), XStringFormats.TopLeft);
        gfx.DrawString("จำนวนเงิน (บาท)", fontSection, XBrushes.White, new XRect(deductionsX + 8, tableStartY + 5, halfWidth - 16, 16), XStringFormats.TopRight);

        double rowHeight = 18;
        double curEarningsY = tableStartY + 22;
        double curDeductionsY = tableStartY + 22;

        var earningsList = payroll.Details.Where(d => d.PayrollItem?.ItemType == "EARNING").OrderBy(d => d.Id).ToList();
        var deductionsList = payroll.Details.Where(d => d.PayrollItem?.ItemType == "DEDUCTION").OrderBy(d => d.Id).ToList();

        int maxRows = Math.Max(earningsList.Count, deductionsList.Count);
        if (maxRows < 6) maxRows = 6; // Minimum visual rows for balanced look

        for (int i = 0; i < maxRows; i++)
        {
            // Earnings Row
            bool hasEarning = i < earningsList.Count;
            var earningItem = hasEarning ? earningsList[i] : null;
            XBrush rowBg = (i % 2 == 1) ? new XSolidBrush(colorBoxBg) : XBrushes.White;

            gfx.DrawRectangle(rowBg, earningsX, curEarningsY, halfWidth, rowHeight);
            gfx.DrawRectangle(penBorder, earningsX, curEarningsY, halfWidth, rowHeight);

            if (earningItem != null)
            {
                var itemName = earningItem.PayrollItem?.ItemName ?? "รายได้";
                gfx.DrawString(itemName, fontBody, new XSolidBrush(colorTextDark), new XRect(earningsX + 8, curEarningsY + 3, halfWidth - 16, rowHeight), XStringFormats.TopLeft);
                gfx.DrawString(earningItem.Amount.ToString("N2"), fontBody, new XSolidBrush(colorTextDark), new XRect(earningsX + 8, curEarningsY + 3, halfWidth - 16, rowHeight), XStringFormats.TopRight);
            }
            curEarningsY += rowHeight;

            // Deductions Row
            bool hasDeduction = i < deductionsList.Count;
            var deductionItem = hasDeduction ? deductionsList[i] : null;

            gfx.DrawRectangle(rowBg, deductionsX, curDeductionsY, halfWidth, rowHeight);
            gfx.DrawRectangle(penBorder, deductionsX, curDeductionsY, halfWidth, rowHeight);

            if (deductionItem != null)
            {
                var itemName = deductionItem.PayrollItem?.ItemName ?? "รายการหัก";
                gfx.DrawString(itemName, fontBody, new XSolidBrush(colorTextDark), new XRect(deductionsX + 8, curDeductionsY + 3, halfWidth - 16, rowHeight), XStringFormats.TopLeft);
                gfx.DrawString(Math.Abs(deductionItem.Amount).ToString("N2"), fontBody, new XSolidBrush(colorTextDark), new XRect(deductionsX + 8, curDeductionsY + 3, halfWidth - 16, rowHeight), XStringFormats.TopRight);
            }
            curDeductionsY += rowHeight;
        }

        // Subtotal Rows
        gfx.DrawRectangle(new XSolidBrush(colorHeaderBg), earningsX, curEarningsY, halfWidth, 22);
        gfx.DrawRectangle(penBorder, earningsX, curEarningsY, halfWidth, 22);
        gfx.DrawString("รวมเงินได้ทั้งสิ้น", fontSection, new XSolidBrush(colorPrimary), new XRect(earningsX + 8, curEarningsY + 5, halfWidth - 16, 16), XStringFormats.TopLeft);
        gfx.DrawString(payroll.TotalGrossIncome.ToString("N2"), fontSection, new XSolidBrush(colorPrimary), new XRect(earningsX + 8, curEarningsY + 5, halfWidth - 16, 16), XStringFormats.TopRight);

        gfx.DrawRectangle(new XSolidBrush(colorHeaderBg), deductionsX, curDeductionsY, halfWidth, 22);
        gfx.DrawRectangle(penBorder, deductionsX, curDeductionsY, halfWidth, 22);
        gfx.DrawString("รวมเงินหักทั้งสิ้น", fontSection, new XSolidBrush(colorPrimary), new XRect(deductionsX + 8, curDeductionsY + 5, halfWidth - 16, 16), XStringFormats.TopLeft);
        gfx.DrawString(payroll.TotalDeductionAmount.ToString("N2"), fontSection, new XSolidBrush(colorPrimary), new XRect(deductionsX + 8, curDeductionsY + 5, halfWidth - 16, 16), XStringFormats.TopRight);

        y = curEarningsY + 28;

        // 4. Net Salary Highlight Bar
        double netBoxHeight = 36;
        gfx.DrawRoundedRectangle(new XPen(XColor.FromArgb(134, 239, 172), 1.2), new XSolidBrush(XColor.FromArgb(240, 253, 244)), leftMargin, y, contentWidth, netBoxHeight, 4, 4);

        string bahtText = ThaiBahtTextHelper.ToThaiBahtText(payroll.NetPayableSalary);
        gfx.DrawString("เงินได้สุทธิ (NET PAYABLE SALARY)", fontSection, new XSolidBrush(XColor.FromArgb(22, 101, 52)), leftMargin + 12, y + 12);
        gfx.DrawString($"({bahtText})", fontSmall, new XSolidBrush(XColor.FromArgb(21, 128, 61)), leftMargin + 12, y + 25);

        string netSalaryStr = $"฿ {payroll.NetPayableSalary:N2}";
        gfx.DrawString(netSalaryStr, new XFont("Tahoma", 14, XFontStyle.Bold), new XSolidBrush(XColor.FromArgb(22, 101, 52)), new XRect(leftMargin, y + 8, contentWidth - 14, 24), XStringFormats.TopRight);

        y += netBoxHeight + 14;

        // 5. YTD Accumulation Box (ยอดสะสมประจำปี)
        double ytdBoxHeight = 44;
        gfx.DrawRoundedRectangle(penBorder, new XSolidBrush(colorBoxBg), leftMargin, y, contentWidth, ytdBoxHeight, 4, 4);

        double ytdColWidth = contentWidth / 3.0;
        double ytdRow1 = y + 8;
        double ytdRow2 = y + 24;

        // Col 1: YTD Gross
        gfx.DrawString("รายได้สะสมประจำปี", fontSmall, new XSolidBrush(colorTextMuted), leftMargin + 10, ytdRow1);
        gfx.DrawString($"฿ {ytdGross:N2}", fontBodyBold, new XSolidBrush(colorTextDark), leftMargin + 10, ytdRow2);

        // Col 2: YTD Tax
        gfx.DrawString("ภาษีหัก ณ ที่จ่ายสะสม", fontSmall, new XSolidBrush(colorTextMuted), leftMargin + ytdColWidth + 10, ytdRow1);
        gfx.DrawString($"฿ {ytdTax:N2}", fontBodyBold, new XSolidBrush(colorTextDark), leftMargin + ytdColWidth + 10, ytdRow2);

        // Col 3: YTD SSO
        gfx.DrawString("เงินสมทบประกันสังคมสะสม", fontSmall, new XSolidBrush(colorTextMuted), leftMargin + (ytdColWidth * 2) + 10, ytdRow1);
        gfx.DrawString($"฿ {ytdSso:N2}", fontBodyBold, new XSolidBrush(colorTextDark), leftMargin + (ytdColWidth * 2) + 10, ytdRow2);

        y += ytdBoxHeight + 18;

        // 6. Security and PDPA Notice Footer
        gfx.DrawLine(penBorder, leftMargin, y, rightMargin, y);
        y += 8;

        string notice1 = "* เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติ ข้อมูลในเอกสารนี้เป็นความลับเฉพาะบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)";
        string notice2 = string.IsNullOrWhiteSpace(password)
            ? "เอกสารนี้ไม่มีการใส่รหัสผ่านป้องกัน"
            : "เอกสารนี้ได้รับการป้องกันด้วยรหัสผ่านความปลอดภัย (เปิดอ่านด้วยเลข 4 ตัวท้ายบัตรประชาชนหรือรหัสผ่านส่วนบุคคล)";

        gfx.DrawString(notice1, fontSmall, new XSolidBrush(colorTextMuted), new XRect(leftMargin, y, contentWidth, 12), XStringFormats.TopLeft);
        gfx.DrawString(notice2, fontSmall, new XSolidBrush(colorTextMuted), new XRect(leftMargin, y + 12, contentWidth, 12), XStringFormats.TopLeft);

        string printDate = $"พิมพ์วันที่: {DateTime.Now:dd/MM/yyyy HH:mm}";
        gfx.DrawString(printDate, fontSmall, new XSolidBrush(colorTextMuted), new XRect(leftMargin, y, contentWidth, 12), XStringFormats.TopRight);

        using var outputStream = new MemoryStream();
        document.Save(outputStream, false);
        return outputStream.ToArray();
    }
}
