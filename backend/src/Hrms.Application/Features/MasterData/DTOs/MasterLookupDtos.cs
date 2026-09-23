namespace Hrms.Application.Features.MasterData.DTOs;

// --- DocumentType DTOs ---
public class DocumentTypeDto
{
    public long Id { get; set; }
    public string DocumentCode { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class CreateDocumentTypeDto
{
    public string DocumentCode { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; } = false;
    public string Status { get; set; } = "ACTIVE";
}

public class UpdateDocumentTypeDto
{
    public string DocumentName { get; set; } = string.Empty;
    public bool IsExpiryRequired { get; set; } = false;
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
