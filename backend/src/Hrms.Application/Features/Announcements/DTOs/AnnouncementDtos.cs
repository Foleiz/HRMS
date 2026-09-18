namespace Hrms.Application.Features.Announcements.DTOs;

public class AnnouncementTargetDto
{
    public long Id { get; set; }
    public string TargetType { get; set; } = "ALL";
    public long? TargetEntityId { get; set; }
    public string? TargetEntityName { get; set; }
}

public class AnnouncementTargetInput
{
    public string TargetType { get; set; } = "ALL";
    public long? TargetEntityId { get; set; }
}

public class AnnouncementDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpireAt { get; set; }
    public long? CreatedByEmployeeId { get; set; }
    public string? CreatedByEmployeeName { get; set; }
    public string Status { get; set; } = "DRAFT";
    public bool IsPinned { get; set; }
    public string? BannerImageUrl { get; set; }
    public string Category { get; set; } = "GENERAL";
    public string Priority { get; set; } = "NORMAL";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public List<AnnouncementTargetDto> Targets { get; set; } = new();
    
    // Metadata for reader view
    public int ReadCount { get; set; }
    public int TotalTargetCount { get; set; }
    public bool IsReadByCurrentUser { get; set; }
    public DateTime? ReadAtByCurrentUser { get; set; }
}

public class CreateAnnouncementRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpireAt { get; set; }
    public bool IsPinned { get; set; } = false;
    public string? BannerImageUrl { get; set; }
    public string Category { get; set; } = "GENERAL";
    public string Priority { get; set; } = "NORMAL";
    public string Status { get; set; } = "DRAFT"; // DRAFT, PUBLISHED
    public List<AnnouncementTargetInput> Targets { get; set; } = new();
}

public class UpdateAnnouncementRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpireAt { get; set; }
    public bool IsPinned { get; set; }
    public string? BannerImageUrl { get; set; }
    public string Category { get; set; } = "GENERAL";
    public string Priority { get; set; } = "NORMAL";
    public string Status { get; set; } = "DRAFT";
    public List<AnnouncementTargetInput> Targets { get; set; } = new();
}

public class AnnouncementFilterParams
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Category { get; set; }
    public string? Priority { get; set; }
    public bool? IsPinned { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class ReadReceiptDto
{
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public DateTime ReadAt { get; set; }
}

public class AnnouncementReadStatsDto
{
    public long AnnouncementId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int TotalTargetEmployees { get; set; }
    public int ReadCount { get; set; }
    public double ReadPercentage { get; set; }
    public List<ReadReceiptDto> Receipts { get; set; } = new();
}
