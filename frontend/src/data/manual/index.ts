import type { ManualArticle, ManualCategory, ManualRoleTag } from '@/types/manual';
import { OVERVIEW_ARTICLES } from './overview';
import { PROFILE_ARTICLES } from './profile';
import { LEAVE_ARTICLES } from './leave';
import { DOCUMENTS_ARTICLES } from './documents';
import { ATTENDANCE_ARTICLES } from './attendance';
import { PAYROLL_ARTICLES } from './payroll';
import { EMPLOYEES_ARTICLES } from './employees';
import { ORGANIZATION_ARTICLES } from './organization';
import { APPROVALS_ARTICLES } from './approvals';
import { REPORTS_SETTINGS_ARTICLES } from './reports-settings';

// เรียงลำดับและตั้งชื่อ 10 หมวดให้ตรงกับ Sidebar.tsx 100%
export const MANUAL_CATEGORIES: ManualCategory[] = [
  {
    id: 'overview',
    order: 1,
    title: 'ภาพรวม',
    description: 'แดชบอร์ด ตัวช่วยงาน ข่าวสารสำหรับฉัน และแผนผังองค์กร',
    iconName: 'Compass',
    roles: ['ALL'],
  },
  {
    id: 'profile',
    order: 2,
    title: 'ข้อมูลส่วนตัว',
    description: 'โปรไฟล์ของฉัน ข้อมูลติดต่อ ที่อยู่ และบัญชีธนาคารรับเงินเดือน',
    iconName: 'User',
    roles: ['EMPLOYEE'],
  },
  {
    id: 'leave',
    order: 3,
    title: 'การลา',
    description: 'ยื่นใบลา ยอดวันลาคงเหลือ ปฏิทินการลาของทีม และสิทธิ์การลา (HR)',
    iconName: 'CalendarCheck',
    roles: ['EMPLOYEE', 'MANAGER', 'HR'],
  },
  {
    id: 'documents',
    order: 4,
    title: 'เอกสาร',
    description: 'ยื่นเอกสาร (หนังสือรับรอง คำขอทั่วไป ลาออก) และประวัติเอกสาร',
    iconName: 'FileText',
    roles: ['EMPLOYEE'],
  },
  {
    id: 'attendance',
    order: 5,
    title: 'เวลาการทำงาน',
    description: 'บันทึกเวลาของฉัน ตรวจบันทึกเวลา การจัดตารางงาน และวันทำงานและวันหยุด',
    iconName: 'Clock',
    roles: ['EMPLOYEE', 'HR'],
  },
  {
    id: 'payroll',
    order: 6,
    title: 'เงินเดือนและสวัสดิการ',
    description: 'เงินเดือน (ครบ 8 แท็บ + เงินตกเบิก) เงินเดือนของฉัน สวัสดิการของฉัน และยอดสวัสดิการพนักงาน',
    iconName: 'CreditCard',
    roles: ['EMPLOYEE', 'HR', 'FINANCE', 'EXECUTIVE'],
  },
  {
    id: 'organization',
    order: 7,
    title: 'องค์กรและบุคลากร',
    description: 'พนักงาน โครงสร้างองค์กร และจัดการประกาศ',
    iconName: 'Users',
    roles: ['HR', 'ADMIN'],
  },
  {
    id: 'approvals',
    order: 8,
    title: 'การอนุมัติ',
    description: 'เอกสารรอดำเนินการ และประวัติเอกสารการอนุมัติ',
    iconName: 'CheckCircle2',
    roles: ['MANAGER', 'HR', 'EXECUTIVE'],
  },
  {
    id: 'reports',
    order: 9,
    title: 'รายงานและสถิติ',
    description: 'พนักงานแยกตามแผนก การเข้าออกงาน การลา และอัตราการลาออก',
    iconName: 'BarChart3',
    roles: ['HR', 'EXECUTIVE', 'ADMIN'],
  },
  {
    id: 'settings',
    order: 10,
    title: 'ระบบและการตั้งค่า',
    description: 'ข้อมูลหลัก (7 หมวด) และตั้งค่าระบบ (ผู้ใช้งาน บทบาท สายการอนุมัติ Audit Log)',
    iconName: 'Settings',
    roles: ['ADMIN', 'HR'],
  },
];

export const MANUAL_ARTICLES: ManualArticle[] = [
  ...OVERVIEW_ARTICLES,
  ...PROFILE_ARTICLES,
  ...LEAVE_ARTICLES,
  ...DOCUMENTS_ARTICLES,
  ...ATTENDANCE_ARTICLES,
  ...PAYROLL_ARTICLES,
  ...EMPLOYEES_ARTICLES,
  ...ORGANIZATION_ARTICLES,
  ...APPROVALS_ARTICLES,
  ...REPORTS_SETTINGS_ARTICLES,
];

export function getManualArticleBySlug(slug: string): ManualArticle | undefined {
  return MANUAL_ARTICLES.find((a) => a.slug === slug);
}

export function searchManualArticles(
  query: string,
  role: ManualRoleTag = 'ALL'
): ManualArticle[] {
  const q = query.trim().toLowerCase();
  return MANUAL_ARTICLES.filter((a) => {
    if (role !== 'ALL' && !a.roles.includes('ALL') && !a.roles.includes(role)) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      a.title,
      a.summary,
      a.menuPath,
      ...a.keywords,
      ...a.sections.map((s) =>
        [
          s.title,
          s.description ?? '',
          ...(s.bullets ?? []),
          ...(s.steps?.map((st) => `${st.title} ${st.description}`) ?? []),
        ].join(' ')
      ),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
