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
}
