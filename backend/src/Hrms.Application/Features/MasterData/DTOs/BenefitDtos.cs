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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateBenefitItemRequest
{
    public string BenefitCode { get; set; } = string.Empty;
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
