namespace Hrms.Application.Common.Utilities;

/// <summary>นโยบายรหัสผ่าน (ใช้ทั้งตั้งรหัสใหม่ เปลี่ยนรหัส และรีเซ็ตรหัส)</summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;
    public const string TooShortMessage = "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
}
