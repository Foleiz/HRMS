namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.employee_type_benefit'
/// จับคู่ความสัมพันธ์ระหว่างประเภทสัญญา/การจ้างงาน (EmployeeType) กับสิทธิประโยชน์ (BenefitItem)
/// </summary>
public class EmployeeTypeBenefit
{
    public long Id { get; set; }
    public long EmployeeTypeId { get; set; }
    public long BenefitItemId { get; set; }
    public decimal CoverageAmount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public EmployeeType EmployeeType { get; set; } = null!;
    public BenefitItem BenefitItem { get; set; } = null!;
}
