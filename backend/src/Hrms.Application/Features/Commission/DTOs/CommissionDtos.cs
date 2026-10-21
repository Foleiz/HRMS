using System;
using System.Collections.Generic;

namespace Hrms.Application.Features.Commission.DTOs;

public class CommissionRecordDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal SalesAmount { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal SpecialAmount { get; set; }
    public decimal TotalCommission { get; set; }
    public string CalculationMode { get; set; } = "PERCENTAGE";
    public string Status { get; set; } = "DRAFT";
    public string? Note { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
}

public class CommissionPeriodSummaryDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalEmployees { get; set; }
    public decimal TotalSalesAmount { get; set; }
    public decimal TotalCommissionAmount { get; set; }
    public decimal DefaultRate { get; set; } = 3.00m;
    public string Status { get; set; } = "DRAFT"; // DRAFT, CONFIRMED, PAID
    public List<CommissionRecordDto> Records { get; set; } = new();
}

public class UpdateCommissionItemRequest
{
    public decimal? SalesAmount { get; set; }
    public decimal? CommissionRate { get; set; }
    public decimal? SpecialAmount { get; set; }
    public string? Note { get; set; }
}

public class AddManualCommissionRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
    public long EmployeeId { get; set; }
    public decimal SalesAmount { get; set; }
    public decimal CommissionRate { get; set; } = 3.00m;
    public decimal SpecialAmount { get; set; } = 0;
    public string? Note { get; set; }
    public bool Accumulate { get; set; } = true;
}

public class ConfirmCommissionRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
}

public class CommissionPreviewItemDto
{
    public long? EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string DateFrom { get; set; } = string.Empty;
    public string DateTo { get; set; } = string.Empty;
    public decimal SalesAmount { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal SpecialAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public int ExistingOverlappingEntries { get; set; }
    public bool IsValid { get; set; } = true;
    public string? ErrorMessage { get; set; }
}

public class CommissionPreviewResultDto
{
    public string FileName { get; set; } = string.Empty;
    public string FileHash { get; set; } = string.Empty;
    public string DetectedType { get; set; } = "MONTH"; // MONTH, DAY, RANGE
    public string DetectedTypeLabel { get; set; } = string.Empty;
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public int TargetYear { get; set; }
    public int TargetMonth { get; set; }
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public int EmployeeCount { get; set; }
    public decimal TotalSalesAmount { get; set; }
    public decimal TotalCommissionAmount { get; set; }
    public int ReplacedEntriesCount { get; set; }
    public bool IsLockedPeriod { get; set; }
    public string? LockReason { get; set; }
    public List<string> Warnings { get; set; } = new();
    public List<CommissionPreviewItemDto> PreviewRows { get; set; } = new();
}

public class ImportCommissionResultDto
{
    public long BatchId { get; set; }
    public string DetectedType { get; set; } = "MONTH";
    public string DetectedTypeLabel { get; set; } = string.Empty;
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public int TotalRowsInFile { get; set; }
    public int TotalImported { get; set; }
    public int SuccessCount { get; set; }
    public int UpdatedCount { get; set; }
    public int ReplacedCount { get; set; }
    public int SkippedCount { get; set; }
    public decimal TotalSalesAmount { get; set; }
    public decimal TotalCommissionAmount { get; set; }
    public List<string> Warnings { get; set; } = new();
    public CommissionPeriodSummaryDto Summary { get; set; } = null!;
}

public class CommissionBatchDto
{
    public long Id { get; set; }
    public string? FileName { get; set; }
    public string? FileHash { get; set; }
    public string DetectedType { get; set; } = "MONTH";
    public string DetectedTypeLabel { get; set; } = string.Empty;
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailedRows { get; set; }
    public int EmployeeCount { get; set; }
    public int ReplacedEntries { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "IMPORTED";
    public string? ImportedByUserName { get; set; }
    public DateTime ImportedAt { get; set; }
    public DateTime? RevertedAt { get; set; }
    public string? RevertedByUserName { get; set; }
}

public class PagedCommissionBatchResult
{
    public List<CommissionBatchDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public class RevertCommissionBatchResultDto
{
    public long BatchId { get; set; }
    public string? FileName { get; set; }
    public int RevertedEntriesCount { get; set; }
    public int RestoredEntriesCount { get; set; }
    public int AffectedEmployeesCount { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class CommissionBatchEntryDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? PositionName { get; set; }
    public string DateFrom { get; set; } = string.Empty;
    public string DateTo { get; set; } = string.Empty;
    public decimal SalesAmount { get; set; }
    public decimal CommissionRate { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal SpecialAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime CreatedAt { get; set; }
    public string? BatchFileName { get; set; }
    public string Source { get; set; } = "FILE";
}

