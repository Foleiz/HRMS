using Hrms.Application.Features.EmployeeDocuments.DTOs;

namespace Hrms.Application.Features.EmployeeDocuments.Services;

public interface IEmployeeDocumentService
{
    Task<List<EmployeeDocumentDto>> GetByEmployeeAsync(long employeeId, CancellationToken cancellationToken = default);
    Task<List<EmployeeDocumentDto>> GetMyDocumentsAsync(CancellationToken cancellationToken = default);
    Task<EmployeeDocumentDto> UploadAsync(long employeeId, CreateEmployeeDocumentDto dto, CancellationToken cancellationToken = default);
    Task<EmployeeDocumentFile> GetFileAsync(long id, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
    /// <summary>เอกสารใกล้หมดอายุ / หมดอายุแล้วของพนักงานทุกคน (ฝ่ายบุคคล)</summary>
    Task<List<EmployeeDocumentDto>> GetExpiringAsync(string? status, CancellationToken cancellationToken = default);
}
