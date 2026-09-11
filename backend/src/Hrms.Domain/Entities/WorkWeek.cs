using System;

namespace Hrms.Domain.Entities;

public class WorkWeek
{
    public long Id { get; set; }
    public long CompanyId { get; set; }
    public short DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    public bool IsWorkingDay { get; set; } = true;
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }

    // Navigation properties
    public Company? Company { get; set; }
}

