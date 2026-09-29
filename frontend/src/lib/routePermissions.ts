import { UserProfile } from '@/types/auth';

export interface RouteRule {
  matchPrefix: string;
  title: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export const ROUTE_RULES: RouteRule[] = [
  {
    matchPrefix: '/employees',
    title: 'พนักงาน',
    requiredPermissions: ['EMP_VIEW', 'EMP_MANAGE', 'EMP_PROFILE_VIEW'],
  },
  {
    matchPrefix: '/my-salary',
    title: 'เงินเดือนของฉัน',
    requiredPermissions: ['ESS_SALARY_VIEW', 'PAYROLL_SLIP_VIEW', 'PAYROLL_VIEW'],
  },
  {
    matchPrefix: '/profile',
    title: 'โปรไฟล์ของฉัน (ESS)',
    requiredPermissions: ['ESS_PROFILE_VIEW', 'EMP_PROFILE_VIEW', 'EMP_VIEW'],
  },
  {
    matchPrefix: '/leave-balances',
    title: 'ยอดวันลาคงเหลือ',
    requiredPermissions: ['ESS_LEAVE_VIEW', 'LEAVE_BALANCE_VIEW', 'LEAVE_VIEW'],
  },
  {
    matchPrefix: '/my-news',
    title: 'ข่าวสารสำหรับฉัน',
    requiredPermissions: ['ESS_NEWS_VIEW', 'ANNOUNCEMENTS_VIEW', 'ORG_VIEW'],
  },
  {
    matchPrefix: '/documents',
    title: 'ยื่นเอกสาร',
    requiredPermissions: ['ESS_DOCS_VIEW', 'LEAVE_VIEW', 'TIME_VIEW', 'CERTIFICATE_VIEW', 'RESIGNATION_VIEW'],
  },
  {
    matchPrefix: '/ess/attendance',
    title: 'บันทึกเวลาของฉัน (ESS)',
    requiredPermissions: ['ESS_TIME_VIEW', 'TIME_VIEW', 'TIME_DAILY_VIEW', 'TIME_SCHEDULE_VIEW', 'TIME_IMPORT_VIEW'],
  },
  {
    matchPrefix: '/attendance/daily',
    title: 'ตรวจบันทึกเวลา',
    requiredPermissions: ['TIME_DAILY_VIEW', 'TIME_IMPORT_VIEW'],
  },
  {
    matchPrefix: '/attendance/schedules',
    title: 'การจัดตารางงาน',
    requiredPermissions: ['TIME_SCHEDULE_VIEW'],
  },
  {
    matchPrefix: '/leave',
    title: 'การลา',
    requiredPermissions: ['LEAVE_VIEW', 'LEAVE_BALANCE_VIEW', 'LEAVE_TYPE_VIEW', 'LEAVE_POLICY_VIEW'],
  },
  {
    matchPrefix: '/payroll',
    title: 'เงินเดือน',
    requiredPermissions: ['PAYROLL_VIEW', 'PAYROLL_CALC_VIEW', 'PAYROLL_SLIP_VIEW', 'PAYROLL_TAX_VIEW', 'PAYROLL_RUN'],
  },
  {
    matchPrefix: '/approvals',
    title: 'การอนุมัติ',
    requiredPermissions: [
      'APPROVAL_LEAVE_VIEW',
      'APPROVAL_LEAVE_APPROVE',
      'APPROVAL_TIME_VIEW',
      'APPROVAL_TIME_APPROVE',
      'APPROVAL_EMP_VIEW',
      'APPROVAL_EMP_APPROVE',
      'APPROVAL_PAYROLL_VIEW',
      'APPROVAL_PAYROLL_APPROVE',
      'LEAVE_APPROVE',
      'TIME_APPROVE',
      'EMP_APPROVE',
      'PAYROLL_APPROVE',
      'TIME_MANAGE',
      'LEAVE_BALANCE_APPROVE',
      'TIME_DAILY_APPROVE',
      'EMP_PROFILE_APPROVE',
      'PAYROLL_CALC_APPROVE',
    ],
  },
  {
    matchPrefix: '/organization',
    title: 'โครงสร้างองค์กร',
    requiredPermissions: ['ORG_VIEW', 'ORG_STRUCT_VIEW', 'ORG_POS_VIEW', 'ORG_BENEFIT_VIEW', 'ORG_COMP_VIEW', 'SYS_ADMIN'],
  },
  {
    matchPrefix: '/work-calendar',
    title: 'วันทำงานและวันหยุด',
    requiredPermissions: ['WORK_CALENDAR_VIEW', 'TIME_VIEW', 'TIME_SCHEDULE_VIEW', 'TIME_DAILY_VIEW', 'SYS_ADMIN'],
  },
  {
    matchPrefix: '/reports',
    title: 'รายงาน',
    requiredPermissions: ['REPORT_VIEW', 'REPORT_ATT_VIEW', 'REPORT_HEADCOUNT_VIEW'],
  },
  {
    matchPrefix: '/announcements',
    title: 'จัดการประกาศ',
    requiredPermissions: ['ANNOUNCEMENTS_VIEW', 'SYS_ADMIN', 'ORG_VIEW'],
  },
  {
    matchPrefix: '/master',
    title: 'ข้อมูลหลัก (Master Data)',
    requiredPermissions: ['MASTER_DATA_VIEW', 'SETTINGS_VIEW', 'SYS_ADMIN', 'ORG_VIEW'],
  },
  {
    matchPrefix: '/settings',
    title: 'ตั้งค่า',
    requiredPermissions: ['SETTINGS_USERS_VIEW', 'SETTINGS_ROLES_VIEW', 'SETTINGS_AUDIT_VIEW', 'SETTINGS_APPROVAL_FLOWS_MANAGE', 'SETTINGS_VIEW', 'SYS_ADMIN'],
  },
];

/**
 * ตรวจสอบว่าผู้ใช้งานปัจจุบันสามารถเข้าถึง pathname ดังกล่าวได้หรือไม่
 */
export function isPathAccessible(pathname: string, user: UserProfile | null): { allowed: boolean; rule?: RouteRule } {
  if (!user) return { allowed: false };
  if (user.roles?.includes('ADMIN') || user.roles?.includes('SYSTEM_SUPER')) {
    return { allowed: true };
  }

  // หา rule ที่ matchPrefix ตรงกับ pathname ที่ยาวที่สุด (เฉพาะเจาะจงที่สุด)
  const matches = ROUTE_RULES.filter((r) => pathname.startsWith(r.matchPrefix));
  if (matches.length === 0) {
    return { allowed: true }; // หน้าทั่วไป / ESS / Dashboard
  }

  const bestMatch = matches.reduce((a, b) => (b.matchPrefix.length > a.matchPrefix.length ? b : a));

  if (bestMatch.requiredRoles && bestMatch.requiredRoles.length > 0) {
    const hasRole = bestMatch.requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) return { allowed: false, rule: bestMatch };
  }

  if (bestMatch.requiredPermissions && bestMatch.requiredPermissions.length > 0) {
    const hasPerm = bestMatch.requiredPermissions.some((perm) => user.permissions?.includes(perm));
    if (!hasPerm) return { allowed: false, rule: bestMatch };
  }

  return { allowed: true, rule: bestMatch };
}
