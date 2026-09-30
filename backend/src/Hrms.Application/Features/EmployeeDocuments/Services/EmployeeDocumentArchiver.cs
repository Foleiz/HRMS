using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.EmployeeDocuments.Services;

/// <summary>
/// คัดลอกไฟล์จากคำขอเอกสารทั่วไปที่อนุมัติแล้ว เข้าแฟ้มเอกสารพนักงาน (hrms.employee_document)
/// เพิ่มรายการเข้า DbContext เท่านั้น — ผู้เรียกเป็นคน SaveChanges
/// </summary>
public static class EmployeeDocumentArchiver
{
    /// <summary>ประเภทสำหรับเอกสารที่พนักงานระบุประเภทเอง (ไม่ได้เลือกจาก Master)</summary>
    public const string OtherDocumentCode = "DOC_OTHER";
    public const string OtherDocumentName = "เอกสารทั่วไปอื่น ๆ";

    // ชื่อประเภทแบบเดิม (ก่อนผูกกับ Master) → รหัสประเภทเอกสารใน Master — รองรับคำขอเก่า
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
            Remarks = null,
            UploadedAt = DateTime.UtcNow,
            UploadedByEmployeeId = archivedByEmployeeId,
            SourceGeneralRequestId = request.Id
        };

        var type = await ResolveDocumentTypeAsync(context, request, cancellationToken);
        document.Remarks = BuildRemarks(request, type);
        document.ExpiryDate = DocumentExpiry.ResolveExpiry(document.IssuedDate, document.ExpiryDate, type);
        if (type.Id > 0) document.DocumentTypeId = type.Id;
        else document.DocumentType = type;

        context.EmployeeDocuments.Add(document);
    }

    private static async Task<DocumentType> ResolveDocumentTypeAsync(
        IHrmsDbContext context, GeneralRequest request, CancellationToken cancellationToken)
    {
        // 1) เลือกจาก Master ไว้ตอนยื่น
        if (request.DocumentTypeId is { } typeId)
        {
            var byId = await context.DocumentTypes.FirstOrDefaultAsync(d => d.Id == typeId, cancellationToken);
            if (byId != null) return byId;
        }

        // 2) คำขอเก่า/ระบุเอง — จับคู่จากชื่อ
        var name = (request.RequestType ?? string.Empty).Trim();

        if (RequestTypeToDocumentCode.TryGetValue(name, out var code))
        {
            var byCode = await context.DocumentTypes.FirstOrDefaultAsync(d => d.DocumentCode == code, cancellationToken);
            if (byCode != null) return byCode;
        }

        if (name.Length > 0)
        {
            var byName = await context.DocumentTypes.FirstOrDefaultAsync(d => d.DocumentName == name, cancellationToken);
            if (byName != null) return byName;
        }

        // 3) ไม่ตรงกับ Master → เก็บไว้ในหมวด "เอกสารทั่วไปอื่น ๆ" (สร้างให้ถ้ายังไม่มี)
        var other = await context.DocumentTypes.FirstOrDefaultAsync(
            d => d.DocumentCode == OtherDocumentCode || d.DocumentName == OtherDocumentName, cancellationToken);
        if (other != null) return other;

        var newType = new DocumentType
        {
            DocumentCode = OtherDocumentCode,
            DocumentName = OtherDocumentName,
            IsExpiryRequired = false,
            Status = "ACTIVE"
        };
        context.DocumentTypes.Add(newType);
        return newType;
    }

    private static string BuildRemarks(GeneralRequest request, DocumentType type)
    {
        var no = string.IsNullOrEmpty(request.RequestNo) ? $"GR-{request.Id:D4}" : request.RequestNo;
        var parts = new List<string> { $"จากคำขอ {no}" };
        // ประเภทที่พนักงานระบุเองไม่ตรงกับหมวดที่เก็บ → บันทึกชื่อที่ระบุไว้
        var requested = (request.RequestType ?? string.Empty).Trim();
        if (requested.Length > 0 && !string.Equals(requested, type.DocumentName, StringComparison.OrdinalIgnoreCase)
            && !RequestTypeToDocumentCode.ContainsKey(requested))
            parts.Add($"ประเภทที่ระบุ: {requested}");
        var purpose = (request.Purpose ?? string.Empty).Trim();
        if (purpose.Length > 0) parts.Add(purpose);
        return string.Join(" · ", parts);
    }
}
