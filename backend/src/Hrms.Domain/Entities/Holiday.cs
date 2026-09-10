using System;

namespace Hrms.Domain.Entities;

public class Holiday
{
    public long Id { get; set; }
    public DateOnly HolidayDate { get; set; }
    public string HolidayName { get; set; } = string.Empty;
    public long CompanyId { get; set; }
    public string HolidayType { get; set; } = "PUBLIC"; // 'PUBLIC', 'COMPANY_SPECIAL', 'SUBSTITUTE'

    // Navigation properties
    public Company? Company { get; set; }
}
