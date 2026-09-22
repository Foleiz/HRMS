namespace Hrms.Application.Features.Payroll.Services;

public interface IPayslipPdfService
{
    /// <summary>
    /// สร้างเอกสารสลิปเงินเดือนพนักงาน (e-Payslip) ในรูปแบบ PDF พร้อมใส่รหัสผ่านป้องกันตามที่ระบุ
    /// </summary>
    Task<byte[]> GeneratePayslipPdfAsync(long payrollId, string? password = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// สร้างไฟล์รวมสลิปเงินเดือนของพนักงานทุกคนในงวด (.zip) โดยแต่ละไฟล์ PDF มีการเข้ารหัสผ่านตามประเภทที่เลือก
    /// </summary>
    Task<byte[]> GeneratePeriodPayslipsZipAsync(long periodId, string passwordType = "CITIZEN_ID_LAST4", CancellationToken cancellationToken = default);
}
