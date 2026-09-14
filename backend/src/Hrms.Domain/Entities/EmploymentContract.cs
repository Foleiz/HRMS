using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// สัญญาจ้างงานของพนักงาน (Employment Contract)
/// แมปกับตาราง hrms.employment_contract
/// </summary>
public class EmploymentContract : BaseEntity
{
    public long EmployeeId { get; set; }
    public long? EmployeeTypeId { get; set; }
    public string ContractType { get; set; } = "PROBATION"; // PROBATION, PERMANENT, FIXED_TERM, OTHER
    public string? WageType { get; set; } = "MONTHLY"; // MONTHLY, DAILY
    public DateOnly StartDate { get; set; }
    public DateOnly? ProbationEndDate { get; set; }
    public DateOnly? ProbationPassedDate { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public DateOnly? TerminationDate { get; set; }
    public string? TerminationReason { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, PENDING_APPROVAL, COMPLETED, TERMINATED, CANCELLED
    public long? ApprovalInstanceId { get; set; }

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual EmployeeType? EmployeeType { get; set; }
}
