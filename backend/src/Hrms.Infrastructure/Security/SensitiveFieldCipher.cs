using Hrms.Application.Common.Interfaces;

namespace Hrms.Infrastructure.Security;

/// <summary>
/// ตัวเข้ารหัสสำหรับ EF ValueConverter (คอลัมน์ข้อความที่ต้องเข้ารหัส เช่น เลขบัญชีธนาคาร)
/// ตั้งค่า Service ครั้งเดียวตอนเปิดระบบ (Program.cs) — ข้อมูลเก่าที่ยังไม่เข้ารหัสอ่านได้ตามเดิม
/// </summary>
public static class SensitiveFieldCipher
{
    public static IAesEncryptionService? Service { get; set; }

    public static string Protect(string value) =>
        Service == null || string.IsNullOrEmpty(value) ? value : Service.ProtectText(value);

    public static string Unprotect(string value) =>
        Service == null || string.IsNullOrEmpty(value) ? value : Service.UnprotectText(value);
}
