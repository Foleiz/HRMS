using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ข้อมูลบัญชีธนาคารสำหรับจ่ายเงินเดือนของพนักงาน
/// แมปกับตาราง hrms.employee_bank_account
/// </summary>
public class EmployeeBankAccount : BaseEntity
{
    public long EmployeeId { get; set; }
    public long BankId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountType { get; set; }
    public string? AccountName { get; set; }
    public bool IsPrimary { get; set; } = false;
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual Bank Bank { get; set; } = null!;
}
