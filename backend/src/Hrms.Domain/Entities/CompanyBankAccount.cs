using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ตารางจัดการบัญชีธนาคารของบริษัท สำหรับจ่ายเงินเดือนพนักงาน (Payroll)
/// แมปกับตาราง hrms.company_bank_account
/// </summary>
[Table("company_bank_account", Schema = "hrms")]
public class CompanyBankAccount : BaseEntity
{
    [Column("company_id")]
    [Required]
    public long CompanyId { get; set; }

    [Column("bank_id")]
    [Required]
    public long BankId { get; set; }

    [Column("account_number")]
    [Required]
    [MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [Column("account_name")]
    [MaxLength(255)]
    public string? AccountName { get; set; }

    [Column("is_primary_payroll_account")]
    public bool IsPrimaryPayrollAccount { get; set; } = false;

    [Column("status")]
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";

    // Navigation Properties
    [ForeignKey(nameof(CompanyId))]
    public virtual Company Company { get; set; } = null!;

    [ForeignKey(nameof(BankId))]
    public virtual Bank Bank { get; set; } = null!;
}
