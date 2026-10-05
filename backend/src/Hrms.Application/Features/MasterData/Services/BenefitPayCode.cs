using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

/// <summary>
/// การผูกสวัสดิการกับรายการได้-หัก (Pay Code) — สวัสดิการบอก "ใครได้ เท่าไหร่",
/// รายการได้-หักบอก "บรรทัดบนสลิปคิดภาษี/ประกันสังคมยังไง"
/// </summary>
public static class BenefitPayCode
{
    /// <summary>รหัสที่ระบบคำนวณเอง — ผูกกับสวัสดิการไม่ได้</summary>
    public static readonly string[] SystemItemCodes = { "INC_BASE", "INC_OT", "DED_SSO", "DED_TAX", "DED_UNPAID_LEAVE", "INC_BONUS" };

    public const string PaymentUnpaid = "UNPAID";
    public const string PaymentInPayroll = "IN_PAYROLL";
    public const string PaymentPaid = "PAID";
    public const string PaymentNotApplicable = "NOT_APPLICABLE";

    /// <summary>สถานะรอบเงินเดือนที่ถือว่าจ่าย/ล็อกแล้ว</summary>
    public static readonly string[] LockedPeriodStatuses = { "APPROVED", "PROCESSING", "PAID", "CLOSED" };

    /// <summary>สถานะการจ่ายตั้งต้นเมื่อคำขอเบิกอนุมัติ</summary>
    public static string InitialPaymentStatus(string? payoutType) =>
        string.Equals(payoutType, "IN_KIND", StringComparison.OrdinalIgnoreCase) ? PaymentNotApplicable : PaymentUnpaid;

    /// <summary>ค่าเริ่มต้นการคิดภาษีของรหัสที่สร้างให้อัตโนมัติ — ค่ารักษาพยาบาลตามระเบียบสวัสดิการได้รับยกเว้น</summary>
    public static bool DefaultTaxable(BenefitItem benefit) => !string.Equals(benefit.Category, "HEALTH", StringComparison.OrdinalIgnoreCase);

    /// <summary>ตรวจว่ารายการได้-หักนี้ใช้เป็นรหัสจ่ายของสวัสดิการได้</summary>
    public static void ValidateLinkable(PayrollItem item)
    {
        if (item.ItemType != "EARNING")
            throw new ValidationException("สวัสดิการต้องจ่ายผ่านรายการประเภทรายได้");
        if (item.Status != "ACTIVE")
            throw new ValidationException($"รายการ '{item.ItemName}' ถูกปิดใช้งานแล้ว");
        if (SystemItemCodes.Contains(item.ItemCode))
            throw new ValidationException($"รายการ '{item.ItemName}' เป็นรายการที่ระบบคำนวณเอง ผูกกับสวัสดิการไม่ได้");
        if (item.CalculationType == "FIXED" || (item.CalculationType == "FORMULA" && !string.IsNullOrWhiteSpace(item.FormulaTemplate)))
            throw new ValidationException($"รายการ '{item.ItemName}' คำนวณยอดเองอยู่แล้ว (ยอดคงที่/สูตร) — เลือกรายการแบบกรอกเอง หรือให้ระบบสร้างรหัสใหม่");
    }

    /// <summary>
    /// รหัสจ่ายของสวัสดิการ: ใช้ที่ผูกไว้ ถ้ายังไม่ผูกจะใช้/สร้าง BEN_&lt;รหัสสวัสดิการ&gt; แล้วผูกให้
    /// </summary>
    public static async Task<PayrollItem> EnsureAsync(IHrmsDbContext context, BenefitItem benefit, CancellationToken cancellationToken)
    {
        if (benefit.PayrollItemId.HasValue)
        {
            var linked = await context.PayrollItems.FirstOrDefaultAsync(p => p.Id == benefit.PayrollItemId.Value, cancellationToken);
            if (linked != null) return linked;
        }

        var code = $"BEN_{benefit.BenefitCode.ToUpperInvariant()}";
        var item = await context.PayrollItems.FirstOrDefaultAsync(p => p.ItemCode == code, cancellationToken);
        if (item == null)
        {
            item = new PayrollItem
            {
                ItemCode = code,
                ItemName = benefit.BenefitName,
                Description = $"สวัสดิการพนักงาน: {benefit.Description ?? benefit.BenefitName}",
                ItemType = "EARNING",
                CalculationType = "MANUAL",
                FormulaTemplate = null,
                FormulaValue = null,
                IsTaxable = DefaultTaxable(benefit),
                IsSocialSecurityCalculated = false,
                Status = "ACTIVE"
            };
            context.PayrollItems.Add(item);
            await context.SaveChangesAsync(cancellationToken);
        }

        // ผูกให้ถาวร (benefit อาจเป็น AsNoTracking)
        await context.BenefitItems
            .Where(b => b.Id == benefit.Id && b.PayrollItemId == null)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.PayrollItemId, item.Id), cancellationToken);
        benefit.PayrollItemId = item.Id;
        return item;
    }
}
