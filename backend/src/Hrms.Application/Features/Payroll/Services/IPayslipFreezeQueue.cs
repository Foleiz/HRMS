namespace Hrms.Application.Features.Payroll.Services;

/// <summary>
/// คิวงานเบื้องหลัง "ล็อกสลิป" ของรอบที่จ่าย/ปิดแล้ว — ให้คำขอเปลี่ยนสถานะตอบกลับทันที
/// ไม่ต้องรอสร้าง PDF ทุกคน (ถ้ามีคนดาวน์โหลดก่อนคิวทำเสร็จ ระบบสร้างและเก็บสลิปคนนั้นให้ทันที)
/// </summary>
public interface IPayslipFreezeQueue
{
    void Enqueue(long periodId);
}
