using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ระดับขั้นพนักงาน (Employee Level Master: L1, L2, L3, ...)
/// แมปกับตาราง hrms.employee_level
/// </summary>
public class EmployeeLevel : BaseEntity
{
    public string LevelCode { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
    public int? LevelRank { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public decimal? MinSalary { get; set; }
    public decimal? MaxSalary { get; set; }
    public decimal? ApprovalLimit { get; set; }
    public long? DefaultFlowId { get; set; }

    // Navigation Properties
    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();
}
