using PdfSharpCore;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using T = Hrms.Infrastructure.Services.PayslipPdf.PayslipTheme;

namespace Hrms.Infrastructure.Services.PayslipPdf;

/// <summary>ข้อมูลที่ใช้วาดสลิป 1 ใบ</summary>
internal sealed record PayslipData(
    string CompanyName,
    string CompanyAddress,
    string CompanyPhone,
    string EmployeeCode,
    string EmployeeName,
    string PositionName,
    string DepartmentName,
    string MonthName,
    int ThaiYear,
    string PaymentDateText,
    string BankText,
    decimal TotalGross,
    decimal TotalDeductions,
    decimal NetPay,
    string NetPayText,
    IReadOnlyList<(string Name, decimal Amount)> Earnings,
    IReadOnlyList<(string Name, decimal Amount)> Deductions,
    decimal YtdGross,
    decimal YtdTax,
    decimal YtdSso,
    string Password,
    string PasswordHint);

/// <summary>
/// วาดสลิปเงินเดือน PDF แบ่งเป็นส่วน (Header / EmployeeInfo / ItemTable / NetPay / Ytd / Footer)
/// หน้าตา (สี/ฟอนต์/ระยะ) อยู่ที่ <see cref="PayslipTheme"/>
/// </summary>
internal static class PayslipRenderer
{
    public static byte[] Render(PayslipData d)
    {
        using var doc = new PdfDocument();
        doc.Info.Title = $"ใบแจ้งยอดเงินเดือน {d.MonthName} {d.ThaiYear} - {d.EmployeeName}";
        doc.Info.Author = d.CompanyName;
        doc.Info.Subject = "สลิปเงินเดือนพนักงาน (E-Payslip)";

        if (!string.IsNullOrWhiteSpace(d.Password))
        {
            doc.SecuritySettings.UserPassword = d.Password;
            doc.SecuritySettings.OwnerPassword = Guid.NewGuid().ToString("N");
        }

        var page = doc.AddPage();
        page.Size = PageSize.A4;
        page.Orientation = PageOrientation.Portrait;
        var gfx = XGraphics.FromPdfPage(page);

        double left = T.Margin;
        double right = page.Width - T.Margin;
        double y = T.Margin;

        y = DrawHeader(gfx, d, left, right, y);
        y = DrawEmployeeInfo(gfx, d, left, right, y);

        double colWidth = (right - left - 12) / 2;
        int rows = Math.Max(Math.Max(d.Earnings.Count, d.Deductions.Count), T.TableMinRows);
        double yLeft = DrawItemTable(gfx, "รายการได้ (EARNINGS)", T.EarningHeader, d.Earnings, rows,
            "รวมเงินได้ (Total Earnings)", d.TotalGross, T.Primary, left, colWidth, y);
        DrawItemTable(gfx, "รายการหัก (DEDUCTIONS)", T.DeductionHeader, d.Deductions, rows,
            "รวมเงินหัก (Total Deductions)", d.TotalDeductions, T.TextStrong, left + colWidth + 12, colWidth, y);
        y = yLeft + T.SectionGap;

        y = DrawNetPay(gfx, d, left, right, y);
        y = DrawYtd(gfx, d, left, right, y);
        DrawFooter(gfx, d, left, right, y);

        using var ms = new MemoryStream();
        doc.Save(ms);
        return ms.ToArray();
    }

    // ───────────────────────── ส่วนต่างๆ ของสลิป ─────────────────────────

    private static double DrawHeader(XGraphics gfx, PayslipData d, double left, double right, double y)
    {
        double half = (right - left) / 2;
        DrawFitted(gfx, d.CompanyName, T.CompanyName, T.Primary, left, y, half);
        if (!string.IsNullOrWhiteSpace(d.CompanyAddress))
            DrawFitted(gfx, d.CompanyAddress, T.CompanySmall, T.Text, left, y + 13, half);
        if (!string.IsNullOrWhiteSpace(d.CompanyPhone))
            DrawFitted(gfx, $"โทรศัพท์: {d.CompanyPhone}", T.CompanySmall, T.Text, left, y + 24, half);

        DrawRight(gfx, "ใบแจ้งยอดเงินเดือน / PAYSLIP", T.Title, T.Primary, right, y);
        DrawRight(gfx, "ส่วนบุคคลและเป็นความลับ (CONFIDENTIAL)", T.SubTitle, T.TextMuted, right, y + 13);
        DrawRight(gfx, $"งวดประจำเดือน: {d.MonthName} {d.ThaiYear}", T.Bold, T.Text, right, y + 26);

        y += 38;
        gfx.DrawLine(T.Divider, left, y, right, y);
        return y + 10;
    }

    private static double DrawEmployeeInfo(XGraphics gfx, PayslipData d, double left, double right, double y)
    {
        const double height = 52;
        double width = right - left;
        gfx.DrawRectangle(T.SurfaceSoft, left, y, width, height);
        gfx.DrawRectangle(T.Border, left, y, width, height);

        // 3 คอลัมน์ กว้างเท่ากัน — ค่าที่ยาวเกินจะถูกย่อให้อยู่ในคอลัมน์ ไม่ล้นกรอบ
        double colWidth = (width - 20) / 3;
        double[] cols = { left + 10, left + 10 + colWidth, left + 10 + colWidth * 2 };
        double row1 = y + 15, row2 = y + 33;

        DrawLabelValue(gfx, "รหัสพนักงาน:", d.EmployeeCode, true, cols[0], row1, colWidth);
        DrawLabelValue(gfx, "ชื่อ-นามสกุล:", d.EmployeeName, true, cols[1], row1, colWidth);
        DrawLabelValue(gfx, "วันที่โอนเงิน:", d.PaymentDateText, true, cols[2], row1, colWidth);
        DrawLabelValue(gfx, "ตำแหน่ง:", d.PositionName, false, cols[0], row2, colWidth);
        DrawLabelValue(gfx, "ฝ่าย/แผนก:", d.DepartmentName, false, cols[1], row2, colWidth);
        DrawLabelValue(gfx, "บัญชีธนาคาร:", d.BankText, false, cols[2], row2, colWidth);

        return y + height + T.SectionGap;
    }

    /// <summary>ตารางรายการ (ใช้ทั้งรายการได้และรายการหัก) — คืนค่า y ใต้แถวรวม</summary>
    private static double DrawItemTable(
        XGraphics gfx, string title, XBrush headerBrush,
        IReadOnlyList<(string Name, decimal Amount)> items, int rows,
        string totalLabel, decimal total, XBrush totalBrush,
        double x, double width, double y)
    {
        // หัวตาราง
        gfx.DrawRectangle(headerBrush, x, y, width, T.TableHeaderHeight);
        gfx.DrawString(title, T.Bold, T.OnPrimary, new XPoint(x + T.CellPadding, y + 15));
        DrawRight(gfx, "จำนวนเงิน (บาท)", T.Bold, T.OnPrimary, x + width - T.CellPadding, y + 15);

        // แถวรายการ
        double top = y + T.TableHeaderHeight;
        double bodyHeight = rows * T.TableRowHeight;
        gfx.DrawRectangle(T.Border, x, top, width, bodyHeight);
        for (int i = 0; i < rows; i++)
        {
            double rowY = top + i * T.TableRowHeight;
            if (i % 2 == 1) gfx.DrawRectangle(T.SurfaceSoft, x + 1, rowY, width - 2, T.TableRowHeight);
            if (i >= items.Count) continue;

            string amount = items[i].Amount.ToString("N2");
            double amountWidth = gfx.MeasureString(amount, T.Regular).Width;
            DrawFitted(gfx, items[i].Name, T.Regular, T.Text, x + T.CellPadding, rowY + 12, width - amountWidth - T.CellPadding * 3);
            DrawRight(gfx, amount, T.Regular, T.Text, x + width - T.CellPadding, rowY + 12);
        }

        // แถวรวม
        double totalY = top + bodyHeight;
        gfx.DrawRectangle(T.SurfaceTotal, x, totalY, width, T.TableTotalHeight);
        gfx.DrawRectangle(T.Border, x, totalY, width, T.TableTotalHeight);
        gfx.DrawString(totalLabel, T.Bold, totalBrush, new XPoint(x + T.CellPadding, totalY + 16));
        DrawRight(gfx, total.ToString("N2"), T.Bold, totalBrush, x + width - T.CellPadding, totalY + 16);

        return totalY + T.TableTotalHeight;
    }

    private static double DrawNetPay(XGraphics gfx, PayslipData d, double left, double right, double y)
    {
        const double height = 56;
        gfx.DrawRectangle(T.NetBackground, left, y, right - left, height);
        gfx.DrawRectangle(T.NetBorder, left, y, right - left, height);

        gfx.DrawString("เงินได้สุทธิ / NET PAYABLE SALARY", T.Bold, T.Primary, new XPoint(left + 14, y + 22));
        DrawFitted(gfx, $"( {d.NetPayText} )", T.Small, T.Text, left + 14, y + 42, (right - left) * 0.6);
        DrawRight(gfx, $"฿{d.NetPay:N2}", T.NetAmount, T.Primary, right - 14, y + 34);

        return y + height + T.SectionGap;
    }

    private static double DrawYtd(XGraphics gfx, PayslipData d, double left, double right, double y)
    {
        const double height = 44;
        double width = right - left;
        gfx.DrawRectangle(T.SurfaceSoft, left, y, width, height);
        gfx.DrawRectangle(T.Border, left, y, width, height);

        (string Label, decimal Value)[] cells =
        {
            ("รายได้สะสมประจำปี (YTD Gross):", d.YtdGross),
            ("ภาษีสะสมประจำปี (YTD Tax):", d.YtdTax),
            ("ประกันสังคมสะสมประจำปี (YTD SSO):", d.YtdSso),
        };
        for (int i = 0; i < cells.Length; i++)
        {
            double cx = left + width * i / 3 + 14;
            gfx.DrawString(cells[i].Label, T.Small, T.Text, new XPoint(cx, y + 16));
            gfx.DrawString($"฿{cells[i].Value:N2}", T.Bold, T.Primary, new XPoint(cx, y + 32));
        }
        return y + height + 16;
    }

    private static void DrawFooter(XGraphics gfx, PayslipData d, double left, double right, double y)
    {
        gfx.DrawLine(T.Border, left, y, right, y);
        y += 12;
        string[] lines =
        {
            "• เอกสารนี้เป็นความลับเฉพาะบุคคล และได้รับการคุ้มครองตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
            $"• รหัสผ่านในการเปิดไฟล์ PDF คือ: {d.PasswordHint}",
            $"• เอกสารนี้สร้างจากระบบ HRMS อัตโนมัติเมื่อ {DateTime.Now:dd/MM/yyyy HH:mm:ss} ไม่จำเป็นต้องลงนาม",
        };
        foreach (var line in lines)
        {
            DrawFitted(gfx, line, T.Small, T.Text, left, y, right - left);
            y += 11;
        }
    }

    // ───────────────────────── ตัวช่วยวาด ─────────────────────────

    private static void DrawLabelValue(XGraphics gfx, string label, string value, bool strong, double x, double y, double width)
    {
        gfx.DrawString(label, T.Regular, T.Text, new XPoint(x, y));
        double labelWidth = gfx.MeasureString(label + " ", T.Regular).Width;
        DrawFitted(gfx, value, strong ? T.Bold : T.Regular, strong ? T.Primary : T.Text, x + labelWidth, y, width - labelWidth - 6);
    }

    /// <summary>ชิดขวาที่ตำแหน่ง rightX</summary>
    private static void DrawRight(XGraphics gfx, string text, XFont font, XBrush brush, double rightX, double y)
    {
        var size = gfx.MeasureString(text, font);
        gfx.DrawString(text, font, brush, new XPoint(rightX - size.Width, y));
    }

    /// <summary>วาดข้อความให้อยู่ในความกว้างที่กำหนด: ย่อฟอนต์ได้ถึง 80% ถ้ายังยาวเกินจะตัดท้ายด้วย "…"</summary>
    private static void DrawFitted(XGraphics gfx, string text, XFont font, XBrush brush, double x, double y, double maxWidth)
    {
        if (string.IsNullOrEmpty(text) || maxWidth <= 0) return;
        var f = font;
        double minSize = font.Size * 0.8;
        while (gfx.MeasureString(text, f).Width > maxWidth && f.Size > minSize)
            f = new XFont(font.FontFamily.Name, Math.Max(minSize, f.Size - 0.5), font.Style);

        string output = text;
        if (gfx.MeasureString(output, f).Width > maxWidth)
        {
            while (output.Length > 1 && gfx.MeasureString(output + "…", f).Width > maxWidth)
                output = output[..^1];
            output += "…";
        }
        gfx.DrawString(output, f, brush, new XPoint(x, y));
    }
}
