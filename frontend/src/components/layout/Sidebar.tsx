'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import {
  LayoutDashboard,
  Compass,
  Users,
  Clock,
  FileText,
  CalendarCheck,
  CreditCard,
  CheckCircle2,
  Building2,
  BarChart3,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  CalendarRange,
  Megaphone,
  User,
  Wallet,
  Database,
  X,
  Gift,
  Network,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  History,
  FileEdit,
  Receipt,
  ReceiptText,
  Coins,
  SlidersHorizontal,
  Sparkles,
  Percent,
  Calculator,
  CalendarClock,
  UserCheck,
  Tags,
  ArrowRightLeft,
  FileSignature,
  Hourglass,
  Building,
  Briefcase,
  TrendingUp,
  HeartHandshake,
  Landmark,
  Upload,
  Sunrise,
  ListChecks,
  ShieldCheck,
  Palmtree,
  PieChart,
  CalendarX2,
  UserMinus,
  Award,
  Globe,
  Heart,
  ScrollText,
  Workflow,
} from 'lucide-react';

export interface SubMenuItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
  /** สิทธิ์ที่ต้องมี (มีข้อใดข้อหนึ่ง หรือเป็น ADMIN) */
  requiredPermissions?: string[];
  /** บทบาทที่ต้องมี (มีข้อใดข้อหนึ่ง หรือเป็น ADMIN) */
  requiredRoles?: string[];
}

export interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
  /** สิทธิ์ที่ต้องมี (มีข้อใดข้อหนึ่ง หรือเป็น ADMIN) */
  requiredPermissions?: string[];
  /** บทบาทที่ต้องมี (มีข้อใดข้อหนึ่ง หรือเป็น ADMIN) */
  requiredRoles?: string[];
  children?: SubMenuItem[];
}

export interface MenuGroup {
  category: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    category: 'ภาพรวม',
    items: [
      {
        title: 'แดชบอร์ด',
        href: '/',
        icon: LayoutDashboard,
        requiredPermissions: [
          'DASHBOARD_VIEW',
          'DASHBOARD_EMPLOYEE_VIEW',
          'DASHBOARD_EMP_VIEW',
          'DASHBOARD_DEPT_VIEW',
          'DASHBOARD_DIV_VIEW',
          'DASHBOARD_CEO_VIEW',
          'DASHBOARD_ADMIN_VIEW',
        ],
      },
      {
        title: 'วิธีการใช้งาน',
        href: '/guide',
        matchPrefix: '/guide',
        icon: Compass,
        requiredPermissions: [
          'GUIDE_VIEW',
          'GUIDE_ONBOARDING_VIEW',
          'GUIDE_PAYROLL_VIEW',
          'GUIDE_PAYROLL_HR_VIEW',
          'GUIDE_PAYROLL_FINANCE_VIEW',
          'GUIDE_PAYROLL_CEO_VIEW',
          'GUIDE_OFFBOARDING_VIEW',
          'GUIDE_SHIFT_SCHEDULE_VIEW',
          'GUIDE_ATTENDANCE_IMPORT_VIEW',
          'GUIDE_TRANSFER_VIEW',
          'GUIDE_LEAVE_SETUP_VIEW',
          'GUIDE_LEAVE_APPROVAL_VIEW',
          'GUIDE_COMPANY_SETUP_VIEW',
        ],
      },
      {
        title: 'ข่าวสารสำหรับฉัน',
        href: '/my-news',
        matchPrefix: '/my-news',
        icon: CalendarDays,
        requiredPermissions: ['ESS_NEWS_VIEW'],
      },
      {
        title: 'แผนผังองค์กร',
        href: '/org-chart',
        matchPrefix: '/org-chart',
        icon: Network,
        requiredPermissions: ['ORG_CHART_VIEW'],
      },
    ],
  },
  {
    category: 'บริการตนเอง (ESS)',
    items: [
      {
        title: 'โปรไฟล์ของฉัน',
        href: '/profile?tab=personal',
        matchPrefix: '/profile',
        icon: User,
        requiredPermissions: ['ESS_PROFILE_VIEW'],
      },
      {
        title: 'การลา',
        href: '/documents/leave',
        matchPrefix: '/documents/leave',
        icon: CalendarX2,
        requiredPermissions: ['ESS_DOCS_CREATE', 'ESS_DOCS_VIEW', 'ESS_LEAVE_VIEW'],
      },
      {
        title: 'ยื่นเอกสาร',
        href: '/documents',
        matchPrefix: '/documents',
        icon: FileText,
        requiredPermissions: ['ESS_DOCS_VIEW'],
        children: [
          { title: 'รายการเอกสาร', href: '/documents', icon: FileText },
          { title: 'ประวัติเอกสาร', href: '/documents/history', icon: History },
        ],
      },
      {
        title: 'ยอดวันลาคงเหลือ',
        href: '/leave-balances',
        matchPrefix: '/leave-balances',
        icon: CalendarCheck,
        requiredPermissions: ['ESS_LEAVE_VIEW'],
      },
      {
        title: 'ปฏิทินการลาของทีม',
        href: '/team-leave-calendar',
        matchPrefix: '/team-leave-calendar',
        icon: CalendarRange,
        requiredPermissions: ['ESS_LEAVE_VIEW'],
      },
      {
        title: 'บันทึกเวลาของฉัน',
        href: '/ess/attendance',
        matchPrefix: '/ess/attendance',
        icon: Clock,
        requiredPermissions: ['ESS_TIME_VIEW'],
        children: [
          { title: 'ตรวจบันทึกเวลาของฉัน', href: '/ess/attendance', icon: CalendarCheck },
          { title: 'คำขอปรับปรุงเวลา', href: '/ess/attendance?tab=adjustments', icon: FileEdit },
        ],
      },
      {
        title: 'สวัสดิการของฉัน',
        href: '/ess/benefits',
        matchPrefix: '/ess/benefits',
        icon: Gift,
        requiredPermissions: ['ESS_BENEFIT_VIEW', 'ESS_BENEFIT_CLAIM_VIEW'],
        children: [
          { title: 'สวัสดิการของฉัน', href: '/ess/benefits', icon: Gift, requiredPermissions: ['ESS_BENEFIT_VIEW'] },
          { title: 'ประวัติการเบิกจ่ายและใช้สิทธิ์', href: '/ess/benefits/history', icon: Receipt, requiredPermissions: ['ESS_BENEFIT_CLAIM_VIEW'] },
        ],
      },
    ],
  },
  {
    category: 'การเงินและค่าตอบแทน',
    items: [
      {
        title: 'เงินเดือน',
        href: '/payroll',
        matchPrefix: '/payroll',
        icon: CreditCard,
        requiredPermissions: [
          'PAYROLL_PERIOD_VIEW',
          'PAYROLL_HR_VIEW',
          'PAYROLL_FINANCE_VIEW',
          'PAYROLL_ADMIN_VIEW',
          'PAYROLL_CALC_VIEW',
          'PAYROLL_STRUCTURE_VIEW',
          'PAYROLL_ITEMS_VIEW',
          'PAYROLL_BONUS_VIEW',
          'PAYROLL_BANK_VIEW',
          'PAYROLL_TAX_VIEW',
          'PAYROLL_SLIP_VIEW',
        ],
        children: [
          { title: 'รอบเงินเดือน', href: '/payroll?tab=periods', icon: CalendarRange, requiredPermissions: ['PAYROLL_PERIOD_VIEW'] },
          { title: 'ฐานเงินเดือนพนักงาน', href: '/payroll?tab=structures', icon: Coins, requiredPermissions: ['PAYROLL_STRUCTURE_VIEW'] },
          { title: 'รายได้และรายหัก', href: '/payroll?tab=items', icon: SlidersHorizontal, requiredPermissions: ['PAYROLL_ITEMS_VIEW'] },
          { title: 'โบนัส', href: '/payroll?tab=bonus', icon: Sparkles, requiredPermissions: ['PAYROLL_BONUS_VIEW'] },
          { title: 'ค่าคอมมิชชั่น', href: '/payroll?tab=commission', icon: Percent, requiredPermissions: ['PAYROLL_BONUS_VIEW', 'PAYROLL_VIEW', 'PAYROLL_HR_VIEW'] },
          { title: 'ประมวลเงินเดือน', href: '/payroll?tab=process', icon: Calculator, requiredPermissions: ['PAYROLL_HR_VIEW', 'PAYROLL_FINANCE_VIEW', 'PAYROLL_ADMIN_VIEW', 'PAYROLL_CALC_VIEW', 'PAYROLL_VIEW'] },
          { title: 'กำหนดวันตัดรอบและจ่ายเงิน', href: '/payroll?tab=schedule-settings', icon: CalendarClock, requiredPermissions: ['PAYROLL_HR_VIEW', 'PAYROLL_PERIOD_VIEW'] },
          { title: 'ภาษีและประกันสังคม', href: '/payroll?tab=tax-sso', icon: ReceiptText, requiredPermissions: ['PAYROLL_TAX_VIEW'] },
        ],
      },
      {
        title: 'เงินเดือนของฉัน',
        href: '/my-salary',
        matchPrefix: '/my-salary',
        icon: Wallet,
        requiredPermissions: ['ESS_SALARY_VIEW'],
      },
    ],
  },
  {
    category: 'การจัดการบุคคล',
    items: [
      {
        title: 'พนักงาน',
        href: '/employees',
        matchPrefix: '/employees',
        icon: Users,
        requiredPermissions: [
          'EMP_PROFILE_VIEW',
          'EMP_CONTRACT_VIEW',
          'EMP_TRANSFER_VIEW',
          'EMP_TYPE_VIEW',
          'EMP_DOC_VIEW',
          'EMP_HISTORY_VIEW',
        ],
        children: [
          { title: 'จัดการพนักงาน', href: '/employees', icon: UserCheck, requiredPermissions: ['EMP_PROFILE_VIEW'] },
          { title: 'ประเภทพนักงาน', href: '/employees/types', icon: Tags, requiredPermissions: ['EMP_TYPE_VIEW'] },
          { title: 'การย้ายแผนก/เลื่อนตำแหน่ง', href: '/employees/transfers', icon: ArrowRightLeft, requiredPermissions: ['EMP_TRANSFER_VIEW'] },
          { title: 'สัญญาจ้าง', href: '/employees/contracts', icon: FileSignature, requiredPermissions: ['EMP_CONTRACT_VIEW'] },
          { title: 'เอกสารใกล้หมดอายุ', href: '/employees/documents', icon: Hourglass, requiredPermissions: ['EMP_DOC_VIEW'] },
        ],
      },
      {
        title: 'สวัสดิการ',
        href: '/benefits/balances',
        matchPrefix: '/benefits',
        icon: Gift,
        requiredPermissions: [
          'BENEFIT_BALANCE_VIEW',
          'BENEFIT_CLAIM_VIEW',
          'BENEFIT_VIEW',
        ],
      },
      {
        title: 'โครงสร้างองค์กร',
        href: '/organization',
        matchPrefix: '/organization',
        icon: Building2,
        requiredPermissions: [
          'ORG_STRUCT_VIEW',
          'ORG_POS_VIEW',
          'ORG_BENEFIT_VIEW',
          'ORG_COMP_VIEW',
        ],
        children: [
          { title: 'จัดการฝ่าย', href: '/organization?tab=divisions', icon: Building2, requiredPermissions: ['ORG_STRUCT_VIEW'] },
          { title: 'จัดการแผนก', href: '/organization?tab=departments', icon: Building, requiredPermissions: ['ORG_STRUCT_VIEW'] },
          { title: 'จัดการทีม', href: '/organization?tab=teams', icon: Users, requiredPermissions: ['ORG_STRUCT_VIEW'] },
          { title: 'จัดการตำแหน่ง', href: '/organization?tab=positions', icon: Briefcase, requiredPermissions: ['ORG_POS_VIEW'] },
          { title: 'ระดับพนักงาน', href: '/organization?tab=levels', icon: TrendingUp, requiredPermissions: ['ORG_POS_VIEW'] },
          { title: 'สวัสดิการและสิทธิประโยชน์', href: '/organization?tab=benefits', icon: HeartHandshake, requiredPermissions: ['ORG_BENEFIT_VIEW'] },
          { title: 'ข้อมูลบริษัท', href: '/organization?tab=company', icon: Landmark, requiredPermissions: ['ORG_COMP_VIEW'] },
          { title: 'บัญชีธนาคารบริษัท', href: '/organization?tab=bank-accounts', icon: CreditCard, requiredPermissions: ['ORG_COMP_VIEW'] },
        ],
      },
      {
        title: 'จัดการประกาศ',
        href: '/announcements?tab=general',
        matchPrefix: '/announcements',
        icon: Megaphone,
        requiredPermissions: [
          'ANNOUNCEMENTS_VIEW',
          'ANNOUNCEMENTS_CREATE',
          'ANNOUNCEMENTS_EDIT',
          'ANNOUNCEMENTS_GENERAL_VIEW',
          'ANNOUNCEMENTS_ACTIVITY_VIEW',
        ],
        children: [
          {
            title: 'ประกาศข่าวสารทั่วไป',
            href: '/announcements?tab=general',
            icon: Megaphone,
            requiredPermissions: ['ANNOUNCEMENTS_GENERAL_VIEW', 'ANNOUNCEMENTS_VIEW'],
          },
          {
            title: 'ประกาศกิจกรรม',
            href: '/announcements?tab=activities',
            icon: Sparkles,
            requiredPermissions: ['ANNOUNCEMENTS_ACTIVITY_VIEW'],
          },
        ],
      },
    ],
  },
  {
    category: 'เวลาและการลา',
    items: [
      {
        title: 'ตรวจบันทึกเวลา',
        href: '/attendance/daily',
        matchPrefix: '/attendance/daily',
        icon: CalendarDays,
        requiredPermissions: [
          'TIME_DAILY_VIEW',
          'TIME_IMPORT_VIEW',
        ],
        children: [
          { title: 'ตรวจบันทึกเวลาประจำวัน', href: '/attendance/daily?tab=daily', icon: Clock, requiredPermissions: ['TIME_DAILY_VIEW'] },
          { title: 'นำเข้าไฟล์บันทึกเวลา', href: '/attendance/daily?tab=import', icon: Upload, requiredPermissions: ['TIME_IMPORT_VIEW'] },
        ],
      },
      {
        title: 'การจัดตารางงาน',
        href: '/attendance/schedules',
        matchPrefix: '/attendance/schedules',
        icon: CalendarRange,
        requiredPermissions: [
          'TIME_SCHEDULE_VIEW',
        ],
        children: [
          { title: 'มอบหมายกะให้พนักงาน', href: '/attendance/schedules?tab=roster', icon: CalendarRange, requiredPermissions: ['TIME_SCHEDULE_VIEW'] },
          { title: 'กะการทำงาน', href: '/attendance/schedules?tab=shifts', icon: Sunrise, requiredPermissions: ['TIME_SCHEDULE_VIEW'] },
        ],
      },
      {
        title: 'สิทธิ์การลา',
        href: '/leave',
        matchPrefix: '/leave',
        icon: CalendarCheck,
        requiredPermissions: [
          'LEAVE_BALANCE_VIEW',
          'LEAVE_TYPE_VIEW',
          'LEAVE_POLICY_VIEW',
        ],
        children: [
          { title: 'ประเภทการลา', href: '/leave?tab=types', icon: ListChecks, requiredPermissions: ['LEAVE_TYPE_VIEW'] },
          { title: 'กำหนดสิทธิ์การลา', href: '/leave?tab=policies', icon: ShieldCheck, requiredPermissions: ['LEAVE_POLICY_VIEW'] },
          { title: 'ยอดวันลาพนักงาน', href: '/leave?tab=balances', icon: Wallet, requiredPermissions: ['LEAVE_BALANCE_VIEW'] },
        ],
      },
      {
        title: 'วันทำงานและวันหยุด',
        href: '/work-calendar',
        matchPrefix: '/work-calendar',
        icon: CalendarDays,
        requiredPermissions: [
          'WORK_CALENDAR_VIEW',
        ],
        children: [
          { title: 'วันทำงานประจำสัปดาห์', href: '/work-calendar?tab=work-week', icon: CalendarDays, requiredPermissions: ['WORK_CALENDAR_VIEW'] },
          { title: 'วันหยุดประจำปี', href: '/work-calendar?tab=holidays', icon: Palmtree, requiredPermissions: ['WORK_CALENDAR_VIEW'] },
        ],
      },
    ],
  },
  {
    category: 'การอนุมัติและรายงาน',
    items: [
      {
        title: 'การอนุมัติ',
        href: '/approvals/leave-requests',
        matchPrefix: '/approvals',
        icon: CheckCircle2,
        requiredPermissions: [
          'APPROVAL_LEAVE_VIEW',
          'APPROVAL_LEAVE_APPROVE',
          'APPROVAL_TIME_VIEW',
          'APPROVAL_TIME_APPROVE',
          'APPROVAL_EMP_VIEW',
          'APPROVAL_EMP_APPROVE',
          'APPROVAL_PAYROLL_VIEW',
          'APPROVAL_PAYROLL_APPROVE',
        ],
        children: [
          { title: 'เอกสารรอดำเนินการ', href: '/approvals/leave-requests', icon: Clock },
          { title: 'ประวัติเอกสาร', href: '/approvals/history', icon: History },
        ],
      },
      {
        title: 'รายงาน',
        href: '/reports',
        matchPrefix: '/reports',
        icon: BarChart3,
        requiredPermissions: [
          'REPORT_VIEW',
          'REPORT_ATT_VIEW',
          'REPORT_HEADCOUNT_VIEW',
          'REPORT_LEAVE_VIEW',
        ],
        children: [
          { title: 'พนักงานแยกตามแผนก', href: '/reports?tab=department', icon: PieChart, requiredPermissions: ['REPORT_HEADCOUNT_VIEW', 'REPORT_VIEW'] },
          { title: 'การเข้าออกงาน', href: '/reports?tab=attendance', icon: CalendarCheck, requiredPermissions: ['REPORT_ATT_VIEW', 'REPORT_VIEW'] },
          { title: 'การลา', href: '/reports?tab=leave', icon: CalendarX2, requiredPermissions: ['REPORT_LEAVE_VIEW', 'REPORT_VIEW'] },
          { title: 'อัตราการลาออก', href: '/reports?tab=turnover', icon: UserMinus, requiredPermissions: ['REPORT_HEADCOUNT_VIEW', 'REPORT_VIEW'] },
          { title: 'ภาษีและประกันสังคม', href: '/reports?tab=tax', icon: Receipt, requiredPermissions: ['REPORT_VIEW'] },
        ],
      },
    ],
  },
  {
    category: 'ระบบและการตั้งค่า',
    items: [
      {
        title: 'ข้อมูลหลัก',
        href: '/master',
        matchPrefix: '/master',
        icon: Database,
        requiredPermissions: [
          'MASTER_DATA_VIEW',
        ],
        children: [
          { title: 'ประเภทเอกสารแนบ', href: '/master?tab=document-types', icon: FileText, requiredPermissions: ['MASTER_DATA_VIEW'] },
          { title: 'ประเภทหนังสือรับรอง', href: '/master?tab=certificate-types', icon: Award, requiredPermissions: ['MASTER_DATA_VIEW'] },
          { title: 'สัญชาติ', href: '/master?tab=nationalities', icon: Globe, requiredPermissions: ['MASTER_DATA_VIEW'] },
          { title: 'ศาสนา', href: '/master?tab=religions', icon: Heart, requiredPermissions: ['MASTER_DATA_VIEW'] },
          { title: 'สถานภาพสมรส', href: '/master?tab=marital-statuses', icon: HeartHandshake, requiredPermissions: ['MASTER_DATA_VIEW'] },
          { title: 'เพศ', href: '/master?tab=genders', icon: User, requiredPermissions: ['MASTER_DATA_VIEW'] },
          { title: 'ธนาคาร', href: '/master?tab=banks', icon: Landmark, requiredPermissions: ['MASTER_DATA_VIEW'] },
        ],
      },
      {
        title: 'ตั้งค่าระบบ',
        href: '/settings',
        matchPrefix: '/settings',
        icon: Settings,
        requiredPermissions: [
          'SETTINGS_USERS_VIEW',
          'SETTINGS_ROLES_VIEW',
          'SETTINGS_AUDIT_VIEW',
        ],
        children: [
          { title: 'ผู้ใช้งาน', href: '/settings?tab=users', icon: UserCheck, requiredPermissions: ['SETTINGS_USERS_VIEW'] },
          { title: 'บทบาทและสิทธิ์', href: '/settings?tab=roles', icon: ShieldCheck, requiredPermissions: ['SETTINGS_ROLES_VIEW'] },
          { title: 'บันทึกการใช้งานระบบ', href: '/settings?tab=audit-log', icon: ScrollText, requiredPermissions: ['SETTINGS_AUDIT_VIEW'] },
          { title: 'สายการอนุมัติ', href: '/settings?tab=approval-flows', icon: Workflow, requiredPermissions: ['SETTINGS_ROLES_VIEW', 'SETTINGS_USERS_VIEW'] },
        ],
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, hasPermission, hasRole } = useAuth();
  const { isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();
  const isDesktop = useIsDesktop();
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const handleSelectMenu = () => {
    // Desktop: คงสถานะเมนูไว้ตามที่ผู้ใช้ตั้ง (ขยายค้างไว้), Mobile: ปิด drawer
    if (!isDesktop) {
      closeMobileSidebar();
    }
    setSearchTerm('');
  };

  // ตรวจสอบสิทธิ์สำหรับ SubMenuItem
  const checkSubItemAccessible = useCallback(
    (subItem: SubMenuItem): boolean => {
      if (!user) return true;
      if (hasRole('ADMIN') || hasRole('SYSTEM_SUPER')) return true;

      if (subItem.requiredRoles && subItem.requiredRoles.length > 0) {
        const hasAnyRole = subItem.requiredRoles.some((role) => hasRole(role));
        if (!hasAnyRole) return false;
      }

      if (subItem.requiredPermissions && subItem.requiredPermissions.length > 0) {
        const hasAnyPermission = subItem.requiredPermissions.some((perm) => hasPermission(perm));
        if (!hasAnyPermission) return false;
      }

      return true;
    },
    [user, hasRole, hasPermission]
  );

  // กรองเมนูตามสิทธิ์ (RBAC: Permission & Role Data Scope)
  const checkItemAccessible = useCallback(
    (item: MenuItem): boolean => {
      if (!user) return true;

      // สำหรับเมนูตั้งค่าระบบ อนุญาตให้ผู้ดูแลระบบ (ADMIN หรือ SYSTEM_SUPER) เข้าได้เสมอเพื่อป้องกัน lockout
      if (item.href === '/settings' && (hasRole('ADMIN') || hasRole('SYSTEM_SUPER'))) {
        return true;
      }

      // หากเป็นเมนูแดชบอร์ด ต้องมีสิทธิ์อย่างน้อย 1 สิทธิ์ขึ้นไป
      if (item.href === '/') {
        const hasAnyPerm = Boolean(user.permissions && user.permissions.length > 0);
        if (!hasAnyPerm) return false;
      }

      // ตรวจสอบ Role
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        const hasAnyRole = item.requiredRoles.some((role) => hasRole(role));
        if (!hasAnyRole) return false;
      }

      // ตรวจสอบ Permission
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        const hasAnyPermission = item.requiredPermissions.some((perm) => hasPermission(perm));
        if (!hasAnyPermission) return false;
      }

      return true;
    },
    [user, hasRole, hasPermission]
  );

  // กรองเมนูหลักและเมนูย่อยตามสิทธิ์และคำค้นหา
  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return menuGroups
      .map((group) => {
        const accessibleGroupItems = group.items
          .filter(checkItemAccessible)
          .map((item) => {
            // กรอง children ตามสิทธิ์
            const accessibleChildren = item.children
              ? item.children.filter(checkSubItemAccessible)
              : undefined;

            return {
              ...item,
              children: accessibleChildren,
            };
          });

        const matchedItems = accessibleGroupItems.filter((item) => {
          if (!term) return true;
          const parentMatches = item.title.toLowerCase().includes(term);
          const childMatches = item.children?.some((child) =>
            child.title.toLowerCase().includes(term)
          );
          return parentMatches || Boolean(childMatches);
        });

        return {
          ...group,
          items: matchedItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [checkItemAccessible, checkSubItemAccessible, searchTerm]);

  // Flatten accessible items
  const allAccessibleItems = useMemo(() => {
    return filteredGroups.flatMap((g) => g.items);
  }, [filteredGroups]);

  // ตรวจสอบว่า SubMenuItem นั้นกำลัง Active หรือไม่
  const isChildActive = useCallback(
    (child: SubMenuItem) => {
      const [childPath, childQuery] = child.href.split('?');

      if (childQuery) {
        if (pathname !== childPath) return false;
        const childParams = new URLSearchParams(childQuery);
        const childTab = childParams.get('tab');
        const currentTab = searchParams.get('tab');

        if (currentTab) {
          if (currentTab === childTab) return true;
          // Special matching for reports: attendance matches headcount or lateness
          if (childTab === 'attendance' && (currentTab === 'headcount' || currentTab === 'lateness')) {
            return true;
          }
          return false;
        }

        // กรณีไม่มี ?tab ใน URL ให้จับคู่กับ Default Tab ของแต่ละหน้า
        if (childPath === '/settings' && childTab === 'users') return true;
        if (childPath === '/organization' && childTab === 'divisions') return true;
        if (childPath === '/payroll' && (childTab === 'periods' || childTab === 'process')) return true;
        if (childPath === '/attendance/daily' && childTab === 'daily') return true;
        if (childPath === '/attendance/schedules' && childTab === 'roster') return true;
        if (childPath === '/leave' && childTab === 'types') return true;
        if (childPath === '/work-calendar' && childTab === 'work-week') return true;
        if (childPath === '/reports' && childTab === 'department') return true;
        if (childPath === '/master' && childTab === 'document-types') return true;
        if (childPath === '/announcements' && (childTab === 'general' ? (!currentTab || currentTab === 'general') : currentTab === childTab)) return true;
        if (childPath === '/ess/attendance' && childTab === 'history') return true;
        return false;
      }

      // กรณีเป็น Clean Route ที่ไม่มี query string
      if (child.href === '/employees') {
        return pathname === '/employees' || pathname.match(/^\/employees\/\d+/) !== null;
      }
      if (child.href === '/documents') {
        return (
          pathname === '/documents' ||
          (pathname.startsWith('/documents/') &&
            !pathname.startsWith('/documents/history') &&
            !pathname.startsWith('/documents/leave'))
        );
      }
      if (child.href === '/approvals/leave-requests') {
        return pathname === '/approvals/leave-requests' || pathname === '/approvals';
      }
      if (child.href === '/ess/attendance') {
        const currentTab = searchParams.get('tab');
        return pathname === '/ess/attendance' && (!currentTab || currentTab === 'history');
      }
      return pathname === child.href || pathname.startsWith(`${child.href}/`);
    },
    [pathname, searchParams]
  );

  // ตรวจสอบสถานะ Active ของเมนูเดี่ยว (ไม่มีลูก)
  const isSingleItemActive = useCallback(
    (item: MenuItem) => {
      if (item.href === '/' && pathname === '/') return true;
      if (!item.matchPrefix || !pathname.startsWith(item.matchPrefix)) return false;

      const matches = allAccessibleItems.filter((i) => i.matchPrefix && pathname.startsWith(i.matchPrefix));
      if (matches.length === 0) return false;
      const longestMatch = matches.reduce((a, b) => ((b.matchPrefix?.length ?? 0) > (a.matchPrefix?.length ?? 0) ? b : a));
      return longestMatch.href === item.href;
    },
    [allAccessibleItems, pathname]
  );

  // ตรวจสอบว่าเมนูหลัก (Parent) กำลังอยู่ในสถานะ Active หรือไม่ (ถ้ามีลูกตัวใดตัวหนึ่ง active)
  const isParentActive = useCallback(
    (item: MenuItem) => {
      if (item.children && item.children.length > 0) {
        return item.children.some(isChildActive);
      }
      return isSingleItemActive(item);
    },
    [isChildActive, isSingleItemActive]
  );

  // Auto-expand เมนูที่มีลูก active หรือตรงกับคำค้นหา หรืออยู่ในโหมด Tour
  useEffect(() => {
    const hasTour = Boolean(searchParams.get('tour'));
    allAccessibleItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const hasActiveChild = item.children.some(isChildActive);
        if (hasActiveChild || hasTour) {
          setOpenMenus((prev) => ({ ...prev, [item.title]: true }));
        }
      }
    });
  }, [pathname, searchParams, allAccessibleItems, isChildActive]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      allAccessibleItems.forEach((item) => {
        if (item.children && item.children.length > 0) {
          const hasMatchingChild = item.children.some((c) =>
            c.title.toLowerCase().includes(term)
          );
          if (hasMatchingChild) {
            setOpenMenus((prev) => ({ ...prev, [item.title]: true }));
          }
        }
      });
    }
  }, [searchTerm, allAccessibleItems]);

  const expandableItems = useMemo(
    () => allAccessibleItems.filter((item) => item.children && item.children.length > 0),
    [allAccessibleItems]
  );

  const isAllExpanded = useMemo(
    () => expandableItems.length > 0 && expandableItems.every((item) => Boolean(openMenus[item.title])),
    [expandableItems, openMenus]
  );

  const handleToggleAllMenus = () => {
    if (isAllExpanded) {
      setOpenMenus({});
    } else {
      const next: Record<string, boolean> = {};
      expandableItems.forEach((item) => {
        next[item.title] = true;
      });
      setOpenMenus(next);
    }
  };

  const toggleMenu = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleParentClick = (item: MenuItem, e: React.MouseEvent) => {
    if (item.children && item.children.length > 0) {
      if (isCollapsed && isDesktop) {
        toggleSidebar();
      } else {
        setOpenMenus((prev) => ({
          ...prev,
          [item.title]: !prev[item.title],
        }));
      }
    } else {
      handleSelectMenu();
    }
  };

  const resolveItemHref = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      const firstAccessible = item.children.find(checkSubItemAccessible);
      return firstAccessible ? firstAccessible.href : item.href;
    }
    return item.href;
  };

  // ===== Sidebar Inner Content (shared between Desktop and Mobile) =====
  const sidebarContent = (
    <>
      {/* 1. Header: Logo & System Name */}
      <div className={`h-20 flex items-center border-b border-slate-100/80 transition-all duration-300 ease-in-out ${isCollapsed && isDesktop ? 'justify-center px-0' : 'justify-between px-5'}`}>
        <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed && isDesktop ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}`}>
          <Link href="/" onClick={handleSelectMenu} className="flex items-center gap-3 overflow-hidden">
            {/* Logo Badge Icon */}
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0 transition-transform duration-200 hover:scale-105">
              <Users className="w-5 h-5" />
            </div>

            <div className="leading-tight select-none whitespace-nowrap">
              <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Human</div>
              <div className="text-[15px] font-bold text-primary dark:text-blue-400 tracking-tight">Resource</div>
            </div>
          </Link>
        </div>

        {/* Desktop: Toggle Collapse Button / Mobile: Close Button */}
        {isDesktop ? (
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
            className="w-8 h-8 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-90 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-primary dark:text-blue-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button
            onClick={closeMobileSidebar}
            title="ปิดเมนู"
            className="w-8 h-8 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 active:scale-90 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Search Input */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed && isDesktop ? 'max-h-0 opacity-0 pointer-events-none py-0' : 'max-h-16 opacity-100 px-4 pt-4 pb-2'
        }`}
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเมนู..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>


      {/* 3. Navigation Menu Items Grouped by Category */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {filteredGroups.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            {(!isCollapsed || !isDesktop) && 'ไม่พบเมนูที่ค้นหา'}
          </div>
        )}

        {filteredGroups.map((group, groupIndex) => (
          <div key={group.category} className="space-y-1">
            {/* Category Header Label */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap select-none ${
                isCollapsed && isDesktop
                  ? 'max-h-0 opacity-0 pointer-events-none'
                  : 'max-h-8 opacity-100 px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider'
              }`}
            >
              {group.category}
            </div>
            {isCollapsed && isDesktop && groupIndex > 0 && (
              <div className="my-2 border-t border-slate-100 dark:border-slate-700/80 mx-2 transition-all duration-300" />
            )}

            {/* Menu Items */}
            {group.items.map((item) => {
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const parentActive = isParentActive(item);
              const isOpen = openMenus[item.title] ?? false;
              const Icon = item.icon;

              if (hasChildren) {
                return (
                  <div key={item.href} className="space-y-0.5">
                    {/* Parent Menu Row with Expand/Collapse */}
                    <div
                      data-sidebar-path={item.href}
                      data-sidebar-title={item.title}
                      onClick={(e) => handleParentClick(item, e)}
                      title={isCollapsed && isDesktop ? item.title : undefined}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ease-out cursor-pointer select-none active:scale-[0.99] ${
                        parentActive
                          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                      } ${isCollapsed && isDesktop ? 'justify-center px-0 py-2.5' : ''}`}
                    >
                      <div className={`flex items-center ${isCollapsed && isDesktop ? 'justify-center' : 'gap-3.5 min-w-0'}`}>
                        <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${parentActive ? 'text-primary dark:text-blue-400 scale-105' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span
                          className={`truncate transition-all duration-300 ease-in-out whitespace-nowrap ${
                            isCollapsed && isDesktop ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[150px] opacity-100 translate-x-0'
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      {(!isCollapsed || !isDesktop) && (
                        <button
                          type="button"
                          onClick={(e) => toggleMenu(item.title, e)}
                          title={isOpen ? 'ย่อเมนูย่อย' : 'ขยายเมนูย่อย'}
                          className="p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-primary dark:text-blue-400' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Submenu Items List with Topic Icons */}
                    {(!isCollapsed || !isDesktop) && isOpen && item.children && (
                      <div className="pl-5 pr-1 py-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-5 my-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {item.children.map((child) => {
                          const childActive = isChildActive(child);
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              data-sidebar-path={child.href}
                              data-sidebar-title={child.title}
                              onClick={handleSelectMenu}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                                childActive
                                  ? 'text-primary dark:text-blue-300 font-bold bg-primary/10 dark:bg-primary/25 shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              {ChildIcon ? (
                                <ChildIcon
                                  className={`w-4.5 h-4.5 shrink-0 transition-transform duration-150 ${
                                    childActive
                                      ? 'text-primary dark:text-blue-400 scale-105'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                />
                              ) : (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                                    childActive ? 'bg-primary dark:bg-blue-400 scale-125' : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                />
                              )}
                              <span className="truncate">{child.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Single Item without children
              const active = isSingleItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={resolveItemHref(item)}
                  data-sidebar-path={item.href}
                  data-sidebar-title={item.title}
                  onClick={handleSelectMenu}
                  title={isCollapsed && isDesktop ? item.title : undefined}
                  className={`flex items-center px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ease-out active:scale-[0.98] ${
                    active
                      ? 'bg-primary text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-0.5'
                  } ${isCollapsed && isDesktop ? 'justify-center px-0 py-2.5' : 'gap-3.5'}`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${active ? 'text-white scale-105' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span
                    className={`truncate transition-all duration-300 ease-in-out whitespace-nowrap ${
                      isCollapsed && isDesktop ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none' : 'max-w-[160px] opacity-100 translate-x-0'
                    }`}
                  >
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 4. Bottom Footer: Expand / Collapse All Submenus */}
      {expandableItems.length > 0 && (!isCollapsed || !isDesktop) && (
        <div className="shrink-0 px-4 py-3 border-t border-slate-100/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
            แท็บเมนูทั้งหมด
          </span>
          <button
            type="button"
            onClick={handleToggleAllMenus}
            title={isAllExpanded ? 'ปิดแท็บเมนูทั้งหมด' : 'เปิดแท็บเมนูทั้งหมด'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer select-none ${
              isAllExpanded
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                : 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:text-blue-300 dark:hover:bg-primary/30'
            }`}
          >
            {isAllExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5" />
                <span>ปิดทั้งหมด</span>
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>เปิดทั้งหมด</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ===== Desktop Sidebar: Static flex child, hidden on mobile ===== */}
      <aside
        className={`hidden lg:flex bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col shrink-0 transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ===== Mobile Sidebar: Overlay Drawer + Backdrop ===== */}
      {!isDesktop && (
        <>
          {/* Backdrop overlay */}
          <div
            className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
              isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
              isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};
