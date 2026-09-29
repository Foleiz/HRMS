namespace Hrms.Application.Features.Leave.DTOs;

public record LeaveRequestDto
{
    public long Id { get; init; }
    public string RequestNo { get; init; } = string.Empty;
    
    public long EmployeeId { get; init; }
    public string EmployeeCode { get; init; } = string.Empty;
    public string EmployeeName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;

    public long LeaveTypeId { get; init; }
    public string LeaveTypeCode { get; init; } = string.Empty;
    public string LeaveTypeName { get; init; } = string.Empty;

    public DateTime StartDatetime { get; init; }
    public DateTime EndDatetime { get; init; }
    public decimal LeaveHours { get; init; }
    public decimal LeaveDays { get; init; }
    public string? Reason { get; init; }
    public string? ContactDuringLeave { get; init; }
    public string Status { get; init; } = "PENDING";
    public DateTime? SubmittedAt { get; init; }
    public DateTime? CancelledAt { get; init; }
    public string? CancelReason { get; init; }
    public string? RejectReason { get; init; }

    // Approval Workflow Engine Integration
    public long? ApprovalInstanceId { get; init; }
    public int? CurrentStepNo { get; init; }
    public int TotalSteps { get; init; }
    public string? CurrentApproverDisplay { get; init; }
    public bool IsMyTurnToApprove { get; init; }
    public bool HasAlreadyApproved { get; init; }
    public string? ApprovedByName { get; init; }
    public DateTime? ApprovedAt { get; init; }

    public List<LeaveRequestDocumentDto> Documents { get; init; } = new();
}

public record ApproveLeaveRequestPayload
{
    public string? Comment { get; init; }
}

public record LeaveRequestDocumentDto
{
    public long Id { get; init; }
    public long LeaveRequestId { get; init; }
    public string? FileName { get; init; }
    public DateTime UploadedAt { get; init; }
}

public record CreateLeaveRequestDto
{
    public long EmployeeId { get; init; }
    public long LeaveTypeId { get; init; }
    public DateTime StartDatetime { get; init; }
    public DateTime EndDatetime { get; init; }
    public decimal LeaveHours { get; init; }
    public decimal LeaveDays { get; init; }
    public string? Reason { get; init; }
    public string? ContactDuringLeave { get; init; }
    public string? AttachmentFileName { get; init; }
    public byte[]? AttachmentData { get; init; }

    /// <summary>
    /// true = บันทึกเป็นแบบร่าง (Status = DRAFT, ไม่ตรวจสอบโควตาวันลาคงเหลือ, ไม่ตั้ง SubmittedAt)
    /// false = ยื่นจริง (Status = PENDING, ตรวจสอบโควตา, ตั้ง SubmittedAt)
    /// </summary>
    public bool IsDraft { get; init; } = false;
}

public record LeaveStatsDto
{
    public int PendingRequestsCount { get; init; }
    public int ApprovedThisMonthCount { get; init; }
    public int RejectedThisMonthCount { get; init; }
    public decimal TotalLeaveDaysThisMonth { get; init; }
}

/// <summary>ผลการคำนวณจำนวนวันลา (นับเฉพาะวันทำงานตามวันทำงานประจำสัปดาห์ และไม่นับวันหยุดบริษัท)</summary>
public class LeaveDaysCalculationDto
{
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool IsHalfDay { get; set; }
    /// <summary>จำนวนวันตามปฏิทิน (รวมวันหยุด)</summary>
    public int CalendarDays { get; set; }
    /// <summary>จำนวนวันที่ไม่ใช่วันทำงานตามวันทำงานประจำสัปดาห์ (เช่น เสาร์–อาทิตย์)</summary>
    public int NonWorkingDays { get; set; }
    /// <summary>วันหยุดบริษัท/นักขัตฤกษ์ที่อยู่ในช่วงลา (ไม่นับเป็นวันลา)</summary>
    public List<LeaveHolidayDto> Holidays { get; set; } = new();
    /// <summary>วันที่ที่นับเป็นวันลา (yyyy-MM-dd)</summary>
    public List<string> WorkingDates { get; set; } = new();
    public decimal LeaveDays { get; set; }
    public decimal LeaveHours { get; set; }
}

public class LeaveHolidayDto
{
    public string Date { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

/// <summary>ผลตรวจกฎการลาก่อนยื่น (ใช้ทั้งหน้าฟอร์ม และตอนยื่นจริงฝั่ง server)</summary>
public class LeaveValidationResultDto
{
    public decimal LeaveDays { get; set; }
    public bool IsValid => Errors.Count == 0;
    public List<string> Errors { get; set; } = new();
    /// <summary>ต้องแนบเอกสารประกอบสำหรับคำขอนี้หรือไม่ (ตามนโยบาย)</summary>
    public bool RequiresDocument { get; set; }
    /// <summary>สรุปนโยบายที่ใช้กับพนักงาน (แสดงในฟอร์ม)</summary>
    public string? PolicySummary { get; set; }
}
