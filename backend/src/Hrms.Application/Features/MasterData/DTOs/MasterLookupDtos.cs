namespace Hrms.Application.Features.MasterData.DTOs;

// --- DocumentType DTOs ---
public class DocumentTypeDto
{
    public long Id { get; set; }
    public string DocumentCode { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; }
    public int NotifyBeforeDays { get; set; } = 30;
    public int? ValidityMonths { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class CreateDocumentTypeDto
{
    /// <summary>ไม่ต้องส่ง — ระบบสร้างรหัสให้อัตโนมัติ</summary>
    public string? DocumentCode { get; set; }
    public string DocumentName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; } = false;
    /// <summary>แจ้งเตือนล่วงหน้า (วัน) — ค่าเริ่มต้น 30</summary>
    public int? NotifyBeforeDays { get; set; }
    /// <summary>อายุเอกสาร (เดือน) — null = ไม่กำหนด</summary>
    public int? ValidityMonths { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateDocumentTypeDto
{
    public string DocumentName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; } = false;
    /// <summary>แจ้งเตือนล่วงหน้า (วัน) — ค่าเริ่มต้น 30</summary>
    public int? NotifyBeforeDays { get; set; }
    /// <summary>อายุเอกสาร (เดือน) — null = ไม่กำหนด</summary>
    public int? ValidityMonths { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

// --- Nationality DTOs ---
public class NationalityDto
{
    public long Id { get; set; }
    public string NationalityName { get; set; } = string.Empty;
}

public class CreateNationalityDto
{
    public string NationalityName { get; set; } = string.Empty;
}

public class UpdateNationalityDto
{
    public string NationalityName { get; set; } = string.Empty;
}

// --- Religion DTOs ---
public class ReligionDto
{
    public long Id { get; set; }
    public string ReligionName { get; set; } = string.Empty;
}

public class CreateReligionDto
{
    public string ReligionName { get; set; } = string.Empty;
}

public class UpdateReligionDto
{
    public string ReligionName { get; set; } = string.Empty;
}

// --- MaritalStatusType DTOs ---
public class MaritalStatusTypeDto
{
    public long Id { get; set; }
    public string MaritalStatusName { get; set; } = string.Empty;
}

public class CreateMaritalStatusTypeDto
{
    public string MaritalStatusName { get; set; } = string.Empty;
}

public class UpdateMaritalStatusTypeDto
{
    public string MaritalStatusName { get; set; } = string.Empty;
}

// --- GenderType DTOs ---
public class GenderTypeDto
{
    public long Id { get; set; }
    public string GenderCode { get; set; } = string.Empty;
    public string GenderName { get; set; } = string.Empty;
}

public class CreateGenderTypeDto
{
    public string GenderCode { get; set; } = string.Empty;
    public string GenderName { get; set; } = string.Empty;
}

public class UpdateGenderTypeDto
{
    public string GenderName { get; set; } = string.Empty;
}

// --- CertificateType DTOs (จัดการในเมนู ข้อมูลหลัก) ---
public class CertificateTypeMasterDto
{
    public long Id { get; set; }
    public string CertificateCode { get; set; } = string.Empty;
    public string CertificateName { get; set; } = string.Empty;
}

public class CreateCertificateTypeMasterDto
{
    public string CertificateCode { get; set; } = string.Empty;
    public string CertificateName { get; set; } = string.Empty;
}

public class UpdateCertificateTypeMasterDto
{
    public string CertificateName { get; set; } = string.Empty;
}
