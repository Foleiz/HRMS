namespace Hrms.Application.Features.Contracts.DTOs;

/// <summary>
/// DTO สำหรับสร้างสัญญาจ้างงานใหม่
/// </summary>
public class CreateEmploymentContractRequest
{
    public long EmployeeId { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string ContractType { get; set; } = "PROBATION"; // PROBATION, PERMANENT, FIXED_TERM, OTHER
    public string? WageType { get; set; } = "MONTHLY"; // MONTHLY, DAILY
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; } // วันที่สิ้นสุด / ครบทดลองงาน
    public string? Status { get; set; } = "ACTIVE"; // ACTIVE, PENDING_APPROVAL

    // เอกสารแนบสัญญาจ้าง
    public string? DocumentFileName { get; set; }
    /// <summary>ไฟล์แบบ base64 (รองรับทั้ง data URL และ base64 ล้วน)</summary>
    public string? DocumentFileData { get; set; }
}
