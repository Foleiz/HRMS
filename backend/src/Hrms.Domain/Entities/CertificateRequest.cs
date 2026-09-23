using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// คำร้องขอหนังสือรับรอง (Certificate Request)
/// แมปกับตาราง hrms.certificate_request
/// </summary>
public class CertificateRequest : BaseEntity
{
    public long EmployeeId { get; set; }
    public long CertificateTypeId { get; set; }
    public string? Purpose { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, ISSUED, CANCELLED
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public string? IssuedFileUrl { get; set; }
    public DateTime? IssuedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual CertificateType CertificateType { get; set; } = null!;
    public virtual ApprovalInstance? ApprovalInstance { get; set; }
}
