using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ตาราง Master ข้อมูลธนาคารพาณิชย์ (Mapping: hrms.bank)
/// </summary>
[Table("bank", Schema = "hrms")]
public class Bank : BaseEntity
{
    [Column("bank_code")]
    [Required]
    [MaxLength(50)]
    public string BankCode { get; set; } = string.Empty;

    [Column("bank_name")]
    [Required]
    [MaxLength(255)]
    public string BankName { get; set; } = string.Empty;

    [Column("status")]
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";
}
