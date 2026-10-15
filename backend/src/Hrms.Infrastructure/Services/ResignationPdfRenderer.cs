using System.Globalization;
using Hrms.Application.Features.Resignation.Services;
using PdfSharpCore;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;

namespace Hrms.Infrastructure.Services;

/// <summary>สร้าง PDF ใบลาออก (A4) สำหรับเก็บเข้าแฟ้มเอกสารพนักงาน — ใช้ฟอนต์ Tahoma แบบเดียวกับสลิปเงินเดือน</summary>
public class ResignationPdfRenderer : IResignationPdfRenderer
{
    private static readonly CultureInfo Thai = new("th-TH");

    public byte[] Render(ResignationDocumentModel m)
    {
        using var doc = new PdfDocument();
        doc.Info.Title = $"ใบลาออก {m.RequestNo} - {m.EmployeeName}";
        doc.Info.Subject = "ใบลาออก";

        var page = doc.AddPage();
        page.Size = PageSize.A4;
        page.Orientation = PageOrientation.Portrait;
        var gfx = XGraphics.FromPdfPage(page);

        var fTitle = new XFont("Tahoma", 16, XFontStyle.Bold);
        var fHead = new XFont("Tahoma", 10.5, XFontStyle.Bold);
        var fLabel = new XFont("Tahoma", 9, XFontStyle.Regular);
        var fValue = new XFont("Tahoma", 10, XFontStyle.Regular);
        var fSmall = new XFont("Tahoma", 8, XFontStyle.Regular);
        var navy = new XSolidBrush(XColor.FromArgb(11, 32, 70));
        var gray = new XSolidBrush(XColor.FromArgb(100, 116, 139));
        var dark = new XSolidBrush(XColor.FromArgb(15, 23, 42));
        var line = new XPen(XColor.FromArgb(203, 213, 225), 0.8);

        double left = 50, right = page.Width.Point - 50, width = right - left;
        double y = 56;

        // หัวเอกสาร
        var title = "ใบลาออก";
        gfx.DrawString(title, fTitle, navy, new XPoint(left + (width - gfx.MeasureString(title, fTitle).Width) / 2, y));
        y += 20;
        var sub = $"เลขที่ {m.RequestNo}  ·  ยื่นเมื่อ {FormatDateTime(m.SubmittedAt)}";
        gfx.DrawString(sub, fLabel, gray, new XPoint(left + (width - gfx.MeasureString(sub, fLabel).Width) / 2, y));
        y += 18;
        gfx.DrawLine(line, left, y, right, y);
        y += 22;

        // ข้อมูลพนักงาน (2 คอลัมน์)
        y = Section(gfx, "ข้อมูลพนักงาน", fHead, navy, left, y);
        double col2 = left + width / 2;
        y = Pair(gfx, fLabel, fValue, gray, dark, left, col2, y,
            ("ชื่อ-นามสกุล", m.EmployeeName), ("รหัสพนักงาน", m.EmployeeCode));
        y = Pair(gfx, fLabel, fValue, gray, dark, left, col2, y,
            ("แผนก", m.DepartmentName ?? "-"), ("ตำแหน่ง", m.PositionName ?? "-"));
        y = Pair(gfx, fLabel, fValue, gray, dark, left, col2, y,
            ("วันทำงานวันสุดท้าย", m.LastWorkingDate.ToString("d MMMM yyyy", Thai)), ("ประเภทเหตุผล", m.ReasonCategory ?? "-"));
        y += 6;

        // เหตุผล / ส่งมอบงาน / ติดต่อ
        y = Section(gfx, "เหตุผลการลาออก", fHead, navy, left, y);
        y = Paragraph(gfx, m.ReasonDetail ?? "-", fValue, dark, left, width, y) + 8;
        y = Section(gfx, "งานที่ต้องส่งมอบ", fHead, navy, left, y);
        y = Paragraph(gfx, string.IsNullOrWhiteSpace(m.Handover) ? "-" : m.Handover!, fValue, dark, left, width, y) + 8;
        y = Section(gfx, "ช่องทางติดต่อหลังลาออก", fHead, navy, left, y);
        y = Paragraph(gfx, string.IsNullOrWhiteSpace(m.ContactAfterResignation) ? "-" : m.ContactAfterResignation!, fValue, dark, left, width, y) + 14;

        // ผลการอนุมัติ
        y = Section(gfx, "ผลการพิจารณา", fHead, navy, left, y);
        if (m.Approvals.Count == 0)
        {
            gfx.DrawString("อนุมัติโดยไม่ผ่านสายอนุมัติ", fValue, dark, new XPoint(left, y));
            y += 16;
        }
        foreach (var a in m.Approvals)
        {
            var decision = a.Decision switch { "APPROVE" => "อนุมัติ", "REJECT" => "ไม่อนุมัติ", "RETURN" => "ส่งกลับ", "CANCEL" => "ยกเลิก", _ => a.Decision };
            var head = $"{(a.StepNo > 0 ? $"ขั้นที่ {a.StepNo} · " : "")}{a.ApproverName} — {decision}";
            gfx.DrawString(head, fValue, dark, new XPoint(left, y));
            var when = FormatDateTime(a.ActionAt);
            gfx.DrawString(when, fLabel, gray, new XPoint(right - gfx.MeasureString(when, fLabel).Width, y));
            y += 14;
            if (!string.IsNullOrWhiteSpace(a.Comment))
                y = Paragraph(gfx, $"ความเห็น: {a.Comment}", fLabel, gray, left + 12, width - 12, y);
            y += 4;
            if (y > page.Height.Point - 80) break;
        }

        // ท้ายเอกสาร
        var foot = $"เอกสารนี้สร้างโดยระบบ HRMS เมื่อ {FormatDateTime(DateTime.UtcNow)}";
        gfx.DrawLine(line, left, page.Height.Point - 50, right, page.Height.Point - 50);
        gfx.DrawString(foot, fSmall, gray, new XPoint(left, page.Height.Point - 36));

        using var ms = new MemoryStream();
        doc.Save(ms, false);
        return ms.ToArray();
    }

    private static string FormatDateTime(DateTime utc) => utc.AddHours(7).ToString("d MMM yyyy HH:mm", Thai) + " น.";

    private static double Section(XGraphics gfx, string text, XFont font, XBrush brush, double left, double y)
    {
        gfx.DrawString(text, font, brush, new XPoint(left, y));
        return y + 18;
    }

    private static double Pair(XGraphics gfx, XFont fLabel, XFont fValue, XBrush gray, XBrush dark,
        double left, double col2, double y, (string Label, string Value) a, (string Label, string Value) b)
    {
        gfx.DrawString(a.Label, fLabel, gray, new XPoint(left, y));
        gfx.DrawString(b.Label, fLabel, gray, new XPoint(col2, y));
        gfx.DrawString(a.Value, fValue, dark, new XPoint(left, y + 14));
        gfx.DrawString(b.Value, fValue, dark, new XPoint(col2, y + 14));
        return y + 34;
    }

    /// <summary>ตัดบรรทัดตามความกว้าง (ภาษาไทยไม่มีเว้นวรรค จึงตัดทีละตัวอักษรเมื่อจำเป็น)</summary>
    private static double Paragraph(XGraphics gfx, string text, XFont font, XBrush brush, double left, double width, double y)
    {
        foreach (var raw in text.Replace("\r", "").Split('\n'))
        {
            var current = string.Empty;
            foreach (var ch in raw)
            {
                var next = current + ch;
                if (gfx.MeasureString(next, font).Width > width && current.Length > 0)
                {
                    // ถอยไปตัดที่ช่องว่างล่าสุดถ้ามี
                    var cut = current.LastIndexOf(' ');
                    if (cut > 0)
                    {
                        gfx.DrawString(current[..cut], font, brush, new XPoint(left, y));
                        current = current[(cut + 1)..] + ch;
                    }
                    else
                    {
                        gfx.DrawString(current, font, brush, new XPoint(left, y));
                        current = ch.ToString();
                    }
                    y += font.Size + 5;
                }
                else current = next;
            }
            gfx.DrawString(current.Length > 0 ? current : " ", font, brush, new XPoint(left, y));
            y += font.Size + 5;
        }
        return y;
    }
}
