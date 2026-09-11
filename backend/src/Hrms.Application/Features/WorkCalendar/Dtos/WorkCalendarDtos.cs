using System;
using System.Collections.Generic;

namespace Hrms.Application.Features.WorkCalendar.Dtos;

public class WorkWeekDto
{
    public long Id { get; set; }
    public short DayOfWeek { get; set; }
    public string DayNameThai { get; set; } = string.Empty;
    public string DayNameEnglish { get; set; } = string.Empty;
    public bool IsWorkingDay { get; set; }
    public string? StartTime { get; set; } // "HH:mm"
    public string? EndTime { get; set; }   // "HH:mm"
}

public class UpdateWorkWeekItem
{
    public short DayOfWeek { get; set; }
    public bool IsWorkingDay { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
}

public class UpdateWorkWeekRequest
{
    public List<UpdateWorkWeekItem> Days { get; set; } = new();
}

public class HolidayDto
{
    public long Id { get; set; }
    public string HolidayDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string HolidayName { get; set; } = string.Empty;
    public long CompanyId { get; set; }
    public string HolidayType { get; set; } = "PUBLIC";
    public string HolidayTypeThai { get; set; } = "วันหยุดตามประเพณี";
}

public class CreateHolidayRequest
{
    public string HolidayDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string HolidayName { get; set; } = string.Empty;
    public long? CompanyId { get; set; }
    public string HolidayType { get; set; } = "PUBLIC"; // 'PUBLIC', 'COMPANY_SPECIAL', 'SUBSTITUTE'
}

public class UpdateHolidayRequest
{
    public string HolidayDate { get; set; } = string.Empty;
    public string HolidayName { get; set; } = string.Empty;
    public string HolidayType { get; set; } = "PUBLIC";
}
