using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Hrms.Application.Features.Schedule.Dtos;

namespace Hrms.Application.Features.Schedule.Services;

/// <summary>
/// Interface บริการจัดการการมอบหมายกะการทำงานให้พนักงาน
/// พร้อมการตรวจสอบความขัดแย้งของช่วงเวลา (PostgreSQL GiST No-Overlap)
/// </summary>
public interface IEmployeeShiftService
{
    Task<List<EmployeeShiftDto>> GetAllAssignmentsAsync(long? departmentId = null, string? search = null, DateOnly? date = null);
    Task<List<EmployeeShiftDto>> GetAssignmentsByEmployeeAsync(long employeeId);
    Task<EmployeeShiftDto?> GetAssignmentByIdAsync(long id);
    Task<EmployeeShiftDto> AssignShiftAsync(AssignEmployeeShiftRequest request);
    Task<BatchAssignResultDto> BatchAssignShiftAsync(BatchAssignEmployeeShiftRequest request);
    Task<EmployeeShiftDto> UpdateAssignmentAsync(long id, UpdateEmployeeShiftRequest request);
    Task<bool> DeleteAssignmentAsync(long id);
    Task<MonthlyRosterResponse> GetMonthlyRosterAsync(int year, int month, long? departmentId = null, string? search = null);
    Task<List<AssignableEmployeeDto>> GetAssignableEmployeesAsync(long? departmentId = null);
}

/// <summary>
/// ผลลัพธ์การมอบหมายกะแบบกลุ่ม
/// </summary>
public class BatchAssignResultDto
{
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}
