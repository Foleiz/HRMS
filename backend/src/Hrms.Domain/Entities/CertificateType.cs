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
    /// <summary>อายุหนังสือรับรอง (เดือน) นับจากวันที่ออก — null = ไม่ระบุวันหมดอายุ</summary>
    public int? ValidityMonths { get; set; }

    // Navigation Properties
    public virtual ICollection<CertificateRequest> Requests { get; set; } = new List<CertificateRequest>();
}
