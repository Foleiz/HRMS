using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Utilities;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.EmployeeDocuments.Services;

/// <summary>
/// คัดลอกไฟล์จากคำขอเอกสารทั่วไปที่อนุมัติแล้ว เข้าแฟ้มเอกสารพนักงาน (hrms.employee_document)
/// เพิ่มรายการเข้า DbContext เท่านั้น — ผู้เรียกเป็นคน SaveChanges
/// </summary>
public static class EmployeeDocumentArchiver
{
    // ชื่อประเภทในฟอร์มคำขอเอกสารทั่วไป → รหัสประเภทเอกสารใน Master ที่มีอยู่แล้ว
    private static readonly Dictionary<string, string> RequestTypeToDocumentCode = new(StringComparer.OrdinalIgnoreCase)
    {
        ["สำเนาบัตรประจำตัวประชาชน"] = "DOC_ID_CARD",
        ["สำเนาทะเบียนบ้าน"] = "DOC_HOUSE_REG",
        ["สำเนาวุฒิการศึกษา / ทรานสคริปต์"] = "DOC_TRANSCRIPT",
        ["ใบรับรองแพทย์ / ใบตรวจสุขภาพ"] = "DOC_MED_CERT",
    };

    public static async Task ArchiveGeneralRequestAsync(
        IHrmsDbContext context,
        GeneralRequest request,
        long? archivedByEmployeeId,
        CancellationToken cancellationToken = default)
    {
        // ไม่มีไฟล์แนบ → ไม่มีอะไรให้เก็บเข้าแฟ้ม
        if (request.FileData == null || request.FileData.Length == 0) return;

        // กันคัดลอกซ้ำ
        var exists = await context.EmployeeDocuments
            .AnyAsync(d => d.SourceGeneralRequestId == request.Id, cancellationToken);
        if (exists) return;

        var document = new EmployeeDocument
        {
            EmployeeId = request.EmployeeId,
            FileName = request.FileName,
            FileMimeType = request.FileMimeType,
            FileSize = request.FileSize ?? request.FileData.LongLength,
            FileData = request.FileData,
            IssuedDate = request.IssueDate,
            ExpiryDate = request.ExpiryDate is { } exp && request.IssueDate is { } iss && exp < iss ? null : request.ExpiryDate,
            Remarks = BuildRemarks(request),
            UploadedAt = DateTime.UtcNow,
            UploadedByEmployeeId = archivedByEmployeeId,
            SourceGeneralRequestId = request.Id
        };

        var type = await ResolveDocumentTypeAsync(context, request, cancellationToken);
        if (type.Id > 0) document.DocumentTypeId = type.Id;
        else document.DocumentType = type;

        context.EmployeeDocuments.Add(document);
    }

    private static async Task<DocumentType> ResolveDocumentTypeAsync(
        IHrmsDbContext context, GeneralRequest request, CancellationToken cancellationToken)
    {
        var name = (request.RequestType ?? string.Empty).Trim();
        if (name.Length == 0) name = "เอกสารทั่วไปอื่น ๆ";

        if (RequestTypeToDocumentCode.TryGetValue(name, out var code))
        {
            var byCode = await context.DocumentTypes.FirstOrDefaultAsync(d => d.DocumentCode == code, cancellationToken);
            if (byCode != null) return byCode;
        }

        var byName = await context.DocumentTypes.FirstOrDefaultAsync(d => d.DocumentName == name, cancellationToken);
        if (byName != null) return byName;

        // ยังไม่มีใน Master → สร้างประเภทใหม่ให้อัตโนมัติ
        var newType = new DocumentType
        {
            DocumentCode = await CodeGenerator.NextAsync(context.DocumentTypes.Select(d => d.DocumentCode), "DOC", 3, cancellationToken),
            DocumentName = name.Length > 255 ? name[..255] : name,
            IsExpiryRequired = false,
            Status = "ACTIVE"
        };
        context.DocumentTypes.Add(newType);
        return newType;
    }

    private static string BuildRemarks(GeneralRequest request)
    {
        var no = string.IsNullOrEmpty(request.RequestNo) ? $"GR-{request.Id:D4}" : request.RequestNo;
        var purpose = (request.Purpose ?? string.Empty).Trim();
        return purpose.Length == 0 ? $"จากคำขอ {no}" : $"จากคำขอ {no}: {purpose}";
    }
}
