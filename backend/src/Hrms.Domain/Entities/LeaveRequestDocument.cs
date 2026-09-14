using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// เอกสารแนบประกอบการลา (Leave Request Document)
/// แมปกับตาราง hrms.leave_request_document
/// </summary>
public class LeaveRequestDocument : BaseEntity
{
    public long LeaveRequestId { get; set; }
    public string? FileName { get; set; }
    public byte[]? FileData { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual LeaveRequest? LeaveRequest { get; set; }
}
