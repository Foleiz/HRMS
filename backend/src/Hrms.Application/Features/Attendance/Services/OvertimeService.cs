using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Services;

public class OvertimeService : IOvertimeService
{
    private readonly IHrmsDbContext _context;

    public OvertimeService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<OvertimeRequestDto>> GetOvertimeRequestsAsync(OvertimeFilterQuery filter, CancellationToken cancellationToken = default)
    {
        var query = _context.OvertimeRequests
            .AsNoTracking()
            .Include(o => o.Employee)
            .Include(o => o.Approver)
            .AsQueryable();

        if (filter.EmployeeId.HasValue && filter.EmployeeId.Value > 0)
        {
            query = query.Where(o => o.EmployeeId == filter.EmployeeId.Value);
        }

        if (filter.DepartmentId.HasValue && filter.DepartmentId.Value > 0)
        {
            query = query.Where(o => _context.EmployeeAssignments
                .Any(ea => ea.EmployeeId == o.EmployeeId && ea.IsCurrent && ea.DepartmentId == filter.DepartmentId.Value));
        }

        if (filter.Year.HasValue && filter.Year.Value > 0)
        {
            var year = filter.Year.Value;
            if (filter.Month.HasValue && filter.Month.Value > 0)
            {
                var month = filter.Month.Value;
                var startDate = new DateOnly(year, month, 1);
                var endDate = startDate.AddMonths(1).AddDays(-1);
                query = query.Where(o => o.WorkDate >= startDate && o.WorkDate <= endDate);
            }
            else
            {
                var startDate = new DateOnly(year, 1, 1);
                var endDate = new DateOnly(year, 12, 31);
                query = query.Where(o => o.WorkDate >= startDate && o.WorkDate <= endDate);
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ALL")
        {
            query = query.Where(o => o.Status == filter.Status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var kw = filter.Search.Trim().ToLower();
            query = query.Where(o =>
                o.RequestNo.ToLower().Contains(kw) ||
                o.Reason.ToLower().Contains(kw) ||
                (o.Employee != null && (
                    o.Employee.EmployeeCode.ToLower().Contains(kw) ||
                    o.Employee.FirstName.ToLower().Contains(kw) ||
                    o.Employee.LastName.ToLower().Contains(kw) ||
                    (o.Employee.FirstName + " " + o.Employee.LastName).ToLower().Contains(kw)
                ))
            );
        }

        var items = await query.OrderByDescending(o => o.WorkDate).ThenByDescending(o => o.CreatedAt).ToListAsync(cancellationToken);
        var empIds = items.Select(o => o.EmployeeId).Distinct().ToList();

        var assignments = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .Where(ea => empIds.Contains(ea.EmployeeId) && ea.IsCurrent)
            .ToListAsync(cancellationToken);

        var assignMap = assignments.GroupBy(a => a.EmployeeId).ToDictionary(g => g.Key, g => g.First());

        return items.Select(item =>
        {
            assignMap.TryGetValue(item.EmployeeId, out var assign);
            return MapToDto(item, assign);
        }).ToList();
    }

    public async Task<OvertimeRequestDto?> GetOvertimeRequestByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await _context.OvertimeRequests
            .AsNoTracking()
            .Include(o => o.Employee)
            .Include(o => o.Approver)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

        if (item == null) return null;

        var assign = await _context.EmployeeAssignments
            .AsNoTracking()
            .Include(ea => ea.Department)
            .Include(ea => ea.Position)
            .FirstOrDefaultAsync(ea => ea.EmployeeId == item.EmployeeId && ea.IsCurrent, cancellationToken);

        return MapToDto(item, assign);
    }

    public async Task<OvertimeRequestDto> CreateOvertimeRequestAsync(CreateOvertimeRequest request, CancellationToken cancellationToken = default)
    {
        if (request.EmployeeId <= 0)
            throw new ArgumentException("กรุณาระบุรหัสพนักงาน");

        if (!DateOnly.TryParse(request.WorkDate, out var workDate))
            throw new ArgumentException("รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)");

        var hours = request.OvertimeHours;
        if (hours <= 0 && request.EndTime > request.StartTime)
        {
            var diffMin = (request.EndTime - request.StartTime).TotalMinutes;
            hours = (decimal)Math.Round(diffMin / 60.0, 2);
        }

        if (hours <= 0)
            throw new ArgumentException("จำนวนชั่วโมงการทำงานล่วงเวลาต้องมากกว่า 0");

        var now = DateTime.UtcNow;
        var countThisMonth = await _context.OvertimeRequests
            .CountAsync(o => o.WorkDate.Year == workDate.Year && o.WorkDate.Month == workDate.Month, cancellationToken);

        var requestNo = $"OT-{workDate:yyyyMM}-{(countThisMonth + 1):D4}";

        var entity = new OvertimeRequest
        {
            RequestNo = requestNo,
            EmployeeId = request.EmployeeId,
            WorkDate = workDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            OvertimeHours = hours,
            Reason = request.Reason.Trim(),
            Status = "PENDING",
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.OvertimeRequests.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetOvertimeRequestByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<OvertimeRequestDto> ReviewOvertimeRequestAsync(long id, ReviewOvertimeRequest request, long reviewerEmployeeId, CancellationToken cancellationToken = default)
    {
        var entity = await _context.OvertimeRequests.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (entity == null)
            throw new KeyNotFoundException("ไม่พบข้อมูลคำร้องขอทำงานล่วงเวลา");

        if (entity.Status != "PENDING")
            throw new InvalidOperationException("คำร้องนี้ได้รับการพิจารณาไปแล้ว");

        var action = request.Action.Trim().ToUpperInvariant();
        if (action == "APPROVED")
        {
            entity.Status = "APPROVED";
            entity.ApprovedBy = reviewerEmployeeId > 0 ? reviewerEmployeeId : null;
            entity.ApprovedAt = DateTime.UtcNow;
            entity.RejectReason = null;
        }
        else if (action == "REJECTED")
        {
            entity.Status = "REJECTED";
            entity.ApprovedBy = reviewerEmployeeId > 0 ? reviewerEmployeeId : null;
            entity.ApprovedAt = DateTime.UtcNow;
            entity.RejectReason = request.RejectReason;
        }
        else
        {
            throw new ArgumentException("สถานะการพิจารณาต้องเป็น APPROVED หรือ REJECTED");
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetOvertimeRequestByIdAsync(id, cancellationToken))!;
    }

    public async Task<bool> CancelOvertimeRequestAsync(long id, long employeeId, CancellationToken cancellationToken = default)
    {
        var entity = await _context.OvertimeRequests.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        if (entity == null) return false;

        if (entity.Status != "PENDING")
            throw new InvalidOperationException("ไม่สามารถยกเลิกคำร้องที่ผ่านการพิจารณาแล้วได้");

        if (employeeId > 0 && entity.EmployeeId != employeeId)
            throw new UnauthorizedAccessException("ไม่มีสิทธิ์ยกเลิกคำร้องของผู้อื่น");

        entity.Status = "CANCELLED";
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static OvertimeRequestDto MapToDto(OvertimeRequest item, EmployeeAssignment? assign)
    {
        return new OvertimeRequestDto
        {
            Id = item.Id,
            RequestNo = item.RequestNo,
            EmployeeId = item.EmployeeId,
            EmployeeCode = item.Employee?.EmployeeCode ?? string.Empty,
            EmployeeName = $"{item.Employee?.FirstName} {item.Employee?.LastName}".Trim(),
            DepartmentName = assign?.Department?.DepartmentName,
            PositionName = assign?.Position?.PositionName,
            WorkDate = item.WorkDate.ToString("yyyy-MM-dd"),
            StartTime = item.StartTime,
            EndTime = item.EndTime,
            OvertimeHours = item.OvertimeHours,
            Reason = item.Reason,
            Status = item.Status,
            ApprovedByName = item.Approver != null ? $"{item.Approver.FirstName} {item.Approver.LastName}".Trim() : null,
            ApprovedAt = item.ApprovedAt,
            RejectReason = item.RejectReason,
            CreatedAt = item.CreatedAt
        };
    }
}
