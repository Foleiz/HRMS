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

    /// <summary>แจ้งเตือนล่วงหน้ากี่วันก่อนเอกสารหมดอายุ</summary>
    [Column("notify_before_days")]
    public int NotifyBeforeDays { get; set; } = 30;

    /// <summary>อายุเอกสาร (เดือน) — ใช้คำนวณวันหมดอายุจากวันที่ออกให้อัตโนมัติ (null = ไม่กำหนด)</summary>
    [Column("validity_months")]
    public int? ValidityMonths { get; set; }

    [Column("status")]
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";
}
