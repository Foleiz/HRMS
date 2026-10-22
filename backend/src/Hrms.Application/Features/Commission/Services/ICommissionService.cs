using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Features.Commission.DTOs;

namespace Hrms.Application.Features.Commission.Services;

public interface ICommissionService
{
    Task<CommissionPeriodSummaryDto> GetCommissionPeriodAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<List<CommissionMonthlyPeriodDto>> GetMonthlyPeriodsAsync(int year, CancellationToken cancellationToken = default);
    Task<List<CommissionBatchEntryDto>> GetPeriodAllEntriesAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<CommissionPreviewResultDto> PreviewCommissionFileAsync(int year, int month, decimal defaultRate, Stream fileStream, string fileName, CancellationToken cancellationToken = default);
    Task<ImportCommissionResultDto> ImportCommissionFileAsync(int year, int month, decimal defaultRate, Stream fileStream, string fileName, long? userId = null, string overlapResolutionMode = "USE_NEW", CancellationToken cancellationToken = default);
    Task<PagedCommissionBatchResult> GetCommissionBatchesAsync(int page = 1, int pageSize = 10, CancellationToken cancellationToken = default);
    Task<List<CommissionBatchEntryDto>> GetBatchRecordsAsync(long batchId, CancellationToken cancellationToken = default);
    Task<List<CommissionBatchEntryDto>> GetEmployeePeriodEntriesAsync(long employeeId, int year, int month, CancellationToken cancellationToken = default);
    Task<RevertCommissionBatchResultDto> RevertCommissionBatchAsync(long batchId, long? userId = null, CancellationToken cancellationToken = default);
    Task<CommissionRecordDto> UpdateCommissionRecordAsync(long id, UpdateCommissionItemRequest request, CancellationToken cancellationToken = default);
    Task<CommissionRecordDto> AddManualCommissionRecordAsync(AddManualCommissionRequest request, CancellationToken cancellationToken = default);
    Task DeleteCommissionRecordAsync(long id, CancellationToken cancellationToken = default);
    Task<CommissionPeriodSummaryDto> ConfirmCommissionPeriodAsync(int year, int month, long confirmedByEmployeeId, CancellationToken cancellationToken = default);
    Task<CommissionPeriodSummaryDto> ResetCommissionPeriodAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<CommissionPeriodSummaryDto> RecalculatePeriodWithRateAsync(int year, int month, decimal newRate, CancellationToken cancellationToken = default);
    Task<byte[]> GenerateExcelTemplateAsync(CancellationToken cancellationToken = default);
}
