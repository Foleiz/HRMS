namespace Hrms.Application.Features.Certificates.DTOs;

public class CertificateTypeDto
{
    public long Id { get; set; }
    public string CertificateCode { get; set; } = string.Empty;
    public string CertificateName { get; set; } = string.Empty;
}

public class CreateCertificateRequestDto
{
    public long CertificateTypeId { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string Language { get; set; } = "TH"; // TH หรือ EN
    public string? Notes { get; set; }
}

public class CertificateRequestDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string PositionName { get; set; } = string.Empty;
    public long CertificateTypeId { get; set; }
    public string CertificateCode { get; set; } = string.Empty;
    public string CertificateName { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime RequestedAt { get; set; }
    public DateTime? IssuedAt { get; set; }
    public long? ApprovalInstanceId { get; set; }
    public bool CanCancel { get; set; }
    public bool CanDownload { get; set; }
}

public class CertificateDocumentDto
{
    public long RequestId { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public string Language { get; set; } = "TH";
    public string CertificateCode { get; set; } = string.Empty;
    public string CertificateTitle { get; set; } = string.Empty;

    // Company Profile
    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyAddress { get; set; }
    public string? CompanyPhone { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyLogoBase64 { get; set; }

    // Employee Details
    public long EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? CitizenIdMasked { get; set; }
    public string PositionName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public string ServiceDurationText { get; set; } = string.Empty;
    public decimal? BaseSalary { get; set; }
    public string? SalaryText { get; set; }

    // Purpose & Certification Body
    public string Purpose { get; set; } = string.Empty;
    public string CertificationBodyTh { get; set; } = string.Empty;
    public string CertificationBodyEn { get; set; } = string.Empty;

    // Authorized Signatory
    public string SignatoryName { get; set; } = string.Empty;
    public string SignatoryPosition { get; set; } = string.Empty;
    public string? SignatureBase64 { get; set; }
}

public class SignatureUploadDto
{
    public long EmployeeId { get; set; }
    public string Base64Data { get; set; } = string.Empty;
    public string FileName { get; set; } = "signature.png";
    public string MimeType { get; set; } = "image/png";
    public bool IsActive { get; set; } = true;
}

public class EmployeeSignatureDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public bool IsActive { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? SignatureBase64 { get; set; }
}
