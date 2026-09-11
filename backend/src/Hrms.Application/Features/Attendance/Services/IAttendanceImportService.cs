using Hrms.Application.Features.Attendance.Dtos;

namespace Hrms.Application.Features.Attendance.Services;

public interface IAttendanceImportService
{
    Task<AttendanceImportResultDto> ImportFileAsync(
        Stream fileStream, 
        string fileName, 
        string? source, 
        string? deviceName, 
        bool allowDuplicate, 
        long? importedByUserId = null, 
        CancellationToken cancellationToken = default);

    Task<PagedImportBatchResult> GetBatchesAsync(
        AttendanceImportBatchFilterQuery query, 
        CancellationToken cancellationToken = default);

    Task<AttendanceImportBatchDto?> GetBatchByIdAsync(
        long id, 
        CancellationToken cancellationToken = default);

    Task<PagedImportErrorResult> GetBatchErrorsAsync(
        long batchId, 
        int page = 1, 
        int pageSize = 50, 
        CancellationToken cancellationToken = default);

    Task<(byte[] Content, string ContentType, string FileName)> GenerateTemplateAsync(
        string format = "xlsx", 
        CancellationToken cancellationToken = default);
}
