using Hrms.Application.Features.Employees.DTOs;

namespace Hrms.Application.Features.Employees.Services;

/// <summary>
/// Interface บริการจัดการข้อมูลประวัติพนักงานและ PDPA Security
/// </summary>
public interface IEmployeeService
{
    Task<List<EmployeeDto>> GetAllAsync(string? search = null, CancellationToken cancellationToken = default);
    Task<EmployeeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<string> GetNextEmployeeCodeAsync(CancellationToken cancellationToken = default);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<EmployeeDto> UpdateAsync(long id, UpdateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
    Task<EmployeeDto> UpdateStatusAsync(long id, string status, CancellationToken cancellationToken = default);

    // จัดการรูปโปรไฟล์ (Option 3 - PostgreSQL Binary Storage)
    Task<string> UploadAvatarAsync(long id, Stream stream, string contentType, long length, CancellationToken cancellationToken = default);
    Task<(byte[] ImageData, string MimeType)?> GetAvatarAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> DeleteAvatarAsync(long id, CancellationToken cancellationToken = default);

    // จัดการลายเซ็นดิจิทัล (PostgreSQL Binary Storage)
    Task<string> UploadSignatureAsync(long id, Stream stream, string fileName, string contentType, long length, CancellationToken cancellationToken = default);
    Task<(byte[] SignatureData, string MimeType)?> GetSignatureAsync(long id, CancellationToken cancellationToken = default);
    Task<bool> DeleteSignatureAsync(long id, CancellationToken cancellationToken = default);
}
