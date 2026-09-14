using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leave.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leave.Services;

public class LeaveBalanceService : ILeaveBalanceService
{
    private readonly IHrmsDbContext _context;

    public LeaveBalanceService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<LeaveBalanceDto>> GetAllAsync(long? employeeId = null, int? year = null, long? leaveTypeId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.LeaveBalances
            .AsNoTracking()
            .Include(b => b.Employee)
            .Include(b => b.LeaveType)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(b => b.EmployeeId == employeeId.Value);
        }

        if (year.HasValue)
        {
            query = query.Where(b => b.Year == year.Value);
        }

        if (leaveTypeId.HasValue)
        {
            query = query.Where(b => b.LeaveTypeId == leaveTypeId.Value);
        }

        var balances = await query
            .OrderBy(b => b.EmployeeId)
            .ThenBy(b => b.LeaveTypeId)
            .ToListAsync(cancellationToken);

        var empIds = balances.Select(b => b.EmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        return balances.Select(b =>
        {
            assignments.TryGetValue(b.EmployeeId, out var assign);
            var emp = b.Employee;
            var empName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty;

            return new LeaveBalanceDto
            {
                Id = b.Id,
                EmployeeId = b.EmployeeId,
                EmployeeCode = emp?.EmployeeCode ?? string.Empty,
                EmployeeName = empName,
                DepartmentName = assign?.Department?.DepartmentName ?? "-",
                PositionTitle = assign?.Position?.PositionName ?? "-",
                LeaveTypeId = b.LeaveTypeId,
                LeaveTypeCode = b.LeaveType?.LeaveCode ?? string.Empty,
                LeaveTypeName = b.LeaveType?.LeaveName ?? string.Empty,
                Year = b.Year,
                BroughtForwardDays = b.BroughtForwardDays,
                AnnualQuotaDays = b.AnnualQuotaDays,
                ActiveCarriedForwardDays = b.ActiveCarriedForwardDays,
                UsedDays = b.UsedDays,
                AdjustedDays = b.AdjustedDays,
                NetRemainingLeaveDays = b.NetRemainingLeaveDays,
                CarryForwardExpiry = b.CarryForwardExpiry
            };
        }).ToList();
    }

    public async Task<List<LeaveBalanceTransactionDto>> GetTransactionsAsync(long leaveBalanceId, CancellationToken cancellationToken = default)
    {
        return await _context.LeaveBalanceTransactions
            .AsNoTracking()
            .Include(t => t.CreatedByEmployee)
            .Where(t => t.LeaveBalanceId == leaveBalanceId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new LeaveBalanceTransactionDto
            {
                Id = t.Id,
                LeaveBalanceId = t.LeaveBalanceId,
                TransactionType = t.TransactionType,
                Amount = t.Amount,
                ReferenceType = t.ReferenceType,
                ReferenceId = t.ReferenceId,
                Note = t.Note,
                CreatedAt = t.CreatedAt,
                CreatedByEmployeeName = t.CreatedByEmployee != null
                    ? $"{t.CreatedByEmployee.FirstName} {t.CreatedByEmployee.LastName}".Trim()
                    : null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<LeaveBalanceDto> AdjustBalanceAsync(LeaveBalanceAdjustmentRequest request, long? currentEmployeeId = null, CancellationToken cancellationToken = default)
    {
        var balance = await _context.LeaveBalances
            .Include(b => b.Employee)
            .Include(b => b.LeaveType)
            .FirstOrDefaultAsync(b => b.Id == request.LeaveBalanceId, cancellationToken);

        if (balance == null)
        {
            throw new KeyNotFoundException($"ไม่พบยอดวันลารหัส ID {request.LeaveBalanceId}");
        }

        // Apply adjustment
        balance.AdjustedDays += request.Amount;
        balance.NetRemainingLeaveDays = balance.BroughtForwardDays 
                                      + balance.AnnualQuotaDays 
                                      + balance.ActiveCarriedForwardDays 
                                      - balance.UsedDays 
                                      + balance.AdjustedDays;

        // Record transaction
        var tx = new LeaveBalanceTransaction
        {
            LeaveBalanceId = balance.Id,
            TransactionType = "ADJUSTMENT",
            Amount = request.Amount,
            Note = request.Reason,
            CreatedAt = DateTime.UtcNow,
            CreatedByEmployeeId = currentEmployeeId
        };

        _context.LeaveBalanceTransactions.Add(tx);
        await _context.SaveChangesAsync(cancellationToken);

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Position)
            .FirstOrDefaultAsync(a => a.EmployeeId == balance.EmployeeId && a.IsCurrent, cancellationToken);

        var emp = balance.Employee;
        return new LeaveBalanceDto
        {
            Id = balance.Id,
            EmployeeId = balance.EmployeeId,
            EmployeeCode = emp?.EmployeeCode ?? string.Empty,
            EmployeeName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : string.Empty,
            DepartmentName = assign?.Department?.DepartmentName ?? "-",
            PositionTitle = assign?.Position?.PositionName ?? "-",
            LeaveTypeId = balance.LeaveTypeId,
            LeaveTypeCode = balance.LeaveType?.LeaveCode ?? string.Empty,
            LeaveTypeName = balance.LeaveType?.LeaveName ?? string.Empty,
            Year = balance.Year,
            BroughtForwardDays = balance.BroughtForwardDays,
            AnnualQuotaDays = balance.AnnualQuotaDays,
            ActiveCarriedForwardDays = balance.ActiveCarriedForwardDays,
            UsedDays = balance.UsedDays,
            AdjustedDays = balance.AdjustedDays,
            NetRemainingLeaveDays = balance.NetRemainingLeaveDays,
            CarryForwardExpiry = balance.CarryForwardExpiry
        };
    }

    public async Task<InitializeYearBalanceResultDto> InitializeYearBalanceAsync(int targetYear, long? currentEmployeeId = null, CancellationToken cancellationToken = default)
    {
        var employees = await _context.Employees
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var leaveTypes = await _context.LeaveTypes
            .AsNoTracking()
            .Where(t => t.Status == "ACTIVE")
            .ToListAsync(cancellationToken);

        var policies = await _context.LeavePolicies
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // Batch pre-load data into memory (0 repeated network calls)
        var existingBalances = await _context.LeaveBalances
            .AsNoTracking()
            .Where(b => b.Year == targetYear)
            .Select(b => new { b.EmployeeId, b.LeaveTypeId })
            .ToListAsync(cancellationToken);
        var existingSet = new HashSet<(long, long)>(existingBalances.Select(b => (b.EmployeeId, b.LeaveTypeId)));

        var prevBalances = await _context.LeaveBalances
            .AsNoTracking()
            .Where(b => b.Year == targetYear - 1)
            .ToDictionaryAsync(b => (b.EmployeeId, b.LeaveTypeId), cancellationToken);

        var currentAssignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Where(a => a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var newBalances = new List<LeaveBalance>();

        foreach (var emp in employees)
        {
            currentAssignments.TryGetValue(emp.Id, out var assign);
            var empLevelId = assign?.EmployeeLevelId;
            var empTypeId = assign?.EmployeeTypeId;

            foreach (var lt in leaveTypes)
            {
                if (existingSet.Contains((emp.Id, lt.Id))) continue;

                var policy = policies
                    .Where(p => p.LeaveTypeId == lt.Id && (p.EmployeeTypeId == null || p.EmployeeTypeId == empTypeId))
                    .OrderByDescending(p => p.EmployeeLevelId == empLevelId)
                    .FirstOrDefault();

                var entitlement = policy?.EntitlementDays ?? 0;
                decimal carriedDays = 0;
                DateOnly? carryExpiry = null;

                if (policy != null && policy.IsCarryForwardAllowed)
                {
                    if (prevBalances.TryGetValue((emp.Id, lt.Id), out var prevBalance) && prevBalance.NetRemainingLeaveDays > 0)
                    {
                        var maxCarried = policy.EntitlementDays;
                        carriedDays = Math.Min(prevBalance.NetRemainingLeaveDays, maxCarried);
                        var expiryMonths = policy.CarryForwardExpiryMonths ?? policy.CarryForwardMaxMonths ?? 3;
                        carryExpiry = new DateOnly(targetYear, 1, 1).AddMonths(expiryMonths);
                    }
                }

                var balance = new LeaveBalance
                {
                    EmployeeId = emp.Id,
                    LeaveTypeId = lt.Id,
                    Year = targetYear,
                    BroughtForwardDays = 0,
                    AnnualQuotaDays = entitlement,
                    ActiveCarriedForwardDays = carriedDays,
                    UsedDays = 0,
                    AdjustedDays = 0,
                    NetRemainingLeaveDays = entitlement + carriedDays,
                    CarryForwardExpiry = carryExpiry,
                    Transactions = new List<LeaveBalanceTransaction>
                    {
                        new LeaveBalanceTransaction
                        {
                            TransactionType = "ENTITLEMENT",
                            Amount = entitlement,
                            Note = $"จัดสรรโควตาวันลาประจำปี {targetYear}",
                            CreatedAt = DateTime.UtcNow,
                            CreatedByEmployeeId = currentEmployeeId
                        }
                    }
                };

                if (carriedDays > 0)
                {
                    balance.Transactions.Add(new LeaveBalanceTransaction
                    {
                        TransactionType = "CARRY_FORWARD",
                        Amount = carriedDays,
                        Note = $"ยอดยกมาจากปี {targetYear - 1}",
                        CreatedAt = DateTime.UtcNow,
                        CreatedByEmployeeId = currentEmployeeId
                    });
                }

                newBalances.Add(balance);
                existingSet.Add((emp.Id, lt.Id));
            }
        }

        if (newBalances.Count > 0)
        {
            _context.LeaveBalances.AddRange(newBalances);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new InitializeYearBalanceResultDto
        {
            TargetYear = targetYear,
            ProcessedEmployeesCount = employees.Count,
            CreatedBalancesCount = newBalances.Count,
            Message = $"จัดสรรยอดสิทธิ์วันลาประจำปี {targetYear} สำเร็จ ({newBalances.Count} รายการ สำหรับพนักงาน {employees.Count} คน)"
        };
    }
}
