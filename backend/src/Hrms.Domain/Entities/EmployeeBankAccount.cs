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
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE, PENDING_VERIFY, REJECTED

    /// <summary>HMAC ของเลขบัญชี (ใช้ตรวจเลขซ้ำ เพราะ AccountNumber ถูกเข้ารหัสแบบสุ่ม IV)</summary>
    public string? AccountHash { get; set; }

    /// <summary>ผู้ขอเปลี่ยนบัญชี / เวลา (บัญชีที่รอยืนยัน)</summary>
    public DateTime? RequestedAt { get; set; }
    public long? RequestedByUserId { get; set; }

    /// <summary>ผู้ยืนยันบัญชี / เวลา (ต้องไม่ใช่คนเดียวกับผู้ขอ)</summary>
    public DateTime? VerifiedAt { get; set; }
    public long? VerifiedByUserId { get; set; }

    public string? RejectReason { get; set; }

    // Navigation Properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual Bank Bank { get; set; } = null!;
}
