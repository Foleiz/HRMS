using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Services;

public class AttendanceAdjustmentService : IAttendanceAdjustmentService
{
    private readonly IHrmsDbContext _context;

    public AttendanceAdjustmentService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<PagedAdjustmentResult> GetAdjustmentsAsync(AdjustmentFilterDto filter, CancellationToken cancellationToken = default)
    {
        var query = _context.AttendanceAdjustments
            .AsNoTracking()
            .Include(a => a.AttendanceDaily)
                .ThenInclude(ad => ad.Shift)
            .Include(a => a.RequestedByEmployee)
            .Include(a => a.ReviewedByEmployee)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ALL")
        {
            query = query.Where(a => a.Status == filter.Status);
        }

        if (filter.DateFrom.HasValue)
        {
            query = query.Where(a => a.AttendanceDaily.WorkDate >= filter.DateFrom.Value);
        }

        if (filter.DateTo.HasValue)
        {
            query = query.Where(a => a.AttendanceDaily.WorkDate <= filter.DateTo.Value);
        }

        if (filter.EmployeeId.HasValue && filter.EmployeeId.Value > 0)
        {
            query = query.Where(a => a.RequestedByEmployeeId == filter.EmployeeId.Value);
        }

        if (filter.DepartmentId.HasValue && filter.DepartmentId.Value > 0)
        {
            query = query.Where(a => _context.EmployeeAssignments
                .Any(ea => ea.EmployeeId == a.RequestedByEmployeeId && ea.IsCurrent && ea.DepartmentId == filter.DepartmentId.Value));
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(a =>
                a.RequestedByEmployee.EmployeeCode.ToLower().Contains(s) ||
                a.RequestedByEmployee.FirstName.ToLower().Contains(s) ||
                a.RequestedByEmployee.LastName.ToLower().Contains(s) ||
                a.Reason.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var page = filter.Page > 0 ? filter.Page : 1;
        var pageSize = filter.PageSize > 0 ? filter.PageSize : 20;

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Preload department & position
        var empIds = items.Select(i => i.RequestedByEmployeeId).Distinct().ToList();
        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Where(ea => empIds.Contains(ea.EmployeeId) && ea.IsCurrent)
            .ToDictionaryAsync(ea => ea.EmployeeId, cancellationToken);

        var dtos = items.Select(item =>
        {
            assignments.TryGetValue(item.RequestedByEmployeeId, out var assign);
            return MapToDto(item, assign);
        }).ToList();

        return new PagedAdjustmentResult
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AttendanceAdjustmentDto> GetAdjustmentByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.AttendanceAdjustments
            .AsNoTracking()
            .Include(a => a.AttendanceDaily)
                .ThenInclude(ad => ad.Shift)
            .Include(a => a.RequestedByEmployee)
            .Include(a => a.ReviewedByEmployee)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (item == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอปรับปรุงเวลา ID: {id}");
        }

        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == item.RequestedByEmployeeId && ea.IsCurrent, cancellationToken);

        return MapToDto(item, assignment);
    }

    public async Task<AttendanceAdjustmentDto> CreateAdjustmentAsync(
        CreateAttendanceAdjustmentRequest request, 
        long requestedByEmployeeId, 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new ValidationException("กรุณาระบุเหตุผลในการขอปรับปรุงเวลา");
        }

        var daily = await _context.AttendanceDailies
            .Include(d => d.Shift)
            .Include(d => d.Employee)
            .FirstOrDefaultAsync(d => d.Id == request.AttendanceId, cancellationToken);

        if (daily == null)
        {
            throw new KeyNotFoundException($"ไม่พบข้อมูลบันทึกเวลาประจำวัน ID: {request.AttendanceId}");
        }

        // Check for existing pending request
        var hasPending = await _context.AttendanceAdjustments
            .AnyAsync(a => a.AttendanceId == request.AttendanceId && a.Status == "PENDING", cancellationToken);

        if (hasPending)
        {
            throw new ValidationException("มีคำขอปรับปรุงเวลาสำหรับวันนี้ที่กำลังรอดำเนินการอยู่แล้ว");
        }

        // Determine employee making the request: if passed as 0 or default, use daily record's employee
        var empId = requestedByEmployeeId > 0 ? requestedByEmployeeId : daily.EmployeeId;

        var adjustment = new AttendanceAdjustment
        {
            AttendanceId = request.AttendanceId,
            RequestedByEmployeeId = empId,
            OriginalClockIn = daily.ActualIn,
            OriginalClockOut = daily.ActualOut,
            AdjustedClockIn = request.AdjustedClockIn,
            AdjustedClockOut = request.AdjustedClockOut,
            Reason = request.Reason.Trim(),
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow
        };

        _context.AttendanceAdjustments.Add(adjustment);
        await _context.SaveChangesAsync(cancellationToken);

        // Fetch back with relations for response
        return await GetAdjustmentByIdAsync(adjustment.Id, cancellationToken);
    }

    public async Task<AttendanceAdjustmentDto> ReviewAdjustmentAsync(
        long id, 
        ReviewAttendanceAdjustmentRequest request, 
        long reviewedByEmployeeId, 
        CancellationToken cancellationToken = default)
    {
        var adjustment = await _context.AttendanceAdjustments
            .Include(a => a.AttendanceDaily)
                .ThenInclude(d => d.Shift)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (adjustment == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอปรับปรุงเวลา ID: {id}");
        }

        if (adjustment.Status != "PENDING")
        {
            throw new ValidationException($"คำขอนี้ได้รับการพิจารณาไปแล้ว (สถานะปัจจุบัน: {adjustment.Status})");
        }

        var statusUpper = request.Status.Trim().ToUpperInvariant();
        if (statusUpper != "APPROVED" && statusUpper != "REJECTED")
        {
            throw new ValidationException("สถานะการพิจารณาต้องเป็น APPROVED หรือ REJECTED เท่านั้น");
        }

        adjustment.Status = statusUpper;
        adjustment.ReviewedAt = DateTime.UtcNow;
        adjustment.ReviewedByEmployeeId = reviewedByEmployeeId > 0 ? reviewedByEmployeeId : null;

        if (statusUpper == "APPROVED")
        {
            var daily = adjustment.AttendanceDaily;
            if (daily != null)
            {
                if (adjustment.AdjustedClockIn.HasValue)
                {
                    daily.ActualIn = adjustment.AdjustedClockIn.Value;
                }
                if (adjustment.AdjustedClockOut.HasValue)
                {
                    daily.ActualOut = adjustment.AdjustedClockOut.Value;
                }

                daily.IsAbsent = false;
                daily.Status = "PRESENT";

                // Recalculate attendance stats
                AttendanceDailyService.RecalculateAttendance(daily, daily.Shift);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await GetAdjustmentByIdAsync(adjustment.Id, cancellationToken);
    }

    public async Task<AttendanceAdjustmentDto> CancelAdjustmentAsync(
        long id, 
        long employeeId, 
        CancellationToken cancellationToken = default)
    {
        var adjustment = await _context.AttendanceAdjustments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (adjustment == null)
        {
            throw new KeyNotFoundException($"ไม่พบคำขอปรับปรุงเวลา ID: {id}");
        }

        if (adjustment.Status != "PENDING")
        {
            throw new ValidationException("ไม่สามารถยกเลิกคำขอที่ได้รับการพิจารณาไปแล้วได้");
        }

        adjustment.Status = "CANCELLED";
        await _context.SaveChangesAsync(cancellationToken);

        return await GetAdjustmentByIdAsync(adjustment.Id, cancellationToken);
    }

    public async Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.AttendanceAdjustments
            .CountAsync(a => a.Status == "PENDING", cancellationToken);
    }

    private static AttendanceAdjustmentDto MapToDto(AttendanceAdjustment item, EmployeeAssignment? assignment)
    {
        var emp = item.RequestedByEmployee;
        var reviewer = item.ReviewedByEmployee;
        var daily = item.AttendanceDaily;
        var shift = daily?.Shift;

        return new AttendanceAdjustmentDto
        {
            Id = item.Id,
            AttendanceId = item.AttendanceId,
            EmployeeId = item.RequestedByEmployeeId,
            EmployeeCode = emp?.EmployeeCode ?? "",
            EmployeeName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : "",
            DepartmentName = assignment?.Department?.DepartmentName,
            PositionName = assignment?.Position?.PositionName,
            WorkDate = daily?.WorkDate.ToString("yyyy-MM-dd") ?? "",
            ShiftName = shift?.ShiftName,
            ShiftCode = shift?.ShiftCode,
            OriginalClockIn = item.OriginalClockIn,
            OriginalClockOut = item.OriginalClockOut,
            AdjustedClockIn = item.AdjustedClockIn,
            AdjustedClockOut = item.AdjustedClockOut,
            Reason = item.Reason,
            Status = item.Status,
            CreatedAt = item.CreatedAt,
            ReviewedAt = item.ReviewedAt,
            ReviewedByEmployeeId = item.ReviewedByEmployeeId,
            ReviewedByEmployeeName = reviewer != null ? $"{reviewer.FirstName} {reviewer.LastName}".Trim() : null
        };
    }
}
