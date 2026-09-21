namespace Hrms.Application.Features.Payroll.Services;

/// <summary>
/// Service สำหรับสร้างและดาวน์โหลดไฟล์สลิปเงินเดือน E-Payslip PDF พร้อมการเข้ารหัสความปลอดภัย (Password Protection)
/// </summary>
public interface IPayslipService
{
    /// <summary>
    /// สร้างหรือดึงไฟล์ PDF สลิปเงินเดือน (เข้ารหัสผ่าน) สำหรับพนักงานที่ล็อกอินอยู่ (ตรวจสอบสิทธิ์ความเป็นเจ้าของ)
    /// </summary>
    Task<(byte[] FileBytes, string FileName)> GetMyPayslipPdfAsync(long payrollId, CancellationToken cancellationToken = default);

    /// <summary>
    /// สร้างหรือดึงไฟล์ PDF สลิปเงินเดือน (เข้ารหัสผ่าน) สำหรับ HR/Admin (ระบุ payrollId ใดๆ ได้)
    /// </summary>
    Task<(byte[] FileBytes, string FileName)> GetPayslipPdfAsync(long payrollId, CancellationToken cancellationToken = default);
}
