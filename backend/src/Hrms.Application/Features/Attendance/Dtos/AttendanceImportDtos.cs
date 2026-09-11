namespace Hrms.Application.Features.Attendance.Dtos;

public class AttendanceImportBatchDto
{
    public long Id { get; set; }
    public string? FileName { get; set; }
    public string? FileHash { get; set; }
    public string? Source { get; set; }
    public string? DeviceName { get; set; }
    public string? UnitName { get; set; }
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public long? ImportedByUserId { get; set; }
    public string? ImportedByUserName { get; set; }
    public DateTime ImportedAt { get; set; }
    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public string Status { get; set; } = "IMPORTED";
}

public class AttendanceImportErrorDto
{
    public long Id { get; set; }
    public long ImportBatchId { get; set; }
    public int RowNumber { get; set; }
    public string RawRowData { get; set; } = "{}";
    public string ErrorMessage { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public string? RawPunchTimestamp { get; set; }
    public string? DevicePunchState { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AttendanceImportResultDto
{
    public long BatchId { get; set; }
    public string? FileName { get; set; }
    public string? FileHash { get; set; }
    public string? Source { get; set; }
    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public string Status { get; set; } = "IMPORTED";
    public string? DateFrom { get; set; }
    public string? DateTo { get; set; }
    public bool IsDuplicate { get; set; }
    public List<AttendanceImportErrorDto> Errors { get; set; } = new();
}

public class AttendanceImportBatchFilterQuery
{
    public string? Source { get; set; }
    public string? Status { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PagedImportBatchResult
{
    public List<AttendanceImportBatchDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public class PagedImportErrorResult
{
    public List<AttendanceImportErrorDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
