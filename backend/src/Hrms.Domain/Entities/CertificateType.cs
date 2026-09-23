using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประเภทหนังสือรับรอง (Certificate Type)
/// แมปกับตาราง hrms.certificate_type
/// </summary>
public class CertificateType : BaseEntity
{
    public string CertificateCode { get; set; } = string.Empty;
    public string CertificateName { get; set; } = string.Empty;

    // Navigation Properties
    public virtual ICollection<CertificateRequest> Requests { get; set; } = new List<CertificateRequest>();
}
