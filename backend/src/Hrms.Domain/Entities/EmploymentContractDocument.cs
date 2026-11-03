using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ไฟล์แนบของสัญญาจ้างงาน (แนบได้หลายไฟล์ต่อสัญญา)
/// แมปกับตาราง hrms.employment_contract_document
/// </summary>
public class EmploymentContractDocument : BaseEntity
{
    public long ContractId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public long? FileSize { get; set; }
    public byte[] FileData { get; set; } = Array.Empty<byte>();
    public DateTime UploadedAt { get; set; }

    public virtual EmploymentContract? Contract { get; set; }
}
