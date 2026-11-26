namespace Hrms.Domain.Common.Attributes;

/// <summary>
/// ระดับการปกปิดข้อมูลอ่อนไหวใน Audit Log ตามมาตรฐาน PDPA และความปลอดภัยทางการเงิน
/// </summary>
public enum AuditMaskMode
{
    /// <summary>ปกปิดถาวรเป็น "[REDACTED]" ตั้งแต่ก่อนบันทึกลงฐานข้อมูล (เช่น รหัสผ่าน, PIN Hash, Token, ค่าเข้ารหัส)</summary>
    Redacted = 0,

    /// <summary>ปิดบังตัวหน้า เหลือเฉพาะตัวเลข 4 ตัวท้าย เช่น xxxxxxxxx1234 ตั้งแต่ก่อนบันทึกลงฐานข้อมูล (เช่น เลขบัตร ปชช., เลขประกันสังคม, เลขบัญชี)</summary>
    KeepLast4 = 1,

    /// <summary>ข้อมูลการเงิน (เช่น ฐานเงินเดือน, โบนัส, ยอดสุทธิ) — เก็บค่าเพื่อการตรวจสอบบัญชี แต่ต้องมีสิทธิ์ SETTINGS_AUDIT_SENSITIVE_VIEW จึงจะเห็นค่าจริง</summary>
    Financial = 2,

    /// <summary>ข้อมูลส่วนบุคคล PII (เช่น เบอร์โทร, ที่อยู่, วันเกิด) — เก็บค่าเพื่อตรวจสอบประวัติ แต่ซ่อนจากผู้ไม่มีสิทธิ์ SETTINGS_AUDIT_SENSITIVE_VIEW และถูกทำนิรนามตาม Retention Policy</summary>
    PersonalPii = 3
}

/// <summary>
/// แอตทริบิวต์ระบุว่าพร็อพเพอร์ตี้นี้เป็นข้อมูลอ่อนไหวสำหรับการบันทึก Audit Log
/// </summary>
[AttributeUsage(AttributeTargets.Property, AllowMultiple = false, Inherited = true)]
public sealed class AuditSensitiveAttribute : Attribute
{
    public AuditMaskMode Mode { get; }

    public AuditSensitiveAttribute(AuditMaskMode mode = AuditMaskMode.Redacted)
    {
        Mode = mode;
    }
}
