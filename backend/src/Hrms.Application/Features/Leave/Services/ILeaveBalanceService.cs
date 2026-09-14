using Hrms.Application.Features.Leave.DTOs;

namespace Hrms.Application.Features.Leave.Services;

public interface ILeaveBalanceService
{
    Task<List<LeaveBalanceDto>> GetAllAsync(long? employeeId = null, int? year = null, long? leaveTypeId = null, CancellationToken cancellationToken = default);
    Task<List<LeaveBalanceTransactionDto>> GetTransactionsAsync(long leaveBalanceId, CancellationToken cancellationToken = default);
    Task<LeaveBalanceDto> AdjustBalanceAsync(LeaveBalanceAdjustmentRequest request, long? currentEmployeeId = null, CancellationToken cancellationToken = default);
    Task<InitializeYearBalanceResultDto> InitializeYearBalanceAsync(int targetYear, long? currentEmployeeId = null, CancellationToken cancellationToken = default);
}
