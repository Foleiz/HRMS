using System.Security.Cryptography;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Payroll.Services;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using PdfSharpCore;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// Service สำหรับสร้างและดาวน์โหลดไฟล์สลิปเงินเดือน E-Payslip PDF พร้อมการเข้ารหัสความปลอดภัย (Password Protection)
/// </summary>
public class PayslipService : IPayslipService
{
    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    private static readonly string[] ThaiMonths =
    {
        "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    };

    public PayslipService(IHrmsDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    /// <inheritdoc />
    public async Task<(byte[] FileBytes, string FileName)> GetMyPayslipPdfAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        var employeeId = _currentUserService.EmployeeId;
        if (!employeeId.HasValue)
        {
            throw new UnauthorizedAccessException("ไม่พบข้อมูลพนักงานที่ล็อกอินอยู่");
        }

        var payroll = await _context.Payrolls
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == payrollId, cancellationToken);

        if (payroll == null)
        {
            throw new NotFoundException($"ไม่พบข้อมูลสลิปเงินเดือนรหัส #{payrollId}");
        }

        if (payroll.EmployeeId != employeeId.Value && !_currentUserService.HasRole("ADMIN"))
        {
            throw new UnauthorizedAccessException("คุณไม่มีสิทธิ์ดาวน์โหลดสลิปเงินเดือนของพนักงานท่านอื่น");
        }

        return await GenerateOrRetrievePayslipPdfAsync(payrollId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<(byte[] FileBytes, string FileName)> GetPayslipPdfAsync(long payrollId, CancellationToken cancellationToken = default)
    {
        return await GenerateOrRetrievePayslipPdfAsync(payrollId, cancellationToken);
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
        var periodYear = period?.Year ?? DateTime.Now.Year;
        var periodMonth = period?.Month ?? DateTime.Now.Month;
        var monthName = (periodMonth >= 1 && periodMonth <= 12) ? ThaiMonths[periodMonth] : $"เดือนที่ {periodMonth}";
        var thaiYear = periodYear > 2400 ? periodYear : periodYear + 543;

        // 1. Password Determination (วันเกิด DDMMYYYY หรือเลขบัตรประชาชน 4 ตัวท้าย)
        string password = "";
        if (emp?.BirthDate.HasValue == true)
        {
            password = emp.BirthDate.Value.ToString("ddMMyyyy");
        }
        else if (!string.IsNullOrEmpty(emp?.CitizenId) && emp.CitizenId.Length >= 4)
        {
            password = emp.CitizenId[^4..];
        }
        else
        {
            password = emp?.EmployeeCode ?? "12345678";
        }

        // 2. Query Company Master
        var company = await _context.Companies.FirstOrDefaultAsync(cancellationToken);
        string companyName = company?.CompanyName ?? "บริษัท สยาม อินโนเวชั่น เทคโนโลยี จำกัด";
        string companyAddress = company?.Address ?? "123 อาคารสยามทาวเวอร์ ชั้น 18 ถนนสุขุมวิท คลองเตย กรุงเทพฯ";
        string companyPhone = company?.Phone ?? "02-123-4567";

        // 3. Query YTD totals
        var yearPayrolls = await _context.Payrolls
            .AsNoTracking()
            .Include(p => p.Period)
            .Include(p => p.Details)
                .ThenInclude(d => d.PayrollItem)
            .Where(p => p.EmployeeId == payroll.EmployeeId &&
                        p.Period != null &&
                        p.Period.Year == periodYear &&
                        p.Period.Month <= periodMonth &&
                        (p.Status == "PAID" || p.Status == "APPROVED" || p.Status == "CALCULATED"))
            .ToListAsync(cancellationToken);

        decimal ytdGross = yearPayrolls.Sum(p => p.TotalGrossIncome);
        decimal ytdTax = yearPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemType == "TAX" || d.PayrollItem.ItemName.Contains("ภาษี")))
            .Sum(d => d.Amount);
        decimal ytdSso = yearPayrolls.SelectMany(p => p.Details)
            .Where(d => d.PayrollItem != null && (d.PayrollItem.ItemType == "SSO" || d.PayrollItem.ItemName.Contains("ประกันสังคม")))
            .Sum(d => d.Amount);

        // 4. Employee metadata
        var primaryAssignment = emp?.Assignments.FirstOrDefault(a => a.IsCurrent) ?? emp?.Assignments.FirstOrDefault();
        string positionName = payroll.SnapshotPositionName ?? primaryAssignment?.Position?.PositionName ?? "-";
        string departmentName = payroll.SnapshotDepartmentName ?? primaryAssignment?.Department?.DepartmentName ?? "-";
        string empName = payroll.SnapshotEmployeeName ?? emp?.FullName ?? "พนักงาน";
        string empCode = emp?.EmployeeCode ?? "EMP";

        var primaryBank = emp?.BankAccounts.FirstOrDefault(b => b.IsPrimary) ?? emp?.BankAccounts.FirstOrDefault();
        string bankText = "-";
        if (primaryBank != null)
        {
            var rawAcc = primaryBank.AccountNumber;
            string masked = rawAcc.Length >= 4
                ? $"xxx-xxx-{rawAcc[^4..^2]}-{rawAcc[^1..]}"
                : rawAcc;
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
            .OrderBy(d => d.Id)
            .ToList();

        var deductions = payroll.Details
            .Where(d => d.PayrollItem?.ItemType == "DEDUCTION" ||
                        d.PayrollItem?.ItemType == "TAX" ||
                        d.PayrollItem?.ItemType == "SSO" ||
                        d.PayrollItem?.ItemType == "LEAVE_DEDUCTION")
            .OrderBy(d => d.Id)
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

        // 6. Generate PDF with PdfSharpCore
        byte[] pdfBytes = BuildPdfDocument(
            companyName, companyAddress, companyPhone,
            empCode, empName, positionName, departmentName,
            monthName, thaiYear, paymentDateText, bankText,
            payroll.TotalGrossIncome, payroll.TotalDeductionAmount, payroll.NetPayableSalary,
            earnings, deductions,
            ytdGross, ytdTax, ytdSso,
            password
        );

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

    private static byte[] BuildPdfDocument(
        string companyName, string companyAddress, string companyPhone,
        string empCode, string empName, string positionName, string departmentName,
        string monthName, int thaiYear, string paymentDateText, string bankText,
        decimal totalGross, decimal totalDeductions, decimal netPay,
        List<PayrollDetail> earnings, List<PayrollDetail> deductions,
        decimal ytdGross, decimal ytdTax, decimal ytdSso,
        string password)
    {
        using var doc = new PdfDocument();
        doc.Info.Title = $"ใบแจ้งยอดเงินเดือน {monthName} {thaiYear} - {empName}";
        doc.Info.Author = companyName;
        doc.Info.Subject = "สลิปเงินเดือนพนักงาน (E-Payslip)";

        // Set Password Encryption
        if (!string.IsNullOrWhiteSpace(password))
        {
            doc.SecuritySettings.UserPassword = password;
            doc.SecuritySettings.OwnerPassword = Guid.NewGuid().ToString("N");
        }

        var page = doc.AddPage();
        page.Size = PageSize.A4;
        page.Orientation = PageOrientation.Portrait;

        var gfx = XGraphics.FromPdfPage(page);

        // Fonts
        var fontCompany = new XFont("Tahoma", 12, XFontStyle.Bold);
        var fontCompanySmall = new XFont("Tahoma", 7.5, XFontStyle.Regular);
        var fontTitle = new XFont("Tahoma", 12, XFontStyle.Bold);
        var fontSubTitle = new XFont("Tahoma", 8, XFontStyle.Regular);
        var fontBold = new XFont("Tahoma", 8.5, XFontStyle.Bold);
        var fontRegular = new XFont("Tahoma", 8.5, XFontStyle.Regular);
        var fontSmall = new XFont("Tahoma", 7.5, XFontStyle.Regular);
        var fontNetBig = new XFont("Tahoma", 14, XFontStyle.Bold);

        // Colors
        var navyBrush = new XSolidBrush(XColor.FromArgb(11, 32, 70));       // #0B2046
        var greenBrush = new XSolidBrush(XColor.FromArgb(16, 185, 129));   // #10B981
        var roseBrush = new XSolidBrush(XColor.FromArgb(225, 29, 72));      // #E11D48
        var darkGrayBrush = new XSolidBrush(XColor.FromArgb(51, 65, 85));  // #334155
        var borderPen = new XPen(XColor.FromArgb(226, 232, 240), 1);      // #E2E8F0
        var darkPen = new XPen(XColor.FromArgb(11, 32, 70), 1.2);

        double pageWidth = page.Width;
        double left = 36;
        double right = pageWidth - 36;
        double contentWidth = right - left;
        double y = 36;

        // ─────────────────────────────────────────────────────────────
        // 1. TOP HEADER: Company Info (Left) + Payslip Title (Right)
        // ─────────────────────────────────────────────────────────────
        gfx.DrawString(companyName, fontCompany, navyBrush, new XPoint(left, y));
        y += 13;
        gfx.DrawString(companyAddress, fontCompanySmall, darkGrayBrush, new XPoint(left, y));
        y += 11;
        gfx.DrawString($"โทรศัพท์: {companyPhone}", fontCompanySmall, darkGrayBrush, new XPoint(left, y));

        // Right Header
        var titleText = "ใบแจ้งยอดเงินเดือน / PAYSLIP";
        var titleSize = gfx.MeasureString(titleText, fontTitle);
        gfx.DrawString(titleText, fontTitle, navyBrush, new XPoint(right - titleSize.Width, 36));

        var subTitleText = "ส่วนบุคคลและเป็นความลับ (CONFIDENTIAL)";
        var subTitleSize = gfx.MeasureString(subTitleText, fontSubTitle);
        gfx.DrawString(subTitleText, fontSubTitle, roseBrush, new XPoint(right - subTitleSize.Width, 49));

        var periodText = $"งวดประจำเดือน: {monthName} {thaiYear}";
        var periodSize = gfx.MeasureString(periodText, fontBold);
        gfx.DrawString(periodText, fontBold, darkGrayBrush, new XPoint(right - periodSize.Width, 62));

        y += 14;
        gfx.DrawLine(darkPen, left, y, right, y);
        y += 10;

        // ─────────────────────────────────────────────────────────────
        // 2. EMPLOYEE INFORMATION BOX
        // ─────────────────────────────────────────────────────────────
        double infoBoxHeight = 52;
        var infoBgBrush = new XSolidBrush(XColor.FromArgb(248, 250, 252));
        gfx.DrawRectangle(infoBgBrush, left, y, contentWidth, infoBoxHeight);
        gfx.DrawRectangle(borderPen, left, y, contentWidth, infoBoxHeight);

        double col1 = left + 10;
        double col2 = left + 180;
        double col3 = left + 360;

        double infoY = y + 15;
        gfx.DrawString($"รหัสพนักงาน: ", fontRegular, darkGrayBrush, new XPoint(col1, infoY));
        gfx.DrawString(empCode, fontBold, navyBrush, new XPoint(col1 + 58, infoY));

        gfx.DrawString($"ชื่อ-นามสกุล: ", fontRegular, darkGrayBrush, new XPoint(col2, infoY));
        gfx.DrawString(empName, fontBold, navyBrush, new XPoint(col2 + 58, infoY));

        gfx.DrawString($"วันที่โอนเงิน: ", fontRegular, darkGrayBrush, new XPoint(col3, infoY));
        gfx.DrawString(paymentDateText, fontBold, navyBrush, new XPoint(col3 + 55, infoY));

        infoY += 18;
        gfx.DrawString($"ตำแหน่ง: ", fontRegular, darkGrayBrush, new XPoint(col1, infoY));
        gfx.DrawString(positionName, fontRegular, darkGrayBrush, new XPoint(col1 + 45, infoY));

        gfx.DrawString($"ฝ่าย/แผนก: ", fontRegular, darkGrayBrush, new XPoint(col2, infoY));
        gfx.DrawString(departmentName, fontRegular, darkGrayBrush, new XPoint(col2 + 50, infoY));

        gfx.DrawString($"บัญชีธนาคาร: ", fontRegular, darkGrayBrush, new XPoint(col3, infoY));
        gfx.DrawString(bankText, fontRegular, darkGrayBrush, new XPoint(col3 + 60, infoY));

        y += infoBoxHeight + 14;

        // ─────────────────────────────────────────────────────────────
        // 3. EARNINGS & DEDUCTIONS SIDE-BY-SIDE TABLE
        // ─────────────────────────────────────────────────────────────
        double gap = 12;
        double colWidth = (contentWidth - gap) / 2;
        double leftColX = left;
        double rightColX = left + colWidth + gap;

        double tableHeaderHeight = 22;
        double rowHeight = 18;
        int maxRows = Math.Max(Math.Max(earnings.Count, deductions.Count), 6);
        double tableBodyHeight = maxRows * rowHeight;
        double tableTotalHeight = 24;

        // Left Table Header (Earnings)
        var earnHeaderBrush = new XSolidBrush(XColor.FromArgb(16, 185, 129));
        gfx.DrawRectangle(earnHeaderBrush, leftColX, y, colWidth, tableHeaderHeight);
        gfx.DrawString("รายการได้ (EARNINGS)", fontBold, XBrushes.White, new XPoint(leftColX + 8, y + 15));
        gfx.DrawString("จำนวนเงิน (บาท)", fontBold, XBrushes.White, new XPoint(leftColX + colWidth - 75, y + 15));

        // Right Table Header (Deductions)
        var dedHeaderBrush = new XSolidBrush(XColor.FromArgb(225, 29, 72));
        gfx.DrawRectangle(dedHeaderBrush, rightColX, y, colWidth, tableHeaderHeight);
        gfx.DrawString("รายการหัก (DEDUCTIONS)", fontBold, XBrushes.White, new XPoint(rightColX + 8, y + 15));
        gfx.DrawString("จำนวนเงิน (บาท)", fontBold, XBrushes.White, new XPoint(rightColX + colWidth - 75, y + 15));

        // Draw Table Outlines
        double tableTopY = y + tableHeaderHeight;
        gfx.DrawRectangle(borderPen, leftColX, tableTopY, colWidth, tableBodyHeight);
        gfx.DrawRectangle(borderPen, rightColX, tableTopY, colWidth, tableBodyHeight);

        // Fill Earnings Rows
        for (int i = 0; i < maxRows; i++)
        {
            double rowY = tableTopY + (i * rowHeight);
            if (i % 2 == 1)
            {
                gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(250, 250, 250)), leftColX + 1, rowY, colWidth - 2, rowHeight);
            }

            if (i < earnings.Count)
            {
                var item = earnings[i];
                string name = item.PayrollItem?.ItemName ?? "รายได้อื่นๆ";
                gfx.DrawString(name, fontRegular, darkGrayBrush, new XPoint(leftColX + 8, rowY + 12));
                string amt = item.Amount.ToString("N2");
                var sz = gfx.MeasureString(amt, fontRegular);
                gfx.DrawString(amt, fontRegular, darkGrayBrush, new XPoint(leftColX + colWidth - 8 - sz.Width, rowY + 12));
            }
        }

        // Fill Deductions Rows
        for (int i = 0; i < maxRows; i++)
        {
            double rowY = tableTopY + (i * rowHeight);
            if (i % 2 == 1)
            {
                gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(250, 250, 250)), rightColX + 1, rowY, colWidth - 2, rowHeight);
            }

            if (i < deductions.Count)
            {
                var item = deductions[i];
                string name = item.PayrollItem?.ItemName ?? "รายการหัก";
                gfx.DrawString(name, fontRegular, darkGrayBrush, new XPoint(rightColX + 8, rowY + 12));
                string amt = item.Amount.ToString("N2");
                var sz = gfx.MeasureString(amt, fontRegular);
                gfx.DrawString(amt, fontRegular, roseBrush, new XPoint(rightColX + colWidth - 8 - sz.Width, rowY + 12));
            }
        }

        // Total Rows
        double totalY = tableTopY + tableBodyHeight;
        var totalBgBrush = new XSolidBrush(XColor.FromArgb(241, 245, 249));
        gfx.DrawRectangle(totalBgBrush, leftColX, totalY, colWidth, tableTotalHeight);
        gfx.DrawRectangle(borderPen, leftColX, totalY, colWidth, tableTotalHeight);
        gfx.DrawString("รวมเงินได้ (Total Earnings)", fontBold, navyBrush, new XPoint(leftColX + 8, totalY + 16));
        string totalGrossText = totalGross.ToString("N2");
        var totalGrossSz = gfx.MeasureString(totalGrossText, fontBold);
        gfx.DrawString(totalGrossText, fontBold, navyBrush, new XPoint(leftColX + colWidth - 8 - totalGrossSz.Width, totalY + 16));

        gfx.DrawRectangle(totalBgBrush, rightColX, totalY, colWidth, tableTotalHeight);
        gfx.DrawRectangle(borderPen, rightColX, totalY, colWidth, tableTotalHeight);
        gfx.DrawString("รวมเงินหัก (Total Deductions)", fontBold, roseBrush, new XPoint(rightColX + 8, totalY + 16));
        string totalDedText = totalDeductions.ToString("N2");
        var totalDedSz = gfx.MeasureString(totalDedText, fontBold);
        gfx.DrawString(totalDedText, fontBold, roseBrush, new XPoint(rightColX + colWidth - 8 - totalDedSz.Width, totalY + 16));

        y = totalY + tableTotalHeight + 14;

        // ─────────────────────────────────────────────────────────────
        // 4. NET PAYABLE HIGHLIGHT BOX (CYAN ACCENT)
        // ─────────────────────────────────────────────────────────────
        double netBoxHeight = 56;
        var netBgBrush = new XSolidBrush(XColor.FromArgb(235, 245, 251)); // #EBF5FB
        var netBorderPen = new XPen(XColor.FromArgb(14, 116, 144), 1.5); // Cyan-700
        gfx.DrawRectangle(netBgBrush, left, y, contentWidth, netBoxHeight);
        gfx.DrawRectangle(netBorderPen, left, y, contentWidth, netBoxHeight);

        gfx.DrawString("เงินได้สุทธิ / NET PAYABLE SALARY", fontBold, navyBrush, new XPoint(left + 14, y + 22));
        string thaiBahtText = $"( {ToThaiBahtText(netPay)} )";
        gfx.DrawString(thaiBahtText, fontSmall, darkGrayBrush, new XPoint(left + 14, y + 42));

        string netPayFormatted = $"฿{netPay:N2}";
        var netPaySize = gfx.MeasureString(netPayFormatted, fontNetBig);
        gfx.DrawString(netPayFormatted, fontNetBig, navyBrush, new XPoint(right - 14 - netPaySize.Width, y + 34));

        y += netBoxHeight + 14;

        // ─────────────────────────────────────────────────────────────
        // 5. YTD CUMULATIVE BOX (3 COLUMNS)
        // ─────────────────────────────────────────────────────────────
        double ytdBoxHeight = 44;
        gfx.DrawRectangle(infoBgBrush, left, y, contentWidth, ytdBoxHeight);
        gfx.DrawRectangle(borderPen, left, y, contentWidth, ytdBoxHeight);

        double ytdCol1 = left + 14;
        double ytdCol2 = left + (contentWidth / 3) + 14;
        double ytdCol3 = left + (contentWidth * 2 / 3) + 14;

        gfx.DrawString($"รายได้สะสมประจำปี (YTD Gross):", fontSmall, darkGrayBrush, new XPoint(ytdCol1, y + 16));
        gfx.DrawString($"฿{ytdGross:N2}", fontBold, navyBrush, new XPoint(ytdCol1, y + 32));

        gfx.DrawString($"ภาษีสะสมประจำปี (YTD Tax):", fontSmall, darkGrayBrush, new XPoint(ytdCol2, y + 16));
        gfx.DrawString($"฿{ytdTax:N2}", fontBold, roseBrush, new XPoint(ytdCol2, y + 32));

        gfx.DrawString($"ประกันสังคมสะสมประจำปี (YTD SSO):", fontSmall, darkGrayBrush, new XPoint(ytdCol3, y + 16));
        gfx.DrawString($"฿{ytdSso:N2}", fontBold, navyBrush, new XPoint(ytdCol3, y + 32));

        y += ytdBoxHeight + 16;

        // ─────────────────────────────────────────────────────────────
        // 6. FOOTER & SECURITY NOTICE
        // ─────────────────────────────────────────────────────────────
        gfx.DrawLine(borderPen, left, y, right, y);
        y += 12;

        gfx.DrawString("🔒 เอกสารนี้เป็นความลับเฉพาะบุคคล และได้รับการคุ้มครองตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)", fontSmall, darkGrayBrush, new XPoint(left, y));
        y += 11;
        gfx.DrawString("• รหัสผ่านในการเปิดไฟล์ PDF คือ: วันเดือนปีเกิด 8 หลัก (ววดดปปปป) หรือเลขบัตรประชาชน 4 หลักสุดท้าย", fontSmall, roseBrush, new XPoint(left, y));
        y += 11;
        gfx.DrawString($"• เอกสารนี้สร้างจากระบบ HRMS อัตโนมัติเมื่อ {DateTime.Now:dd/MM/yyyy HH:mm:ss} ไม่จำเป็นต้องลงนาม", fontSmall, darkGrayBrush, new XPoint(left, y));

        using var ms = new MemoryStream();
        doc.Save(ms);
        return ms.ToArray();
    }

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
