using System;

namespace Hrms.Domain.Entities;

/// <summary>
/// Entity สำหรับตาราง 'hrms.employee_shift'
/// บันทึกการมอบหมายกะการทำงานให้แก่พนักงานในแต่ละช่วงเวลา
/// มีข้อจำกัดระดับ PostgreSQL GiST Exclusion ป้องกันกะซ้อนทับกัน
/// </summary>
public class EmployeeShift
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public long ShiftId { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public int[]? WorkDays { get; set; }

    // Navigation Properties
    public virtual Employee? Employee { get; set; }
    public virtual Shift? Shift { get; set; }
}
