using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ตาราง Master ข้อมูลสัญชาติ (Mapping: hrms.nationality)
/// </summary>
[Table("nationality", Schema = "hrms")]
public class Nationality : BaseEntity
{
    [Column("nationality_name")]
    [Required]
    [MaxLength(100)]
    public string NationalityName { get; set; } = string.Empty;
}

/// <summary>
/// ตาราง Master ข้อมูลศาสนา (Mapping: hrms.religion)
/// </summary>
[Table("religion", Schema = "hrms")]
public class Religion : BaseEntity
{
    [Column("religion_name")]
    [Required]
    [MaxLength(100)]
    public string ReligionName { get; set; } = string.Empty;
}

/// <summary>
/// ตาราง Master ข้อมูลสถานภาพสมรส (Mapping: hrms.marital_status_type)
/// </summary>
[Table("marital_status_type", Schema = "hrms")]
public class MaritalStatusType : BaseEntity
{
    [Column("marital_status_name")]
    [Required]
    [MaxLength(100)]
    public string MaritalStatusName { get; set; } = string.Empty;
}
