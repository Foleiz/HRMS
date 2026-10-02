namespace Hrms.Application.Features.MasterData.DTOs;

public class BenefitItemDto
{
    public long Id { get; set; }
    public string BenefitCode { get; set; } = string.Empty;
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public bool IsStatutory { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public int AssignedTypesCount { get; set; }
    public decimal CoverageAmount { get; set; } = 0;
    public string Frequency { get; set; } = "MONTHLY";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateBenefitItemRequest
{
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? BenefitCode { get; set; }
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public bool IsStatutory { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateBenefitItemRequest
{
    public string BenefitName { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string? Description { get; set; }
    public bool IsStatutory { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
