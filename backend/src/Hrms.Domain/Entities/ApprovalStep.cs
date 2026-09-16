using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ขั้นตอนการอนุมัติ (Approval Step) — ขั้นตอนย่อยหนึ่งขั้นภายในสายการอนุมัติ (ApprovalFlow)
/// เรียงลำดับการอนุมัติตาม StepNo (1, 2, 3, ...)
/// แมปกับตาราง hrms.approval_step
/// </summary>
public class ApprovalStep : BaseEntity
{
    public long FlowId { get; set; }
    public int StepNo { get; set; }

    /// <summary>
    /// ประเภทผู้อนุมัติของขั้นตอนนี้: EMPLOYEE (ระบุตัวบุคคล), ROLE (ระบุตามบทบาท),
    /// MANAGER (หัวหน้างานตรงของผู้ยื่น), DEPARTMENT_HEAD (หัวหน้าแผนก), DIVISION_HEAD (หัวหน้าฝ่าย), HR, CEO
    /// </summary>
    public string ApproverType { get; set; } = string.Empty;

    /// <summary>ใช้เมื่อ ApproverType = EMPLOYEE เท่านั้น</summary>
    public long? ApproverEmployeeId { get; set; }

    /// <summary>ใช้เมื่อ ApproverType = ROLE เท่านั้น</summary>
    public long? ApproverRoleId { get; set; }

    /// <summary>ถ้า false = ขั้นตอนนี้ข้ามได้ (optional step)</summary>
    public bool IsRequired { get; set; } = true;

    // Navigation Properties
    public virtual ApprovalFlow? Flow { get; set; }
    public virtual Employee? ApproverEmployee { get; set; }
    public virtual Role? ApproverRole { get; set; }
}
