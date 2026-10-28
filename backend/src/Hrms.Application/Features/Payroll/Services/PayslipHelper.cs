using System.Text.RegularExpressions;
using Hrms.Application.Common.Interfaces;

namespace Hrms.Application.Features.Payroll.Services;

public static class PayslipHelper
{
    public static readonly string[] AllowedPeriodStatuses =
    {
        "APPROVED", "PROCESSING", "PROCESSING_BANK", "PAID", "CLOSED"
    };

    public record PayslipPasswordInfo(string Password, string Hint);

    public static PayslipPasswordInfo ResolvePassword(
        string? protectedCitizenId,
        DateOnly? birthDate,
        string? employeeCode,
        IAesEncryptionService? encryptionService)
    {
        string rawCitizenId = !string.IsNullOrWhiteSpace(protectedCitizenId) && encryptionService != null
            ? encryptionService.UnprotectText(protectedCitizenId)
            : (protectedCitizenId ?? string.Empty);

        string digits = Regex.Replace(rawCitizenId, @"\D", "");
        if (digits.Length >= 4)
        {
            return new PayslipPasswordInfo(digits[^4..], "เลขประจำตัวประชาชน 4 หลักสุดท้าย");
        }
        else if (birthDate.HasValue)
        {
            var birth = birthDate.Value;
            int beYear = birth.Year > 2400 ? birth.Year : birth.Year + 543;
            return new PayslipPasswordInfo($"{birth:ddMM}{beYear}", "วันเดือนปีเกิด (วันวันเดือนเดือนปี พ.ศ. 4 หลัก เช่น 15052531)");
        }
        else
        {
            return new PayslipPasswordInfo(!string.IsNullOrWhiteSpace(employeeCode) ? employeeCode : "1234", "รหัสพนักงาน");
        }
    }

    public static PayslipPasswordInfo ResolvePassword(
        string? protectedCitizenId,
        DateTime? birthDate,
        string? employeeCode,
        IAesEncryptionService? encryptionService)
    {
        DateOnly? d = birthDate.HasValue ? DateOnly.FromDateTime(birthDate.Value) : null;
        return ResolvePassword(protectedCitizenId, d, employeeCode, encryptionService);
    }

    public static string MaskAccountNumber(string? account)
    {
        if (string.IsNullOrWhiteSpace(account)) return "-";
        var cleaned = account.Trim();
        return cleaned.Length >= 4
            ? $"xxx-xxx-{cleaned[^4..^2]}-{cleaned[^1..]}"
            : cleaned;
    }

    public static int EarningOrder(string? code) => code switch
    {
        "INC_BASE" => 0,
        "INC_POSITION" => 1,
        "INC_OT" => 2,
        "INC_BONUS" => 8,
        "INC_COMMISSION" => 9,
        _ => 5,
    };

    public static int DeductionOrder(string? code) => code switch
    {
        "DED_SSO" => 0,
        "DED_TAX" => 1,
        "DED_PVD" => 2,
        _ => 5,
    };
}
