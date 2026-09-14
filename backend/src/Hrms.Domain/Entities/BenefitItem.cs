namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.benefit_item'
/// จัดเก็บรายการสิทธิประโยชน์และสวัสดิการขององค์กร (เช่น ประกันสังคม, วันลา, ค่าล่วงเวลา, ประกันกลุ่ม, ตรวจสุขภาพ, ค่าอาหาร)
/// </summary>
public class BenefitItem
{
    public long Id { get; set; }
    public string BenefitCode { get; set; } = string.Empty;
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER"; // STATUTORY, HEALTH, ALLOWANCE, WELLNESS, FINANCIAL, OTHER
    public string? Description { get; set; }
    public bool IsStatutory { get; set; } = false;
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<EmployeeTypeBenefit> EmployeeTypeBenefits { get; set; } = new List<EmployeeTypeBenefit>();
}
