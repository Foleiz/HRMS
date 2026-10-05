namespace Hrms.Application.Common.Utilities;

/// <summary>
/// เลขรุ่นของสิทธิ์ผู้ใช้ทั้งระบบ — เพิ่มทุกครั้งที่แก้ผู้ใช้/บทบาท/สิทธิ์ (ระงับบัญชี, เปลี่ยนบทบาท, แก้ตารางสิทธิ์)
/// ตัวโหลดสิทธิ์ต่อคำขอ (Infrastructure) ใช้เลขนี้เป็นส่วนหนึ่งของ cache key จึงมีผลทันที
/// </summary>
public static class UserAccessVersion
{
    private static long _current;

    public static long Current => Interlocked.Read(ref _current);

    public static void Bump() => Interlocked.Increment(ref _current);
}
