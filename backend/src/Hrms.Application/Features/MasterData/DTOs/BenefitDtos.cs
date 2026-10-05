namespace Hrms.Application.Features.MasterData.DTOs;

public class BenefitItemDto
{
    public long Id { get; set; }
    public string BenefitCode { get; set; } = string.Empty;
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public bool IsStatutory { get; set; }
    public bool IsDocumentRequired { get; set; } = false;
    public decimal DefaultCoverageAmount { get; set; } = 0;
    public string DefaultFrequency { get; set; } = "YEARLY";
    public string PayoutType { get; set; } = "REIMBURSEMENT"; // REIMBURSEMENT, PAYROLL, IN_KIND
    public string Status { get; set; } = "ACTIVE";
    public int AssignedTypesCount { get; set; }
    /// <summary>รายการได้-หักที่ใช้จ่ายสวัสดิการนี้ (ภาษี/ประกันสังคมตั้งที่รายการนั้น)</summary>
    public long? PayrollItemId { get; set; }
    public string? PayrollItemCode { get; set; }
    public string? PayrollItemName { get; set; }
    public bool? PayrollItemIsTaxable { get; set; }
    public bool? PayrollItemIsSocialSecurity { get; set; }
    public decimal CoverageAmount { get; set; } = 0;
    public string Frequency { get; set; } = "MONTHLY";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateBenefitItemRequest
{
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? BenefitCode { get; set; }
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public bool IsStatutory { get; set; } = false;
    public bool IsDocumentRequired { get; set; } = false;
    public decimal DefaultCoverageAmount { get; set; } = 0;
    public string DefaultFrequency { get; set; } = "YEARLY";
    public string PayoutType { get; set; } = "REIMBURSEMENT";
    public string Status { get; set; } = "ACTIVE";
    /// <summary>ไม่ส่ง = ระบบสร้างรหัสรายได้ BEN_xxx ให้</summary>
    public long? PayrollItemId { get; set; }
}

public class UpdateBenefitItemRequest
{
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public bool IsStatutory { get; set; }
    public bool IsDocumentRequired { get; set; } = false;
    public decimal DefaultCoverageAmount { get; set; } = 0;
    public string DefaultFrequency { get; set; } = "YEARLY";
    public string PayoutType { get; set; } = "REIMBURSEMENT";
    public string Status { get; set; } = "ACTIVE";
    /// <summary>ไม่ส่ง = คงรายการเดิม</summary>
    public long? PayrollItemId { get; set; }
}


public class EmployeeBenefitUsageSummaryDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? EmployeeType { get; set; }
    public int Year { get; set; }
    public decimal TotalQuotaAmount { get; set; }
    public decimal TotalUsedAmount { get; set; }
    public decimal TotalRemainingAmount { get; set; }
    public decimal OverallUsagePercent { get; set; }
    public int TotalBenefitsCount { get; set; }
    public int MaxedOutBenefitsCount { get; set; }
    public List<BenefitUsageItemDto> Benefits { get; set; } = new();
}

public class EmployeeBenefitOverviewDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionTitle { get; set; }
    public string? EmployeeTypeName { get; set; }
    public int Year { get; set; }
    public int TotalBenefitsCount { get; set; }
    public decimal TotalQuota { get; set; }
    public decimal TotalUsed { get; set; }
    public decimal TotalRemaining { get; set; }
    public List<BenefitUsageItemDto> Benefits { get; set; } = new();
}

public class BenefitUsageItemDto
{
    public long BenefitItemId { get; set; }
    public string BenefitCode { get; set; } = string.Empty;
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public string PayoutType { get; set; } = "REIMBURSEMENT";
    public bool IsDocumentRequired { get; set; } = false;
    public decimal QuotaAmount { get; set; }
    public string Frequency { get; set; } = "YEARLY";
    public decimal UsedAmount { get; set; }
    /// <summary>ยอดที่ยื่นเบิกแล้วรออนุมัติ (กันวงเงินไว้แล้ว)</summary>
    public decimal PendingAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal UsagePercentage { get; set; }
    public bool IsMaxedOut { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public int ClaimCount { get; set; }
    public DateOnly? LastClaimDate { get; set; }
}

public class BenefitClaimDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public long BenefitItemId { get; set; }
    public string BenefitCode { get; set; } = string.Empty;
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ClaimYear { get; set; }
    public DateOnly ClaimDate { get; set; }
    public decimal Amount { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ServiceProvider { get; set; }
    public string? Remarks { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentUrl { get; set; }
    public string Status { get; set; } = "APPROVED";
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? RequestNo { get; set; }
    public string? RejectReason { get; set; }
    public string? FileName { get; set; }
    /// <summary>true = พนักงานยื่นเบิกเอง / false = ฝ่ายบุคคลบันทึกให้</summary>
    public bool IsSelfRequest { get; set; }
    /// <summary>UNPAID / IN_PAYROLL / PAID / NOT_APPLICABLE (IN_PAYROLL ในรอบที่ล็อกแล้วแสดงเป็น PAID)</summary>
    public string? PaymentStatus { get; set; }
    public int? PayrollPeriodYear { get; set; }
    public int? PayrollPeriodMonth { get; set; }
}

/// <summary>พนักงานยื่นเบิกสวัสดิการเอง (ESS)</summary>
public class SubmitBenefitClaimRequest
{
    public long BenefitItemId { get; set; }
    public string? ClaimDate { get; set; }
    public decimal Amount { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ServiceProvider { get; set; }
    public string? Remarks { get; set; }
    public string? FileName { get; set; }
    /// <summary>ไฟล์ใบเสร็จแบบ base64 (data URL ได้)</summary>
    public string? FileData { get; set; }
}

public class ReviewBenefitClaimRequest
{
    public string? Comment { get; set; }
}

/// <summary>คำขอเบิกสวัสดิการสำหรับหน้าอนุมัติ / รายการของฉัน</summary>
public class BenefitClaimRequestDto
{
    public long Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = "-";
    public string PositionName { get; set; } = "-";
    public long BenefitItemId { get; set; }
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ClaimDate { get; set; } = string.Empty;
    public int ClaimYear { get; set; }
    public decimal Amount { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ServiceProvider { get; set; }
    public string? Remarks { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    /// <summary>วงเงินต่อปีตามประเภทพนักงาน (0 = ไม่จำกัด)</summary>
    public decimal QuotaAmount { get; set; }
    /// <summary>ยอดอนุมัติแล้วในปีเดียวกัน (ไม่รวมคำขอนี้)</summary>
    public decimal ApprovedUsedAmount { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime SubmittedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }
    public int? CurrentStepNo { get; set; }
    public int TotalSteps { get; set; }
    public string? CurrentApproverDisplay { get; set; }
    public bool IsMyTurnToApprove { get; set; }
    public bool HasAlreadyApproved { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectReason { get; set; }
    public bool CanCancel { get; set; }
}

public class BenefitClaimAttachment
{
    public string FileName { get; set; } = "receipt";
    public string MimeType { get; set; } = "application/octet-stream";
    public byte[] Data { get; set; } = Array.Empty<byte>();
}

public class CreateBenefitClaimRequest
{
    public long EmployeeId { get; set; }
    public long BenefitItemId { get; set; }
    public int? ClaimYear { get; set; }
    public DateOnly? ClaimDate { get; set; }
    public decimal Amount { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ServiceProvider { get; set; }
    public string? Remarks { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentUrl { get; set; }
    /// <summary>true (ค่าเริ่มต้น) = จ่ายผ่านเงินเดือนรอบถัดไป / false = จ่ายนอกระบบไปแล้ว</summary>
    public bool PayViaPayroll { get; set; } = true;
}

