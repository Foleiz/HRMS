namespace Hrms.Application.Features.Resignation.Services;

/// <summary>ข้อมูลสำหรับสร้างไฟล์ PDF ใบลาออก (เก็บเข้าแฟ้มเอกสารพนักงาน)</summary>
public sealed class ResignationDocumentModel
{
    public string RequestNo { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public string EmployeeName { get; init; } = string.Empty;
    public string? DepartmentName { get; init; }
    public string? PositionName { get; init; }
    public DateTime SubmittedAt { get; init; }
    public DateOnly LastWorkingDate { get; init; }
    public string? ReasonCategory { get; init; }
    public string? ReasonDetail { get; init; }
    public string? Handover { get; init; }
    public string? ContactAfterResignation { get; init; }
    public List<ResignationApprovalLine> Approvals { get; init; } = new();
}

public sealed class ResignationApprovalLine
{
    public int StepNo { get; init; }
    public string ApproverName { get; init; } = "-";
    public string Decision { get; init; } = "APPROVE";
    public DateTime ActionAt { get; init; }
    public string? Comment { get; init; }
}

/// <summary>ตัวสร้าง PDF ใบลาออก — implementation อยู่ชั้น Infrastructure (PdfSharpCore)</summary>
public interface IResignationPdfRenderer
{
    byte[] Render(ResignationDocumentModel model);
}
