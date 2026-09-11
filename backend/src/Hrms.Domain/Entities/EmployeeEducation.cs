using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ประวัติการศึกษาของพนักงาน (Mapping: hrms.employee_education)
/// </summary>
public class EmployeeEducation : BaseEntity
{
    public long EmployeeId { get; set; }
    public string EducationLevel { get; set; } = string.Empty;
    public string Institution { get; set; } = string.Empty;
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    public decimal? Gpa { get; set; }

    // Navigation Property
    public virtual Employee Employee { get; set; } = null!;
}
