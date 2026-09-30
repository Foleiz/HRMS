using Hrms.Domain.Entities;

namespace Hrms.Application.Features.EmployeeDocuments.Services;

/// <summary>
/// กฎวันหมดอายุของเอกสาร — ใช้ร่วมกันทั้งแฟ้มเอกสาร / คำขอเอกสารทั่วไป / งานแจ้งเตือน
/// </summary>
public static class DocumentExpiry
{
    public const int DefaultNotifyBeforeDays = 30;

    public const string Valid = "VALID";
    public const string ExpiringSoon = "EXPIRING_SOON";
    public const string Expired = "EXPIRED";
    public const string NoExpiry = "NO_EXPIRY";

    /// <summary>วันนี้ตามเวลาไทย</summary>
    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    /// <summary>ไม่ได้ระบุวันหมดอายุ แต่ประเภทเอกสารกำหนดอายุไว้ → คำนวณจากวันที่ออก</summary>
    public static DateOnly? ResolveExpiry(DateOnly? issued, DateOnly? expiry, DocumentType? type)
    {
        if (expiry.HasValue) return expiry;
        if (issued.HasValue && type?.ValidityMonths is > 0)
            return issued.Value.AddMonths(type.ValidityMonths.Value);
        return null;
    }

    public static (string Status, int? DaysToExpiry) GetStatus(DateOnly? expiry, int notifyBeforeDays, DateOnly today)
    {
        if (!expiry.HasValue) return (NoExpiry, null);
        var days = expiry.Value.DayNumber - today.DayNumber;
        var window = notifyBeforeDays > 0 ? notifyBeforeDays : DefaultNotifyBeforeDays;
        if (days < 0) return (Expired, days);
        if (days <= window) return (ExpiringSoon, days);
        return (Valid, days);
    }
}
