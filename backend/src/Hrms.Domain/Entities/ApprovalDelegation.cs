using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// การมอบอำนาจอนุมัติแทน (Approval Delegation) — ให้พนักงานอีกคน (Delegate) อนุมัติเอกสารแทนตนเอง (Delegator)
/// ในช่วงวันที่กำหนด (เช่น ช่วงลาพักร้อน/ไปราชการของหัวหน้างาน)
/// แมปกับตาราง hrms.approval_delegation
/// </summary>
public class ApprovalDelegation : BaseEntity
{
    public long DelegatorEmployeeId { get; set; }
    public long DelegateEmployeeId { get; set; }

    /// <summary>ถ้าระบุ = มอบอำนาจเฉพาะเอกสารประเภทนี้ (null = มอบอำนาจทุกประเภทเอกสาร)</summary>
    public string? DocumentType { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

    // Navigation Properties
    public virtual Employee? DelegatorEmployee { get; set; }
    public virtual Employee? DelegateEmployee { get; set; }
}
