using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Application.Features.MasterData.DTOs;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MasterData.Services;

public class DocumentTypeService : IDocumentTypeService
{
    private readonly IHrmsDbContext _context;

    public DocumentTypeService(IHrmsDbContext context)
    {
        _context = context;
    }

    public async Task<List<DocumentTypeDto>> GetAllAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.DocumentTypes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(d => d.Status.ToUpper() == status.Trim().ToUpper());
        }

        return await query
            .OrderBy(d => d.Id)
            .Select(d => new DocumentTypeDto
            {
                Id = d.Id,
                DocumentCode = d.DocumentCode,
                DocumentName = d.DocumentName,
                IsExpiryRequired = d.IsExpiryRequired,
                NotifyBeforeDays = d.NotifyBeforeDays,
                ValidityMonths = d.ValidityMonths,
                Status = d.Status
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<DocumentTypeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DocumentTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

        if (doc == null)
            throw new NotFoundException("ประเภทเอกสารแนบ", id);

        return new DocumentTypeDto
        {
            Id = doc.Id,
            DocumentCode = doc.DocumentCode,
            DocumentName = doc.DocumentName,
            IsExpiryRequired = doc.IsExpiryRequired,
            NotifyBeforeDays = doc.NotifyBeforeDays,
            ValidityMonths = doc.ValidityMonths,
            Status = doc.Status
        };
    }

    public async Task<DocumentTypeDto> CreateAsync(CreateDocumentTypeDto dto, CancellationToken cancellationToken = default)
    {
        // รหัสรันอัตโนมัติ (DOC001, DOC002, ...) ถ้าไม่ได้ระบุมา
        var code = string.IsNullOrWhiteSpace(dto.DocumentCode)
            ? await CodeGenerator.NextAsync(_context.DocumentTypes.Select(d => d.DocumentCode), "DOC", 3, cancellationToken)
            : dto.DocumentCode.Trim().ToUpper();
        var exists = await _context.DocumentTypes
            .AnyAsync(d => d.DocumentCode.ToUpper() == code, cancellationToken);

        if (exists)
            throw new BusinessRuleException($"รหัสประเภทเอกสาร '{code}' มีอยู่ในระบบแล้ว");

        var doc = new DocumentType
        {
            DocumentCode = code,
            DocumentName = dto.DocumentName.Trim(),
            IsExpiryRequired = dto.IsExpiryRequired,
            NotifyBeforeDays = ValidateNotifyDays(dto.NotifyBeforeDays),
            ValidityMonths = ValidateValidityMonths(dto.ValidityMonths),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "ACTIVE" : dto.Status.ToUpper()
        };

        _context.DocumentTypes.Add(doc);
        await _context.SaveChangesAsync(cancellationToken);

        return new DocumentTypeDto
        {
            Id = doc.Id,
            DocumentCode = doc.DocumentCode,
            DocumentName = doc.DocumentName,
            IsExpiryRequired = doc.IsExpiryRequired,
            NotifyBeforeDays = doc.NotifyBeforeDays,
            ValidityMonths = doc.ValidityMonths,
            Status = doc.Status
        };
    }

    public async Task<DocumentTypeDto> UpdateAsync(long id, UpdateDocumentTypeDto dto, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DocumentTypes.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        if (doc == null)
            throw new NotFoundException("ประเภทเอกสารแนบ", id);

        doc.DocumentName = dto.DocumentName.Trim();
        doc.IsExpiryRequired = dto.IsExpiryRequired;
        doc.NotifyBeforeDays = ValidateNotifyDays(dto.NotifyBeforeDays);
        doc.ValidityMonths = ValidateValidityMonths(dto.ValidityMonths);
        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            doc.Status = dto.Status.ToUpper();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new DocumentTypeDto
        {
            Id = doc.Id,
            DocumentCode = doc.DocumentCode,
            DocumentName = doc.DocumentName,
            IsExpiryRequired = doc.IsExpiryRequired,
            NotifyBeforeDays = doc.NotifyBeforeDays,
            ValidityMonths = doc.ValidityMonths,
            Status = doc.Status
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DocumentTypes.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        if (doc == null)
            throw new NotFoundException("ประเภทเอกสารแนบ", id);

        var inUse = await _context.EmployeeDocuments.AnyAsync(d => d.DocumentTypeId == id, cancellationToken);
        if (inUse)
            throw new BusinessRuleException("ไม่สามารถลบได้ เนื่องจากมีเอกสารในแฟ้มพนักงานใช้ประเภทนี้อยู่ (เปลี่ยนสถานะเป็นปิดใช้งานแทนได้)");

        _context.DocumentTypes.Remove(doc);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static int ValidateNotifyDays(int? days)
    {
        if (!days.HasValue) return 30;
        if (days.Value < 1 || days.Value > 365)
            throw new ValidationException("แจ้งเตือนล่วงหน้าต้องอยู่ระหว่าง 1 - 365 วัน");
        return days.Value;
    }

    private static int? ValidateValidityMonths(int? months)
    {
        if (!months.HasValue || months.Value == 0) return null;
        if (months.Value < 1 || months.Value > 600)
            throw new ValidationException("อายุเอกสารต้องอยู่ระหว่าง 1 - 600 เดือน");
        return months.Value;
    }
}
