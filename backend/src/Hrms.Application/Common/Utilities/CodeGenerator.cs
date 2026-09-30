using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Utilities;

/// <summary>
/// สร้างรหัสรันอัตโนมัติ เช่น DIV001, DEP001, POS001
/// หาเลขมากสุดของรหัสที่ขึ้นต้นด้วย prefix แล้ว +1 (จำนวนหลักเป็นขั้นต่ำ — เกินแล้วเพิ่มหลักเอง เช่น DIV999 → DIV1000)
/// รหัสเดิมที่ไม่ตรงรูปแบบ (เช่น DIV_HR) ไม่นับ และไม่ถูกเปลี่ยน
/// </summary>
public static class CodeGenerator
{
    public static async Task<string> NextAsync(
        IQueryable<string> codes, string prefix, int digits, CancellationToken cancellationToken = default)
    {
        var candidates = await codes
            .Where(c => c.StartsWith(prefix))
            .ToListAsync(cancellationToken);

        var pattern = new Regex("^" + Regex.Escape(prefix) + @"(\d+)$", RegexOptions.IgnoreCase);
        int max = 0;
        foreach (var code in candidates)
        {
            var m = pattern.Match(code.Trim());
            if (m.Success && int.TryParse(m.Groups[1].Value, out var n) && n > max) max = n;
        }
        return prefix + (max + 1).ToString("D" + digits);
    }
}
