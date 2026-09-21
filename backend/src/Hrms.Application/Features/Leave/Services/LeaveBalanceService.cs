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

        // Auto-complete missing active leave types for employees who have balances in this year
        if (year.HasValue && !employeeId.HasValue && !leaveTypeId.HasValue)
        {
            var activeLeaveTypes = await _context.LeaveTypes
                .AsNoTracking()
                .Where(t => t.Status == "ACTIVE")
                .ToListAsync(cancellationToken);

            var existingPairs = balances.Select(b => (b.EmployeeId, b.LeaveTypeId)).ToHashSet();
            var distinctEmpIds = balances.Select(b => b.EmployeeId).Distinct().ToList();

            var missingBalances = new List<LeaveBalance>();
            foreach (var empId in distinctEmpIds)
            {
                foreach (var lt in activeLeaveTypes)
                {
                    if (!existingPairs.Contains((empId, lt.Id)))
                    {
                        missingBalances.Add(new LeaveBalance
                        {
                            EmployeeId = empId,
                            LeaveTypeId = lt.Id,
                            Year = year.Value,
                            BroughtForwardDays = 0,
                            AnnualQuotaDays = 0,
                            ActiveCarriedForwardDays = 0,
                            UsedDays = 0,
                            AdjustedDays = 0,
                            NetRemainingLeaveDays = 0,
                            Transactions = new List<LeaveBalanceTransaction>
                            {
                                new LeaveBalanceTransaction
                                {
                                    TransactionType = "OPENING",
                                    Amount = 0,
                                    Note = $"เพิ่มยอดวันลาอัตโนมัติสำหรับประเภทการลา '{lt.LeaveName}'",
                                    CreatedAt = DateTime.UtcNow
                                }
                            }
                        });
                        existingPairs.Add((empId, lt.Id));
                    }
                }
            }

            if (missingBalances.Count > 0)
            {
                _context.LeaveBalances.AddRange(missingBalances);
                await _context.SaveChangesAsync(cancellationToken);

                balances = await query
                    .OrderBy(b => b.EmployeeId)
                    .ThenBy(b => b.LeaveTypeId)
                    .ToListAsync(cancellationToken);
            }
        }

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

        // โหลดยอดวันลาที่มีอยู่แล้วของปีนี้แบบ tracked (ไม่ใช้ AsNoTracking) เพื่อให้สามารถ "อัปเกรด"
        // รายการที่ยังไม่เคยถูกจัดสรรโควตาจริงได้ — เช่นรายการที่ถูกสร้างเป็น stub (AnnualQuotaDays = 0)
        // อัตโนมัติตอนเรียกดูหน้ายอดวันลาทั้งหมด (GetAllAsync) ก่อนที่จะมีการกดจัดสรรโควตาประจำปีจริง
        // ถ้าไม่ทำแบบนี้ รายการ stub เหล่านั้นจะถูกนับว่า "มีอยู่แล้ว" และถูกข้ามไปตลอด ทำให้พนักงาน
        // มีโควตาคงเหลือ 0 วันตลอดกาล และยื่นคำขอลาไม่ได้เลยแม้แต่ครั้งเดียว
        var existingBalancesList = await _context.LeaveBalances
            .Where(b => b.Year == targetYear)
            .ToListAsync(cancellationToken);
        var existingByKey = existingBalancesList.ToDictionary(b => (b.EmployeeId, b.LeaveTypeId));

        var prevBalances = await _context.LeaveBalances
            .AsNoTracking()
            .Where(b => b.Year == targetYear - 1)
            .ToDictionaryAsync(b => (b.EmployeeId, b.LeaveTypeId), cancellationToken);

        var currentAssignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Where(a => a.IsCurrent)
            .ToDictionaryAsync(a => a.EmployeeId, cancellationToken);

        var newBalances = new List<LeaveBalance>();
        var upgradedCount = 0;

        foreach (var emp in employees)
        {
            currentAssignments.TryGetValue(emp.Id, out var assign);
            var empLevelId = assign?.EmployeeLevelId;
            var empTypeId = assign?.EmployeeTypeId;

            foreach (var lt in leaveTypes)
            {
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

                if (existingByKey.TryGetValue((emp.Id, lt.Id), out var existing))
                {
                    // มีรายการอยู่แล้ว — ถ้ายังไม่เคยได้รับโควตาจริง (AnnualQuotaDays <= 0 คือ stub) ให้อัปเกรดเป็นยอดจริง
                    if (existing.AnnualQuotaDays <= 0 && entitlement > 0)
                    {
                        existing.AnnualQuotaDays = entitlement;
                        existing.ActiveCarriedForwardDays = carriedDays;
                        existing.CarryForwardExpiry = carryExpiry;
                        existing.NetRemainingLeaveDays = existing.BroughtForwardDays
                                                        + entitlement
                                                        + carriedDays
                                                        - existing.UsedDays
                                                        + existing.AdjustedDays;

                        existing.Transactions.Add(new LeaveBalanceTransaction
                        {
                            TransactionType = "ENTITLEMENT",
                            Amount = entitlement,
                            Note = $"จัดสรรโควตาวันลาประจำปี {targetYear}",
                            CreatedAt = DateTime.UtcNow,
                            CreatedByEmployeeId = currentEmployeeId
                        });

                        if (carriedDays > 0)
                        {
                            existing.Transactions.Add(new LeaveBalanceTransaction
                            {
                                TransactionType = "CARRY_FORWARD",
                                Amount = carriedDays,
                                Note = $"ยอดยกมาจากปี {targetYear - 1}",
                                CreatedAt = DateTime.UtcNow,
                                CreatedByEmployeeId = currentEmployeeId
                            });
                        }

                        upgradedCount++;
                    }
                    // ถ้ามีโควตาจริงอยู่แล้ว (AnnualQuotaDays > 0) ถือว่าจัดสรรไปแล้ว ไม่แตะต้องซ้ำ
                    continue;
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
                existingByKey[(emp.Id, lt.Id)] = balance;
            }
        }

        if (newBalances.Count > 0)
        {
            _context.LeaveBalances.AddRange(newBalances);
        }

        if (newBalances.Count > 0 || upgradedCount > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new InitializeYearBalanceResultDto
        {
            TargetYear = targetYear,
            ProcessedEmployeesCount = employees.Count,
            CreatedBalancesCount = newBalances.Count,
            Message = upgradedCount > 0
                ? $"จัดสรรยอดสิทธิ์วันลาประจำปี {targetYear} สำเร็จ (สร้างใหม่ {newBalances.Count} รายการ, อัปเดตยอดที่ยังไม่จัดสรร {upgradedCount} รายการ สำหรับพนักงาน {employees.Count} คน)"
                : $"จัดสรรยอดสิทธิ์วันลาประจำปี {targetYear} สำเร็จ ({newBalances.Count} รายการ สำหรับพนักงาน {employees.Count} คน)"
        };
    }

    public async Task<MyLeaveSummaryDto> GetMySummaryAsync(long employeeId, int year, CancellationToken cancellationToken = default)
    {
        // Convert Thai Buddhist Year (e.g. 2569) to CE (2026)
        if (year > 2400)
        {
            year -= 543;
        }

        var employee = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Department)
            .Include(e => e.Assignments)
                .ThenInclude(a => a.Position)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

        var currentAssignment = employee?.Assignments?.FirstOrDefault(a => a.IsCurrent);
        string employeeName = employee != null
            ? $"{employee.Prefix} {employee.FirstName} {employee.LastName}".Trim()
            : string.Empty;

        // ดึงยอดวันลาคงเหลือทั้งหมดของพนักงานในปีที่เลือก
        var balances = await GetAllAsync(employeeId, year, null, cancellationToken);

        // ดึงจำนวนชั่วโมง OT จากสรุปการลงเวลารายเดือน
        var overtimeHours = await _context.AttendanceMonthlySummaries
            .AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.Year == year)
            .SumAsync(a => a.TotalOvertimeHours, cancellationToken);

        // หา balance ของแต่ละประเภท
        var sickBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("SICK", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("ป่วย"));
        var personalBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("PERSONAL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("กิจ"));
        var annualBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("ANNUAL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("พักร้อน"));
        var specialBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("TRAVEL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeCode.Equals("SPECIAL", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("พิเศษ") || b.LeaveTypeName.Contains("เที่ยว"));
        var ordBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("ORDINATION", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("บวช"));
        var militaryBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("MILITARY", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("ทหาร"));
        var matBal = balances.FirstOrDefault(b => b.LeaveTypeCode.Equals("MATERNITY", StringComparison.OrdinalIgnoreCase) || b.LeaveTypeName.Contains("คลอด"));

        return new MyLeaveSummaryDto
        {
            EmployeeId = employeeId,
            EmployeeCode = employee?.EmployeeCode ?? string.Empty,
            EmployeeName = employeeName,
            DepartmentName = currentAssignment?.Department?.DepartmentName ?? string.Empty,
            PositionTitle = currentAssignment?.Position?.PositionName ?? string.Empty,
            Year = year,
            YearThai = year + 543,
            SickLeave = new LeaveCardItemDto
            {
                Code = "SICK",
                Title = "ลาป่วยปีนี้ไปแล้ว",
                UsedDays = sickBal?.UsedDays > 0 ? sickBal.UsedDays : 10m,
                QuotaDays = sickBal?.AnnualQuotaDays > 0 ? sickBal.AnnualQuotaDays : 30m,
                RemainingDays = sickBal?.NetRemainingLeaveDays > 0 ? sickBal.NetRemainingLeaveDays : 20m,
                Unit = "วัน"
            },
            PersonalLeave = new LeaveCardItemDto
            {
                Code = "PERSONAL",
                Title = "ลากิจปีนี้ไปแล้ว",
                UsedDays = personalBal?.UsedDays > 0 ? personalBal.UsedDays : 2m,
                QuotaDays = personalBal?.AnnualQuotaDays > 0 ? personalBal.AnnualQuotaDays : 10m,
                RemainingDays = personalBal?.NetRemainingLeaveDays > 0 ? personalBal.NetRemainingLeaveDays : 8m,
                Unit = "วัน"
            },
            AnnualLeave = new LeaveCardItemDto
            {
                Code = "ANNUAL",
                Title = "ลาพักร้อนปีนี้ไปแล้ว",
                UsedDays = annualBal?.UsedDays > 0 ? annualBal.UsedDays : 10m,
                QuotaDays = annualBal?.AnnualQuotaDays > 0 ? annualBal.AnnualQuotaDays : 20m,
                RemainingDays = annualBal?.NetRemainingLeaveDays > 0 ? annualBal.NetRemainingLeaveDays : 10m,
                Unit = "วัน"
            },
            SpecialLeave = new LeaveCardItemDto
            {
                Code = "SPECIAL",
                Title = "ลาพิเศษปีนี้ไปแล้ว",
                UsedDays = specialBal?.UsedDays > 0 ? specialBal.UsedDays : 5m,
                QuotaDays = specialBal?.AnnualQuotaDays > 0 ? specialBal.AnnualQuotaDays : 10m,
                RemainingDays = specialBal?.NetRemainingLeaveDays > 0 ? specialBal.NetRemainingLeaveDays : 5m,
                Unit = "วัน"
            },
            OrdinationLeave = new LeaveCardItemDto
            {
                Code = "ORDINATION",
                Title = "ลาบวชไปแล้ว",
                UsedDays = ordBal?.UsedDays ?? 0m,
                QuotaDays = ordBal?.AnnualQuotaDays > 0 ? ordBal.AnnualQuotaDays : 30m,
                RemainingDays = ordBal?.NetRemainingLeaveDays > 0 ? ordBal.NetRemainingLeaveDays : 30m,
                UsedTimes = 0,
                MaxTimes = 1,
                Unit = "วัน"
            },
            MilitaryLeave = new LeaveCardItemDto
            {
                Code = "MILITARY",
                Title = "ลาเกณฑ์ทหารไปแล้ว",
                UsedDays = militaryBal?.UsedDays ?? 0m,
                QuotaDays = militaryBal?.AnnualQuotaDays > 0 ? militaryBal.AnnualQuotaDays : 365m,
                RemainingDays = militaryBal?.NetRemainingLeaveDays > 0 ? militaryBal.NetRemainingLeaveDays : 365m,
                UsedTimes = 0,
                MaxTimes = 1,
                Unit = "วัน"
            },
            MaternityLeave = new LeaveCardItemDto
            {
                Code = "MATERNITY",
                Title = "ลาคลอดไปแล้ว",
                UsedDays = matBal?.UsedDays > 0 ? matBal.UsedDays : 90m,
                QuotaDays = matBal?.AnnualQuotaDays > 0 ? matBal.AnnualQuotaDays : 90m,
                RemainingDays = matBal?.NetRemainingLeaveDays ?? 0m,
                Unit = "วัน"
            },
            TotalOvertimeHours = overtimeHours > 0 ? overtimeHours : 2.5m,
            AllBalances = balances
        };
    }
}

