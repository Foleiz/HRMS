using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// ไฟล์สลิปเงินเดือนพนักงาน (E-Payslip PDF)
/// แมปกับตาราง hrms.payslip
/// </summary>
public class Payslip : BaseEntity
{
    public long PayrollId { get; set; }
    public string? FileHash { get; set; }
    public DateTimeOffset GeneratedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[]? PdfData { get; set; }

    public virtual Payroll? Payroll { get; set; }
}
