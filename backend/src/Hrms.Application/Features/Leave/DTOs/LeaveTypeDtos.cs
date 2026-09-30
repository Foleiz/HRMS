namespace Hrms.Application.Features.Leave.DTOs;

public record LeaveTypeDto
{
    public long Id { get; init; }
    public string LeaveCode { get; init; } = string.Empty;
    public string LeaveName { get; init; } = string.Empty;
    public string QuotaUnit { get; init; } = "DAY"; // DAY, HOUR, MONTH
    public bool IsPaidLeave { get; init; } = true;
    public string? DocumentDescription { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public string? FormCategory { get; init; }
    /// <summary>จำนวนใบลาที่ใช้ประเภทนี้ (ทุกสถานะ)</summary>
    public int RequestCount { get; init; }
    /// <summary>ลบถาวรได้หรือไม่ (ยังไม่เคยมีใบลา และไม่มีการปรับยอดวันลาด้วยมือ)</summary>
    public bool CanDelete { get; init; } = true;
    /// <summary>เหตุผลที่ลบไม่ได้ (แสดงให้ผู้ใช้)</summary>
    public string? DeleteBlockedReason { get; init; }
}

public record CreateLeaveTypeRequest
{
    public string LeaveCode { get; init; } = string.Empty;
    public string LeaveName { get; init; } = string.Empty;
    public string QuotaUnit { get; init; } = "DAY";
    public bool IsPaidLeave { get; init; } = true;
    public string? DocumentDescription { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public string? FormCategory { get; init; }
    public decimal? DefaultAnnualQuotaDays { get; init; } = 0;
}

public record UpdateLeaveTypeRequest
{
    public string LeaveName { get; init; } = string.Empty;
    public string QuotaUnit { get; init; } = "DAY";
    public bool IsPaidLeave { get; init; } = true;
    public string? DocumentDescription { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public string? FormCategory { get; init; }
}
