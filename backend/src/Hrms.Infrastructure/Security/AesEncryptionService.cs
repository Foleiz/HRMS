using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Hrms.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Hrms.Infrastructure.Security;

/// <summary>
/// ระบบเข้ารหัสข้อมูลส่วนบุคคล (PDPA) ด้วย AES-256-CBC
/// พร้อมฟังก์ชัน Masking เลขประจำตัวประชาชน
/// </summary>
public class AesEncryptionService : IAesEncryptionService
{
    private readonly byte[] _key;

    public AesEncryptionService(IConfiguration configuration)
    {
        // กุญแจเข้ารหัส 256 บิต (32 ไบต์)
        string secret = configuration["Encryption:SecretKey"] ?? "HRMS_PDPA_AES_256_SECRET_KEY_DEV_2026_DEFAULT!";
        // แปลงความยาวกุญแจให้ได้ 32 bytes พอดีด้วย SHA-256
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
    }

    public byte[] Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return Array.Empty<byte>();

        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV(); // สุ่ม IV ใหม่ทุกครั้งที่เข้ารหัสเพื่อความปลอดภัย

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();

        // เขียน IV ไว้ด้านหน้า (16 bytes) เพื่อใช้ถอดรหัสในภายหลัง
        ms.Write(aes.IV, 0, aes.IV.Length);

        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs, Encoding.UTF8))
        {
            sw.Write(plainText);
        }

        return ms.ToArray();
    }

    public string Decrypt(byte[] cipherBytes)
    {
        if (cipherBytes == null || cipherBytes.Length < 16)
            return string.Empty;

        using var aes = Aes.Create();
        aes.Key = _key;

        // ดึง IV 16 ไบต์แรกออกมา
        byte[] iv = new byte[16];
        Array.Copy(cipherBytes, 0, iv, 0, 16);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(cipherBytes, 16, cipherBytes.Length - 16);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs, Encoding.UTF8);

        return sr.ReadToEnd();
    }

    /// <summary>
    /// ซ่อนเลขบัตรประชาชน (เช่น 1100201234567 -> 1-1002-xxxxx-xx-7)
    /// </summary>
    public string MaskCitizenId(string citizenId)
    {
        if (string.IsNullOrWhiteSpace(citizenId))
            return string.Empty;

        // ดึงเฉพาะตัวเลข
        string digits = Regex.Replace(citizenId, @"\D", "");
        if (digits.Length != 13)
        {
            // หากไม่ใช่ 13 หลัก ให้ซ่อนตรงกลาง
            if (digits.Length <= 4) return digits;
            return string.Concat(digits.AsSpan(0, 2), new string('*', digits.Length - 4), digits.AsSpan(digits.Length - 2));
        }

        // รูปแบบ 1-2345-xxxxx-xx-9
        return $"{digits[0]}-{digits.Substring(1, 4)}-xxxxx-xx-{digits[12]}";
    }
}
