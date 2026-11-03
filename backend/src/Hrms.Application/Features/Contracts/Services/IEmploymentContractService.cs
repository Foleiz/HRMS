using Hrms.Application.Features.Contracts.DTOs;

namespace Hrms.Application.Features.Contracts.Services;

/// <summary>
/// Interface Service สำหรับจัดการสัญญาจ้างงาน
/// </summary>
public interface IEmploymentContractService
{
    Task<List<EmploymentContractDto>> GetAllAsync(string? search, string? contractType, string? status, CancellationToken cancellationToken = default);
    Task<ContractSummaryStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);
    Task<EmploymentContractDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<List<EmploymentContractDto>> GetByEmployeeIdAsync(long employeeId, CancellationToken cancellationToken = default);
    Task<List<EmployeeCareerTimelineDto>> GetTimelineByEmployeeIdAsync(long employeeId, CancellationToken cancellationToken = default);
    Task<EmploymentContractDto> CreateAsync(CreateEmploymentContractRequest request, CancellationToken cancellationToken = default);
    Task<EmploymentContractDto> UpdateAsync(long id, UpdateEmploymentContractRequest request, CancellationToken cancellationToken = default);
    Task<bool> TerminateAsync(long id, string? reason, DateOnly? terminationDate, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>
    /// นำประเภทพนักงานจากสัญญาที่ถึงวันเริ่มแล้ว (ACTIVE) ไปอัปเดตข้อมูลพนักงานปัจจุบัน
    /// ใช้กับสัญญาที่ลงวันที่เริ่มล่วงหน้า — คืนจำนวนสัญญาที่นำไปใช้
    /// </summary>
    Task<int> ApplyDueEmployeeTypesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// ดึงไฟล์เอกสารสัญญาจ้างงานสำหรับ Preview / Download (documentId = null → ไฟล์ล่าสุด)
    /// </summary>
    Task<ContractDocumentFile> GetDocumentFileAsync(long id, long? documentId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// แนบไฟล์เอกสารสัญญาจ้างงานเพิ่ม (แนบได้หลายไฟล์)
    /// </summary>
    Task<EmploymentContractDto> AttachDocumentAsync(long id, UploadContractDocumentRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// ลบไฟล์เอกสารสัญญาจ้างงาน (documentId = null → ลบทุกไฟล์)
    /// </summary>
    Task<EmploymentContractDto> DeleteDocumentAsync(long id, long? documentId = null, CancellationToken cancellationToken = default);
}
