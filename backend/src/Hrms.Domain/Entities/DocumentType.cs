using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ตาราง Master ประเภทเอกสารแนบประจำตัวพนักงาน (Mapping: hrms.document_type)
/// </summary>
[Table("document_type", Schema = "hrms")]
public class DocumentType : BaseEntity
{
    [Column("document_code")]
    [Required]
    [MaxLength(50)]
    public string DocumentCode { get; set; } = string.Empty;

    [Column("document_name")]
    [Required]
    [MaxLength(255)]
    public string DocumentName { get; set; } = string.Empty;

    [Column("is_expiry_required")]
    public bool IsExpiryRequired { get; set; } = false;

    [Column("status")]
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";
}
