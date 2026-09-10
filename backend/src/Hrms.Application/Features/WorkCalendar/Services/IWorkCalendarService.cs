using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Features.WorkCalendar.Dtos;

namespace Hrms.Application.Features.WorkCalendar.Services;

public interface IWorkCalendarService
{
    // Work Week
    Task<List<WorkWeekDto>> GetWorkWeekAsync(long? companyId = null);
    Task<List<WorkWeekDto>> UpdateWorkWeekAsync(UpdateWorkWeekRequest request, long? companyId = null);

    // Holidays
    Task<List<HolidayDto>> GetHolidaysAsync(int? year = null, long? companyId = null);
    Task<HolidayDto?> GetHolidayByIdAsync(long id);
    Task<HolidayDto> CreateHolidayAsync(CreateHolidayRequest request);
    Task<HolidayDto> UpdateHolidayAsync(long id, UpdateHolidayRequest request);
    Task<bool> DeleteHolidayAsync(long id);
}
