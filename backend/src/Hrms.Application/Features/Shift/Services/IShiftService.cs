using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Features.Shift.Dtos;

namespace Hrms.Application.Features.Shift.Services;

public interface IShiftService
{
    Task<List<ShiftDto>> GetAllShiftsAsync(string? status = null);
    Task<ShiftDto?> GetShiftByIdAsync(long id);
    Task<ShiftDto> CreateShiftAsync(CreateShiftRequest request);
    Task<ShiftDto> UpdateShiftAsync(long id, UpdateShiftRequest request);
    Task<bool> DeleteShiftAsync(long id);
}
