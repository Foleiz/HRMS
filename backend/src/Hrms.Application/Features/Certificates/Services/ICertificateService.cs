using Hrms.Application.Features.Certificates.DTOs;

namespace Hrms.Application.Features.Certificates.Services;

public interface ICertificateService
{
    Task<List<CertificateTypeDto>> GetCertificateTypesAsync(CancellationToken cancellationToken = default);
    Task<List<CertificateRequestDto>> GetMyRequestsAsync(CancellationToken cancellationToken = default);
    Task<List<CertificateRequestDto>> GetAllRequestsAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<CertificateRequestDto> CreateRequestAsync(CreateCertificateRequestDto dto, CancellationToken cancellationToken = default);
    Task<CertificateRequestDto?> GetRequestByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CertificateRequestDto> ApproveRequestAsync(long id, long approverId, string? comment = null, CancellationToken cancellationToken = default);
    Task<CertificateRequestDto> RejectRequestAsync(long id, long approverId, string reason, CancellationToken cancellationToken = default);
    Task<bool> CancelRequestAsync(long requestId, string? reason = null, CancellationToken cancellationToken = default);
    Task<CertificateDocumentDto> GetCertificateDocumentAsync(long requestId, string? lang = "TH", CancellationToken cancellationToken = default);
    Task<List<EmployeeSignatureDto>> GetActiveSignaturesAsync(CancellationToken cancellationToken = default);
    Task<EmployeeSignatureDto> UploadSignatureAsync(SignatureUploadDto dto, CancellationToken cancellationToken = default);
}
