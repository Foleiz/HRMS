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
}

