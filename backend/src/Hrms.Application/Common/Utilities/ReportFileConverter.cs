using System.Globalization;
using System.Text;
using MiniExcelLibs;

namespace Hrms.Application.Common.Utilities;

/// <summary>
/// แปลงไฟล์รายงาน CSV (ที่ระบบสร้างเอง) เป็น Excel (.xlsx) — ใช้ร่วมกันทุกรายงาน
/// ตัวเลขแปลงเป็นตัวเลขจริงใน Excel ส่วนรหัส/เลขบัตร/ค่าที่ขึ้นต้นด้วย 0 คงเป็นข้อความ
/// </summary>
public static class ReportFileConverter
{
    public const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static byte[] CsvToXlsx(byte[] csvBytes, string sheetName = "รายงาน")
    {
        var text = Encoding.UTF8.GetString(csvBytes).TrimStart('﻿');
        var rows = ParseCsv(text);
        var cols = rows.Count == 0 ? 1 : Math.Max(1, rows.Max(r => r.Count));
        var keys = Enumerable.Range(0, cols).Select(ColumnName).ToArray();

        var data = new List<IDictionary<string, object?>>(rows.Count);
        foreach (var r in rows)
        {
            var d = new Dictionary<string, object?>(cols);
            for (var i = 0; i < cols; i++)
                d[keys[i]] = i < r.Count ? ToCell(r[i]) : null;
            data.Add(d);
        }

        using var ms = new MemoryStream();
        ms.SaveAs(data, printHeader: false, sheetName: SafeSheetName(sheetName), excelType: ExcelType.XLSX);
        return ms.ToArray();
    }

    private static object? ToCell(string raw)
    {
        var s = raw.Trim();
        if (s.Length == 0) return null;
        var digitsOnly = s.All(char.IsDigit);
        // รหัส/เลขบัตร/เลขบัญชี: ตัวเลขล้วนยาว หรือขึ้นต้นด้วย 0 -> คงเป็นข้อความ
        if (digitsOnly && (s.Length >= 10 || (s.Length > 1 && s[0] == '0'))) return s;
        if (decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var n)) return n;
        return s;
    }

    private static string ColumnName(int index)
    {
        var name = string.Empty;
        index++;
        while (index > 0)
        {
            var m = (index - 1) % 26;
            name = (char)('A' + m) + name;
            index = (index - m) / 26;
        }
        return name;
    }

    private static string SafeSheetName(string name)
    {
        var cleaned = new string(name.Where(c => "[]:*?/\\".IndexOf(c) < 0).ToArray()).Trim();
        if (cleaned.Length == 0) cleaned = "Sheet1";
        return cleaned.Length > 31 ? cleaned[..31] : cleaned;
    }

    /// <summary>อ่าน CSV แบบ RFC 4180 (รองรับเครื่องหมายคำพูด, จุลภาค และขึ้นบรรทัดใหม่ในช่อง)</summary>
    private static List<List<string>> ParseCsv(string text)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var cell = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < text.Length && text[i + 1] == '"') { cell.Append('"'); i++; }
                    else inQuotes = false;
                }
                else cell.Append(c);
                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    break;
                case ',':
                    row.Add(cell.ToString());
                    cell.Clear();
                    break;
                case '\r':
                    break;
                case '\n':
                    row.Add(cell.ToString());
                    cell.Clear();
                    rows.Add(row);
                    row = new List<string>();
                    break;
                default:
                    cell.Append(c);
                    break;
            }
        }

        if (cell.Length > 0 || row.Count > 0)
        {
            row.Add(cell.ToString());
            rows.Add(row);
        }
        return rows;
    }
}
