/**
 * ตารางชื่อบทบาทภาษาไทยมาตรฐาน (Fallback สำหรับกรณีที่ API ไม่ได้คืน roleName มาด้วย)
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบสูงสุด',
  SYSTEM_SUPER: 'ผู้บริหารระบบระดับสูง',
  HR_MGR: 'ผู้จัดการฝ่ายบุคคล',
  DEPT_MGR: 'หัวหน้าแผนก',
  LINE_MANAGER: 'หัวหน้าฝ่าย / ผู้จัดการทีม',
  EMPLOYEE: 'พนักงานทั่วไป',
  PAYROLL_ADMIN: 'ผู้ดูแลบัญชีเงินเดือน',
  CEO: 'ผู้บริหารสูงสุด',
  TEST01: 'test01',
  BOSS: 'หัวหน้างาน',
  ROLE_011: 'Test02',
};

/**
 * แปลงรหัส Role เป็นชื่อ Role ภาษาไทย (หากระบุ roleName จะใช้ roleName ก่อนเสมอ)
 */
export function formatRoleName(roleCodeOrName?: string | null, roleName?: string | null): string {
  if (roleName && roleName.trim()) {
    return roleName.trim();
  }
  if (!roleCodeOrName || !roleCodeOrName.trim()) {
    return 'พนักงานทั่วไป';
  }
  const code = roleCodeOrName.trim().toUpperCase();
  return ROLE_DISPLAY_NAMES[code] || roleCodeOrName.trim();
}
