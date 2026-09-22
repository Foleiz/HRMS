using System.Text;

namespace Hrms.Application.Common.Helpers;

public static class ThaiBahtTextHelper
{
    private static readonly string[] Digits = { "", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า" };
    private static readonly string[] Units = { "", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน" };

    public static string ToThaiBahtText(decimal amount)
    {
        if (amount == 0) return "ศูนย์บาทถ้วน";

        bool isNegative = amount < 0;
        amount = Math.Abs(Math.Round(amount, 2));

        long baht = (long)Math.Floor(amount);
        int satang = (int)Math.Round((amount - baht) * 100);

        var sb = new StringBuilder();
        if (isNegative) sb.Append("ลบ");

        if (baht > 0)
        {
            sb.Append(ConvertIntegerToThaiText(baht));
            sb.Append("บาท");
        }

        if (satang > 0)
        {
            sb.Append(ConvertIntegerToThaiText(satang));
            sb.Append("สตางค์");
        }
        else
        {
            sb.Append("ถ้วน");
        }

        return sb.ToString();
    }

    private static string ConvertIntegerToThaiText(long number)
    {
        if (number == 0) return "ศูนย์";

        var sb = new StringBuilder();
        string numStr = number.ToString();
        int len = numStr.Length;

        // Process in groups of millions if very large
        if (len > 7)
        {
            int overflow = len - 6;
            long millions = long.Parse(numStr.Substring(0, overflow));
            long remainder = long.Parse(numStr.Substring(overflow));
            sb.Append(ConvertIntegerToThaiText(millions));
            sb.Append("ล้าน");
            if (remainder > 0)
            {
                sb.Append(ConvertIntegerToThaiText(remainder));
            }
            return sb.ToString();
        }

        for (int i = 0; i < len; i++)
        {
            int digit = numStr[i] - '0';
            int unitIdx = len - i - 1;

            if (digit != 0)
            {
                if (unitIdx == 0 && digit == 1 && len > 1)
                {
                    sb.Append("เอ็ด");
                }
                else if (unitIdx == 1 && digit == 1)
                {
                    // "สิบ" instead of "หนึ่งสิบ"
                    sb.Append("สิบ");
                    continue;
                }
                else if (unitIdx == 1 && digit == 2)
                {
                    // "ยี่สิบ" instead of "สองสิบ"
                    sb.Append("ยี่สิบ");
                    continue;
                }
                else
                {
                    sb.Append(Digits[digit]);
                }

                sb.Append(Units[unitIdx]);
            }
        }

        return sb.ToString();
    }
}
