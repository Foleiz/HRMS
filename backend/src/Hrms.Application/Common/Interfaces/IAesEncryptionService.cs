namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// อินเทอร์เฟซสำหรับการเข้ารหัสและถอดรหัสข้อมูลส่วนบุคคล (PDPA AES-256)
/// รวมถึงการสร้างสตริงแบบ Masking สำหรับความปลอดภัย
/// </summary>
public interface IAesEncryptionService
{
    byte[] Encrypt(string plainText);
    string Decrypt(byte[] cipherBytes);
    string MaskCitizenId(string citizenId);

    /// <summary>เข้ารหัสข้อความเป็นสตริง "enc:v1:&lt;base64&gt;" (ใช้กับคอลัมน์ varchar เช่น เลขบัญชีธนาคาร)</summary>
    string ProtectText(string plainText);

    /// <summary>ถอดรหัสสตริงจาก ProtectText (ข้อความที่ไม่ได้ขึ้นต้นด้วย enc:v1: คืนค่าเดิม)</summary>
    string UnprotectText(string value);

    /// <summary>HMAC-SHA256 ของเลขบัญชี (เฉพาะตัวเลข) ใช้ตรวจเลขบัญชีซ้ำโดยไม่ต้องถอดรหัส</summary>
    string HashAccountNumber(string accountNumber);

    /// <summary>ซ่อนเลขบัญชี เหลือ 4 ตัวท้าย เช่น xxxxxx1234</summary>
    string MaskAccountNumber(string accountNumber);
}
