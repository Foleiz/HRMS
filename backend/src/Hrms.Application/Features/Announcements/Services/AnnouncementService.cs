using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Announcements.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Announcements.Services;

public class AnnouncementService : IAnnouncementService
{
    private readonly IHrmsDbContext _context;

    public AnnouncementService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<AnnouncementDto>> GetAdminAnnouncementsAsync(
        AnnouncementFilterParams filter, 
        CancellationToken cancellationToken = default)
    {
        var query = _context.Announcements
            .AsNoTracking()
            .Include(a => a.CreatedByEmployee)
            .Include(a => a.Targets)
            .Include(a => a.Reads)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(a => a.Title.ToLower().Contains(search) || a.Content.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(a => a.Status == filter.Status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            query = query.Where(a => a.Category == filter.Category);
        }

        if (!string.IsNullOrWhiteSpace(filter.Priority))
        {
            query = query.Where(a => a.Priority == filter.Priority);
        }

        if (filter.IsPinned.HasValue)
        {
            query = query.Where(a => a.IsPinned == filter.IsPinned.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(a => a.IsPinned)
            .ThenByDescending(a => a.PublishedAt ?? a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Preload department, division, level dictionaries
        var departments = await _context.Departments.AsNoTracking().ToDictionaryAsync(d => d.Id, d => d.DepartmentName, cancellationToken);
        var divisions = await _context.Divisions.AsNoTracking().ToDictionaryAsync(d => d.Id, d => d.DivisionName, cancellationToken);
        var levels = await _context.EmployeeLevels.AsNoTracking().ToDictionaryAsync(l => l.Id, l => l.LevelName, cancellationToken);

        var totalActiveEmployees = await _context.EmployeeAssignments.CountAsync(a => a.IsCurrent, cancellationToken);

        var dtos = items.Select(a => MapToDto(a, null, departments, divisions, levels, totalActiveEmployees)).ToList();

        return new PagedResult<AnnouncementDto>(dtos, totalCount, page, pageSize);
    }

    public async Task<List<AnnouncementDto>> GetEmployeeFeedAsync(
        long employeeId, 
        CancellationToken cancellationToken = default)
    {
        var assignment = await _context.EmployeeAssignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.IsCurrent, cancellationToken);

        var deptId = assignment?.DepartmentId;
        var divId = assignment?.DivisionId;
        var levelId = assignment?.EmployeeLevelId;

        var now = DateTime.UtcNow;

        var announcements = await _context.Announcements
            .AsNoTracking()
            .Include(a => a.CreatedByEmployee)
            .Include(a => a.Targets)
            .Include(a => a.Reads.Where(r => r.EmployeeId == employeeId))
            .Where(a => a.Status == "PUBLISHED" && 
                        (a.PublishedAt == null || a.PublishedAt <= now) &&
                        (a.ExpireAt == null || a.ExpireAt >= now))
            .ToListAsync(cancellationToken);

        // กรองตามกลุ่มเป้าหมายในหน่วยความจำ
        var filtered = announcements.Where(a =>
        {
            if (!a.Targets.Any()) return true;
            return a.Targets.Any(t =>
                t.TargetType == "ALL" ||
                (t.TargetType == "DEPARTMENT" && deptId.HasValue && t.TargetEntityId == deptId.Value) ||
                (t.TargetType == "DIVISION" && divId.HasValue && t.TargetEntityId == divId.Value) ||
                (t.TargetType == "EMPLOYEE_LEVEL" && levelId.HasValue && t.TargetEntityId == levelId.Value)
            );
        })
        .OrderByDescending(a => a.IsPinned)
        .ThenByDescending(a => a.PublishedAt ?? a.CreatedAt)
        .ToList();

        return filtered.Select(a => MapToDto(a, employeeId)).ToList();
    }

    public async Task<AnnouncementDto?> GetByIdAsync(
        long id, 
        long? currentEmployeeId = null, 
        CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements
            .AsNoTracking()
            .Include(a => a.CreatedByEmployee)
            .Include(a => a.Targets)
            .Include(a => a.Reads)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (announcement == null)
        {
            return null;
        }

        var departments = await _context.Departments.AsNoTracking().ToDictionaryAsync(d => d.Id, d => d.DepartmentName, cancellationToken);
        var divisions = await _context.Divisions.AsNoTracking().ToDictionaryAsync(d => d.Id, d => d.DivisionName, cancellationToken);
        var levels = await _context.EmployeeLevels.AsNoTracking().ToDictionaryAsync(l => l.Id, l => l.LevelName, cancellationToken);
        var totalActiveEmployees = await _context.EmployeeAssignments.CountAsync(a => a.IsCurrent, cancellationToken);

        return MapToDto(announcement, currentEmployeeId, departments, divisions, levels, totalActiveEmployees);
    }

    public async Task<AnnouncementDto> CreateAsync(
        CreateAnnouncementRequest request, 
        long creatorEmployeeId, 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("หัวข้อประกาศต้องไม่เป็นค่าว่าง");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            throw new ArgumentException("เนื้อหาประกาศต้องไม่เป็นค่าว่าง");
        }

        var publishedAt = request.PublishedAt;
        if (request.Status == "PUBLISHED" && !publishedAt.HasValue)
        {
            publishedAt = DateTime.UtcNow;
        }

        var announcement = new Announcement
        {
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            PublishedAt = publishedAt,
            ExpireAt = request.ExpireAt,
            CreatedByEmployeeId = creatorEmployeeId,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "DRAFT" : request.Status.ToUpper(),
            IsPinned = request.IsPinned,
            BannerImageUrl = request.BannerImageUrl?.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "GENERAL" : request.Category.ToUpper(),
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "NORMAL" : request.Priority.ToUpper(),
            CreatedAt = DateTime.UtcNow
        };

        if (request.Targets != null && request.Targets.Any())
        {
            foreach (var t in request.Targets)
            {
                announcement.Targets.Add(new AnnouncementTarget
                {
                    TargetType = t.TargetType.ToUpper(),
                    TargetEntityId = t.TargetType.ToUpper() == "ALL" ? null : t.TargetEntityId
                });
            }
        }
        else
        {
            announcement.Targets.Add(new AnnouncementTarget { TargetType = "ALL" });
        }

        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(announcement.Id, creatorEmployeeId, cancellationToken))!;
    }

    public async Task<AnnouncementDto> UpdateAsync(
        long id, 
        UpdateAnnouncementRequest request, 
        CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements
            .Include(a => a.Targets)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (announcement == null)
        {
            throw new KeyNotFoundException($"ไม่พบประกาศรหัส ID {id}");
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("หัวข้อประกาศต้องไม่เป็นค่าว่าง");
        }

        announcement.Title = request.Title.Trim();
        announcement.Content = request.Content.Trim();
        announcement.PublishedAt = request.PublishedAt;
        announcement.ExpireAt = request.ExpireAt;
        announcement.Status = string.IsNullOrWhiteSpace(request.Status) ? announcement.Status : request.Status.ToUpper();
        announcement.IsPinned = request.IsPinned;
        announcement.BannerImageUrl = request.BannerImageUrl?.Trim();
        announcement.Category = string.IsNullOrWhiteSpace(request.Category) ? "GENERAL" : request.Category.ToUpper();
        announcement.Priority = string.IsNullOrWhiteSpace(request.Priority) ? "NORMAL" : request.Priority.ToUpper();
        announcement.UpdatedAt = DateTime.UtcNow;

        if (announcement.Status == "PUBLISHED" && !announcement.PublishedAt.HasValue)
        {
            announcement.PublishedAt = DateTime.UtcNow;
        }

        // ปรับปรุงกลุ่มเป้าหมาย
        _context.AnnouncementTargets.RemoveRange(announcement.Targets);
        announcement.Targets.Clear();

        if (request.Targets != null && request.Targets.Any())
        {
            foreach (var t in request.Targets)
            {
                announcement.Targets.Add(new AnnouncementTarget
                {
                    AnnouncementId = announcement.Id,
                    TargetType = t.TargetType.ToUpper(),
                    TargetEntityId = t.TargetType.ToUpper() == "ALL" ? null : t.TargetEntityId
                });
            }
        }
        else
        {
            announcement.Targets.Add(new AnnouncementTarget
            {
                AnnouncementId = announcement.Id,
                TargetType = "ALL"
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(announcement.Id, null, cancellationToken))!;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements
            .Include(a => a.Targets)
            .Include(a => a.Reads)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (announcement == null)
        {
            return false;
        }

        _context.AnnouncementTargets.RemoveRange(announcement.Targets);
        _context.AnnouncementReads.RemoveRange(announcement.Reads);
        _context.Announcements.Remove(announcement);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> TogglePinAsync(long id, CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements.FindAsync([id], cancellationToken);
        if (announcement == null)
        {
            return false;
        }

        announcement.IsPinned = !announcement.IsPinned;
        announcement.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return announcement.IsPinned;
    }

    public async Task<bool> SetPublishStatusAsync(long id, bool publish, CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements.FindAsync([id], cancellationToken);
        if (announcement == null)
        {
            return false;
        }

        if (publish)
        {
            announcement.Status = "PUBLISHED";
            announcement.PublishedAt ??= DateTime.UtcNow;
        }
        else
        {
            announcement.Status = "DRAFT";
        }

        announcement.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> MarkAsReadAsync(long id, long employeeId, CancellationToken cancellationToken = default)
    {
        var exists = await _context.Announcements.AnyAsync(a => a.Id == id, cancellationToken);
        if (!exists)
        {
            return false;
        }

        var read = await _context.AnnouncementReads
            .FirstOrDefaultAsync(r => r.AnnouncementId == id && r.EmployeeId == employeeId, cancellationToken);

        if (read != null)
        {
            return true; // อ่านแล้ว
        }

        _context.AnnouncementReads.Add(new AnnouncementRead
        {
            AnnouncementId = id,
            EmployeeId = employeeId,
            ReadAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<AnnouncementReadStatsDto> GetReadStatsAsync(long id, CancellationToken cancellationToken = default)
    {
        var announcement = await _context.Announcements
            .AsNoTracking()
            .Include(a => a.Targets)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (announcement == null)
        {
            throw new KeyNotFoundException($"ไม่พบประกาศรหัส ID {id}");
        }

        // รายชื่อพนักงานที่เปิดอ่านแล้ว
        var receipts = await _context.AnnouncementReads
            .AsNoTracking()
            .Where(r => r.AnnouncementId == id)
            .OrderByDescending(r => r.ReadAt)
            .Select(r => new ReadReceiptDto
            {
                EmployeeId = r.EmployeeId,
                EmployeeCode = r.Employee.EmployeeCode,
                EmployeeName = r.Employee.FullName,
                DepartmentName = _context.EmployeeAssignments
                    .Where(a => a.EmployeeId == r.EmployeeId && a.IsCurrent)
                    .Select(a => a.Department != null ? a.Department.DepartmentName : null)
                    .FirstOrDefault(),
                ReadAt = r.ReadAt
            })
            .ToListAsync(cancellationToken);

        // คำนวณจำนวนกลุ่มเป้าหมายทั้งหมด
        int totalTargetEmployees;
        var hasAll = announcement.Targets.Any(t => t.TargetType == "ALL");
        if (hasAll || !announcement.Targets.Any())
        {
            totalTargetEmployees = await _context.EmployeeAssignments.CountAsync(a => a.IsCurrent, cancellationToken);
        }
        else
        {
            var deptIds = announcement.Targets.Where(t => t.TargetType == "DEPARTMENT" && t.TargetEntityId.HasValue).Select(t => t.TargetEntityId!.Value).ToList();
            var divIds = announcement.Targets.Where(t => t.TargetType == "DIVISION" && t.TargetEntityId.HasValue).Select(t => t.TargetEntityId!.Value).ToList();
            var levelIds = announcement.Targets.Where(t => t.TargetType == "EMPLOYEE_LEVEL" && t.TargetEntityId.HasValue).Select(t => t.TargetEntityId!.Value).ToList();

            totalTargetEmployees = await _context.EmployeeAssignments
                .Where(a => a.IsCurrent &&
                    (deptIds.Contains(a.DepartmentId) || 
                     divIds.Contains(a.DivisionId) ||
                     (a.EmployeeLevelId.HasValue && levelIds.Contains(a.EmployeeLevelId.Value))))
                .Select(a => a.EmployeeId)
                .Distinct()
                .CountAsync(cancellationToken);
        }

        totalTargetEmployees = Math.Max(totalTargetEmployees, receipts.Count);

        var readPercentage = totalTargetEmployees > 0 
            ? Math.Round(((double)receipts.Count / totalTargetEmployees) * 100, 1) 
            : 0;

        return new AnnouncementReadStatsDto
        {
            AnnouncementId = announcement.Id,
            Title = announcement.Title,
            TotalTargetEmployees = totalTargetEmployees,
            ReadCount = receipts.Count,
            ReadPercentage = readPercentage,
            Receipts = receipts
        };
    }

    private static AnnouncementDto MapToDto(
        Announcement a, 
        long? currentEmployeeId = null,
        Dictionary<long, string>? departments = null,
        Dictionary<long, string>? divisions = null,
        Dictionary<long, string>? levels = null,
        int totalTargetCount = 0)
    {
        var targetDtos = a.Targets.Select(t =>
        {
            string? name = null;
            if (t.TargetEntityId.HasValue)
            {
                name = t.TargetType switch
                {
                    "DEPARTMENT" => departments?.GetValueOrDefault(t.TargetEntityId.Value),
                    "DIVISION" => divisions?.GetValueOrDefault(t.TargetEntityId.Value),
                    "EMPLOYEE_LEVEL" => levels?.GetValueOrDefault(t.TargetEntityId.Value),
                    _ => null
                };
            }

            return new AnnouncementTargetDto
            {
                Id = t.Id,
                TargetType = t.TargetType,
                TargetEntityId = t.TargetEntityId,
                TargetEntityName = name
            };
        }).ToList();

        var readByCur = currentEmployeeId.HasValue && a.Reads.Any(r => r.EmployeeId == currentEmployeeId.Value);
        var readAtCur = currentEmployeeId.HasValue 
            ? a.Reads.FirstOrDefault(r => r.EmployeeId == currentEmployeeId.Value)?.ReadAt 
            : null;

        var authorName = a.CreatedByEmployee != null 
            ? a.CreatedByEmployee.FullName 
            : "ผู้ดูแลระบบ";

        return new AnnouncementDto
        {
            Id = a.Id,
            Title = a.Title,
            Content = a.Content,
            PublishedAt = a.PublishedAt,
            ExpireAt = a.ExpireAt,
            CreatedByEmployeeId = a.CreatedByEmployeeId,
            CreatedByEmployeeName = authorName,
            Status = a.Status,
            IsPinned = a.IsPinned,
            BannerImageUrl = a.BannerImageUrl,
            Category = a.Category,
            Priority = a.Priority,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt,
            Targets = targetDtos,
            ReadCount = a.Reads.Count,
            TotalTargetCount = totalTargetCount,
            IsReadByCurrentUser = readByCur,
            ReadAtByCurrentUser = readAtCur
        };
    }
}
