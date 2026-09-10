namespace Hrms.Domain.Entities;

public class WorkWeek
{
    public long Id { get; set; }
    public long CompanyId { get; set; }
    public short DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    public bool IsWorkingDay { get; set; } = true;

    // Navigation properties
    public Company? Company { get; set; }
}
