using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สายการอนุมัติเอกสารกลาง (Approval Flow) — กำหนดว่าเอกสารประเภทใด (เช่น ใบลา, ใบลาออก)
/// สำหรับแผนก/ระดับพนักงานใด ต้องผ่านขั้นตอนการอนุมัติแบบใดบ้าง (Multi-step Approvals)
/// แมปกับตาราง hrms.approval_flow
/// </summary>
public class ApprovalFlow : BaseEntity
{
    public string FlowCode { get; set; } = string.Empty;
    public string FlowName { get; set; } = string.Empty;

    /// <summary>
    /// ประเภทเอกสาร — ตรงกับค่าใน hrms."approval_document_type_enum":
    /// ATTENDANCE_ADJUSTMENT, LEAVE_REQUEST, RESIGNATION_REQUEST, CERTIFICATE_REQUEST, EMPLOYMENT_CONTRACT, PAYROLL_PERIOD
    /// </summary>
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>ถ้าระบุ = flow นี้ใช้เฉพาะแผนกนี้เท่านั้น (null = ใช้ได้ทุกแผนก)</summary>
    public long? DepartmentId { get; set; }

    /// <summary>ถ้าระบุ = flow นี้ใช้เฉพาะระดับพนักงานนี้เท่านั้น (null = ใช้ได้ทุกระดับ)</summary>
    public long? LevelId { get; set; }

    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual Department? Department { get; set; }
    public virtual EmployeeLevel? Level { get; set; }
    public virtual ICollection<ApprovalStep> Steps { get; set; } = new List<ApprovalStep>();
}
