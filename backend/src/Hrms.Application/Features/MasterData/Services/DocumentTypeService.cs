using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
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
            Status = doc.Status
        };
    }

    public async Task<DocumentTypeDto> CreateAsync(CreateDocumentTypeDto dto, CancellationToken cancellationToken = default)
    {
        var code = dto.DocumentCode.Trim().ToUpper();
        var exists = await _context.DocumentTypes
            .AnyAsync(d => d.DocumentCode.ToUpper() == code, cancellationToken);

        if (exists)
            throw new BusinessRuleException($"รหัสประเภทเอกสาร '{dto.DocumentCode}' มีอยู่ในระบบแล้ว");

        var doc = new DocumentType
        {
            DocumentCode = code,
            DocumentName = dto.DocumentName.Trim(),
            IsExpiryRequired = dto.IsExpiryRequired,
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
            Status = doc.Status
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DocumentTypes.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        if (doc == null)
            throw new NotFoundException("ประเภทเอกสารแนบ", id);

        _context.DocumentTypes.Remove(doc);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
