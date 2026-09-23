using Hrms.Application.Features.MasterData.DTOs;

namespace Hrms.Application.Features.MasterData.Services;

public interface IDocumentTypeService
{
    Task<List<DocumentTypeDto>> GetAllAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<DocumentTypeDto> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<DocumentTypeDto> CreateAsync(CreateDocumentTypeDto dto, CancellationToken cancellationToken = default);
    Task<DocumentTypeDto> UpdateAsync(long id, UpdateDocumentTypeDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}
