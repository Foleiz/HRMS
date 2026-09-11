using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Features.Schedule.Dtos;

namespace Hrms.Application.Features.Schedule.Services;

/// <summary>
/// Interface บริการจัดการข้อมูลรูปแบบตารางการทำงานหลัก
/// </summary>
public interface IWorkScheduleService
{
    Task<List<WorkScheduleDto>> GetAllWorkSchedulesAsync(string? status = null);
    Task<WorkScheduleDto?> GetWorkScheduleByIdAsync(long id);
    Task<WorkScheduleDto> CreateWorkScheduleAsync(CreateWorkScheduleRequest request);
    Task<WorkScheduleDto> UpdateWorkScheduleAsync(long id, UpdateWorkScheduleRequest request);
    Task<bool> DeleteWorkScheduleAsync(long id);
}
