using PdfSharpCore.Drawing;

namespace Hrms.Infrastructure.Services.PayslipPdf;

/// <summary>
/// สี / ฟอนต์ / ระยะ ของสลิปเงินเดือน — แก้หน้าตาสลิปทั้งใบที่ไฟล์นี้ที่เดียว
/// (สีหลักให้ตรงกับหน้าเว็บ: --color-primary #0B2046 ใน frontend/src/app/globals.css)
/// </summary>
internal static class PayslipTheme
{
    // ===== ฟอนต์ =====
    public const string FontFamily = "Tahoma";
    public static readonly XFont CompanyName = new(FontFamily, 12, XFontStyle.Bold);
    public static readonly XFont CompanySmall = new(FontFamily, 7.5, XFontStyle.Regular);
    public static readonly XFont Title = new(FontFamily, 12, XFontStyle.Bold);
    public static readonly XFont SubTitle = new(FontFamily, 8, XFontStyle.Regular);
    public static readonly XFont Bold = new(FontFamily, 8.5, XFontStyle.Bold);
    public static readonly XFont Regular = new(FontFamily, 8.5, XFontStyle.Regular);
    public static readonly XFont Small = new(FontFamily, 7.5, XFontStyle.Regular);
    public static readonly XFont NetAmount = new(FontFamily, 14, XFontStyle.Bold);

    // ===== สี =====
    public static readonly XColor PrimaryColor = XColor.FromArgb(11, 32, 70);        // #0B2046
    public static readonly XSolidBrush Primary = new(PrimaryColor);
    public static readonly XSolidBrush TextStrong = new(XColor.FromArgb(15, 23, 42)); // #0F172A
    public static readonly XSolidBrush TextMuted = new(XColor.FromArgb(71, 85, 105)); // #475569
    public static readonly XSolidBrush Text = new(XColor.FromArgb(51, 65, 85));       // #334155
    public static readonly XSolidBrush OnPrimary = new(XColors.White);

    public static readonly XSolidBrush SurfaceSoft = new(XColor.FromArgb(248, 250, 252)); // พื้นกล่องข้อมูล / แถวสลับ
    public static readonly XSolidBrush SurfaceTotal = new(XColor.FromArgb(241, 245, 249)); // แถวรวม
    public static readonly XSolidBrush EarningHeader = new(PrimaryColor);
    public static readonly XSolidBrush DeductionHeader = new(XColor.FromArgb(30, 41, 59)); // #1E293B
    public static readonly XSolidBrush NetBackground = new(XColor.FromArgb(235, 245, 251));

    public static readonly XPen Border = new(XColor.FromArgb(203, 213, 225), 1);          // #CBD5E1
    public static readonly XPen Divider = new(PrimaryColor, 1.2);
    public static readonly XPen NetBorder = new(XColor.FromArgb(14, 116, 144), 1.5);      // #0E7490

    // ===== ระยะ (หน่วย point) =====
    public const double Margin = 36;
    public const double SectionGap = 14;
    public const double CellPadding = 8;
    public const double TableHeaderHeight = 22;
    public const double TableRowHeight = 18;
    public const double TableTotalHeight = 24;
    public const int TableMinRows = 6;
}
