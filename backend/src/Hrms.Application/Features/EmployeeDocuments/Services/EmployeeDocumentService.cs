using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.EmployeeDocuments.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.EmployeeDocuments.Services;

/// <summary>
/// แฟ้มเอกสารพนักงาน — ฝ่ายบุคคล/แอดมินดู อัปโหลด ลบได้ / พนักงานดูและดาวน์โหลดเอกสารของตัวเองได้
/// </summary>
public class EmployeeDocumentService : IEmployeeDocumentService
{
    private const long MaxFileBytes = 5 * 1024 * 1024;

    private static readonly string[] AdminRoles = { "ADMIN", "SUPER_ADMIN", "SYS_ADMIN", "SYSTEM_SUPER" };
    private static readonly string[] HrRoles = { "HR", "HR_ADMIN", "HR_MGR" };

    private readonly IHrmsDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public EmployeeDocumentService(IHrmsDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    private bool IsHrOrAdmin => AdminRoles.Any(_currentUser.HasRole) || HrRoles.Any(_currentUser.HasRole);

    public async Task<List<EmployeeDocumentDto>> GetByEmployeeAsync(long employeeId, CancellationToken cancellationToken = default)
    {
        if (!IsHrOrAdmin && _currentUser.EmployeeId != employeeId)
            throw new ForbiddenException("คุณไม่มีสิทธิ์ดูเอกสารของพนักงานคนนี้");

        return await QueryDtosAsync(d => d.EmployeeId == employeeId, cancellationToken);
    }

    public async Task<List<EmployeeDocumentDto>> GetMyDocumentsAsync(CancellationToken cancellationToken = default)
    {
        var me = _currentUser.EmployeeId;
        if (!me.HasValue) return new List<EmployeeDocumentDto>();
        return await QueryDtosAsync(d => d.EmployeeId == me.Value, cancellationToken);
    }

    public async Task<EmployeeDocumentDto> UploadAsync(long employeeId, CreateEmployeeDocumentDto dto, CancellationToken cancellationToken = default)
    {
        if (!IsHrOrAdmin)
            throw new ForbiddenException("เฉพาะฝ่ายบุคคลเท่านั้นที่เพิ่มเอกสารเข้าแฟ้มพนักงานได้");

        var employeeExists = await _context.Employees.AnyAsync(e => e.Id == employeeId, cancellationToken);
        if (!employeeExists) throw new NotFoundException("พนักงาน", employeeId);

        var type = await _context.DocumentTypes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == dto.DocumentTypeId, cancellationToken)
            ?? throw new ValidationException("กรุณาเลือกประเภทเอกสาร");
        if (type.Status != "ACTIVE")
            throw new ValidationException("ประเภทเอกสารนี้ถูกปิดใช้งานแล้ว");

        if (string.IsNullOrWhiteSpace(dto.FileData))
            throw new ValidationException("กรุณาแนบไฟล์เอกสาร");

        var issued = ParseDate(dto.IssuedDate);
        // ไม่ระบุวันหมดอายุ แต่ประเภทเอกสารกำหนดอายุไว้ → คำนวณจากวันที่ออก
        var expiry = DocumentExpiry.ResolveExpiry(issued, ParseDate(dto.ExpiryDate), type);
        if (type.IsExpiryRequired && !expiry.HasValue)
            throw new ValidationException($"เอกสารประเภท \"{type.DocumentName}\" ต้องระบุวันหมดอายุ");
        if (issued.HasValue && expiry.HasValue && expiry < issued)
            throw new ValidationException("วันหมดอายุต้องไม่ก่อนวันที่ออกเอกสาร");

        var (bytes, mime) = FileDataDecoder.Decode(dto.FileData, dto.FileName);
        if (bytes.LongLength == 0) throw new ValidationException("ไฟล์แนบว่างเปล่า");
        if (bytes.LongLength > MaxFileBytes) throw new ValidationException("ไฟล์แนบต้องมีขนาดไม่เกิน 5 MB");

        var document = new EmployeeDocument
        {
            EmployeeId = employeeId,
            DocumentTypeId = type.Id,
            FileName = string.IsNullOrWhiteSpace(dto.FileName) ? "document" : Path.GetFileName(dto.FileName.Trim()),
            FileMimeType = mime,
            FileSize = bytes.LongLength,
            FileData = bytes,
            IssuedDate = issued,
            ExpiryDate = expiry,
            Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? null : dto.Remarks.Trim(),
            UploadedAt = DateTime.UtcNow,
            UploadedByEmployeeId = _currentUser.EmployeeId
        };

        _context.EmployeeDocuments.Add(document);
        await _context.SaveChangesAsync(cancellationToken);

        return (await QueryDtosAsync(d => d.Id == document.Id, cancellationToken)).First();
    }

    public async Task<EmployeeDocumentFile> GetFileAsync(long id, CancellationToken cancellationToken = default)
    {
        var doc = await _context.EmployeeDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new NotFoundException("เอกสาร", id);

        if (!IsHrOrAdmin && _currentUser.EmployeeId != doc.EmployeeId)
            throw new ForbiddenException("คุณไม่มีสิทธิ์ดาวน์โหลดเอกสารนี้");

        if (doc.FileData == null || doc.FileData.Length == 0)
            throw new NotFoundException("เอกสารนี้ไม่มีไฟล์แนบ");

        return new EmployeeDocumentFile
        {
            FileName = doc.FileName ?? "document",
            MimeType = doc.FileMimeType ?? "application/octet-stream",
            Data = doc.FileData
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!IsHrOrAdmin)
            throw new ForbiddenException("เฉพาะฝ่ายบุคคลเท่านั้นที่ลบเอกสารในแฟ้มพนักงานได้");

        var doc = await _context.EmployeeDocuments.FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new NotFoundException("เอกสาร", id);

        _context.EmployeeDocuments.Remove(doc);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<EmployeeDocumentDto>> GetExpiringAsync(string? status, CancellationToken cancellationToken = default)
    {
        if (!IsHrOrAdmin)
            throw new ForbiddenException("เฉพาะฝ่ายบุคคลเท่านั้นที่ดูรายการเอกสารใกล้หมดอายุได้");

        // ช่วงแจ้งเตือนสูงสุดคือ 365 วัน — กรองเบื้องต้นในฐานข้อมูล แล้วคำนวณสถานะจริงตามประเภทเอกสาร
        var horizon = DocumentExpiry.Today().AddDays(365);
        var list = await QueryDtosAsync(d => d.ExpiryDate != null && d.ExpiryDate <= horizon, cancellationToken, includeEmployee: true);

        var wanted = (status ?? string.Empty).Trim().ToUpperInvariant();
        return list
            .Where(d => wanted == DocumentExpiry.Expired || wanted == DocumentExpiry.ExpiringSoon
                ? d.ExpiryStatus == wanted
                : d.ExpiryStatus is DocumentExpiry.Expired or DocumentExpiry.ExpiringSoon)
            .OrderBy(d => d.DaysToExpiry)
            .ThenBy(d => d.EmployeeName)
            .ToList();
    }

    // ───────────────────────── helpers ─────────────────────────

    private async Task<List<EmployeeDocumentDto>> QueryDtosAsync(
        System.Linq.Expressions.Expression<Func<EmployeeDocument, bool>> predicate,
        CancellationToken cancellationToken,
        bool includeEmployee = false)
    {
        // ไม่ดึง file_data มาด้วย (ไฟล์ใหญ่) — ดาวน์โหลดแยกทีละไฟล์
        var rows = await _context.EmployeeDocuments.AsNoTracking()
            .Where(predicate)
            .OrderBy(d => d.DocumentType.DocumentName)
            .ThenByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                d.Id,
                d.EmployeeId,
                d.DocumentTypeId,
                TypeCode = d.DocumentType.DocumentCode,
                TypeName = d.DocumentType.DocumentName,
                d.DocumentType.IsExpiryRequired,
                d.DocumentType.NotifyBeforeDays,
                EmpCode = d.Employee.EmployeeCode,
                EmpPrefix = d.Employee.Prefix,
                EmpFirstName = d.Employee.FirstName,
                EmpLastName = d.Employee.LastName,
                d.FileName,
                d.FileMimeType,
                d.FileSize,
                HasFile = d.FileData != null,
                d.IssuedDate,
                d.ExpiryDate,
                d.Remarks,
                d.UploadedAt,
                UploadedByPrefix = d.UploadedByEmployee != null ? d.UploadedByEmployee.Prefix : null,
                UploadedByFirstName = d.UploadedByEmployee != null ? d.UploadedByEmployee.FirstName : null,
                UploadedByLastName = d.UploadedByEmployee != null ? d.UploadedByEmployee.LastName : null,
                d.SourceGeneralRequestId
            })
            .ToListAsync(cancellationToken);

        var sourceIds = rows.Where(r => r.SourceGeneralRequestId.HasValue)
            .Select(r => r.SourceGeneralRequestId!.Value).Distinct().ToList();
        var requestNos = sourceIds.Count == 0
            ? new Dictionary<long, string>()
            : await _context.GeneralRequests.AsNoTracking()
                .Where(g => sourceIds.Contains(g.Id))
                .ToDictionaryAsync(g => g.Id, g => g.RequestNo, cancellationToken);

        var today = DocumentExpiry.Today();

        var departments = new Dictionary<long, string>();
        if (includeEmployee && rows.Count > 0)
        {
            var empIds = rows.Select(r => r.EmployeeId).Distinct().ToList();
            departments = (await _context.EmployeeAssignments.AsNoTracking()
                    .Where(a => empIds.Contains(a.EmployeeId) && a.IsCurrent)
                    .Select(a => new { a.EmployeeId, a.EffectiveFrom, Name = a.Department != null ? a.Department.DepartmentName : null })
                    .ToListAsync(cancellationToken))
                .GroupBy(a => a.EmployeeId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.EffectiveFrom).First().Name ?? "-");
        }

        return rows.Select(r =>
        {
            var (expiryStatus, days) = DocumentExpiry.GetStatus(r.ExpiryDate, r.NotifyBeforeDays, today);
            string? requestNo = null;
            if (r.SourceGeneralRequestId is { } sid)
                requestNo = requestNos.TryGetValue(sid, out var no) && !string.IsNullOrEmpty(no) ? no : $"GR-{sid:D4}";

            return new EmployeeDocumentDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeCode = r.EmpCode,
                EmployeeName = $"{r.EmpPrefix} {r.EmpFirstName} {r.EmpLastName}".Trim(),
                DepartmentName = departments.TryGetValue(r.EmployeeId, out var dept) ? dept : null,
                DocumentTypeId = r.DocumentTypeId,
                DocumentTypeCode = r.TypeCode,
                DocumentTypeName = r.TypeName,
                IsExpiryRequired = r.IsExpiryRequired,
                NotifyBeforeDays = r.NotifyBeforeDays,
                FileName = r.FileName,
                FileMimeType = r.FileMimeType,
                FileSize = r.FileSize,
                HasFile = r.HasFile,
                IssuedDate = r.IssuedDate?.ToString("yyyy-MM-dd"),
                ExpiryDate = r.ExpiryDate?.ToString("yyyy-MM-dd"),
                ExpiryStatus = expiryStatus,
                DaysToExpiry = days,
                Remarks = r.Remarks,
                UploadedAt = r.UploadedAt,
                UploadedByName = r.UploadedByFirstName == null ? null : $"{r.UploadedByPrefix} {r.UploadedByFirstName} {r.UploadedByLastName}".Trim(),
                SourceGeneralRequestId = r.SourceGeneralRequestId,
                SourceRequestNo = requestNo
            };
        }).ToList();
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d)
            ? d
            : null;
}
