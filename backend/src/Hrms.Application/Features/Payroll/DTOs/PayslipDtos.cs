namespace Hrms.Application.Features.Payroll.DTOs;

public class GeneratePayslipPdfRequest
{
    public string? Password { get; set; }
}

public class GeneratePeriodPayslipsZipRequest
{
    /// <summary>
    /// รูปแบบรหัสผ่านสำหรับเปิดไฟล์:
    /// - "CITIZEN_ID_LAST4": เลข 4 ตัวท้ายของเลขบัตรประชาชน
    /// - "BIRTH_DATE": วันเดือนปีเกิด (ววดดปปปป)
    /// - "NONE": ไม่เข้ารหัสผ่าน
    /// </summary>
    public string PasswordType { get; set; } = "CITIZEN_ID_LAST4";
}
