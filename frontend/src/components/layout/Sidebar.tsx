'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import {
  LayoutDashboard,
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
} from 'lucide-react';
import { formatRoleName } from '@/lib/roleUtils';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
  /** สิทธิ์ที่ต้องมี (มีข้อใดข้อหนึ่ง หรือเป็น ADMIN) */
  requiredPermissions?: string[];
  /** บทบาทที่ต้องมี (มีข้อใดข้อหนึ่ง หรือเป็น ADMIN) */
  requiredRoles?: string[];
}

interface MenuGroup {
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
        title: 'ข่าวสารสำหรับฉัน',
        href: '/my-news',
        matchPrefix: '/my-news',
        icon: CalendarDays,
        requiredPermissions: ['ESS_NEWS_VIEW'],
      },
      {
        // แผนผังองค์กร — พนักงานทุกคนดูได้ (ไม่ต้องมีสิทธิ์)
        title: 'แผนผังองค์กร',
        href: '/org-chart',
        matchPrefix: '/org-chart',
        icon: Network,
      },
    ],
  },
  {
    category: 'บริการตนเอง (ESS)',
    items: [
      {
        title: 'โปรไฟล์ของฉัน',
        href: '/profile',
        matchPrefix: '/profile',
        icon: User,
        requiredPermissions: ['ESS_PROFILE_VIEW'],
      },
      {
        title: 'ยื่นเอกสาร',
        href: '/documents',
        matchPrefix: '/documents',
        icon: FileText,
        requiredPermissions: ['ESS_DOCS_VIEW'],
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
        requiredPermissions: ['ESS_LEAVE_VIEW', 'LEAVE_BALANCE_VIEW'],
      },
      {
        title: 'บันทึกเวลาของฉัน',
        href: '/ess/attendance',
        matchPrefix: '/ess/attendance',
        icon: Clock,
        requiredPermissions: ['ESS_TIME_VIEW', 'TIME_DAILY_VIEW', 'TIME_VIEW'],
      },
      {
        title: 'สวัสดิการของฉัน',
        href: '/ess/benefits',
        matchPrefix: '/ess/benefits',
        icon: Gift,
        requiredPermissions: ['ESS_BENEFIT_VIEW', 'ESS_PROFILE_VIEW'],
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
        ],
      },
      {
        title: 'ยอดสวัสดิการพนักงาน',
        href: '/benefits/balances',
        matchPrefix: '/benefits/balances',
        icon: Gift,
        requiredPermissions: [
          'BENEFIT_BALANCE_VIEW',
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
      },
      {
        title: 'จัดการประกาศ',
        href: '/announcements',
        matchPrefix: '/announcements',
        icon: Megaphone,
        requiredPermissions: ['ANNOUNCEMENTS_VIEW'],
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
      },
      {
        title: 'การจัดตารางงาน',
        href: '/attendance/schedules',
        matchPrefix: '/attendance/schedules',
        icon: CalendarRange,
        requiredPermissions: [
          'TIME_SCHEDULE_VIEW',
        ],
      },
      {
        title: 'การลา',
        href: '/leave',
        matchPrefix: '/leave',
        icon: CalendarCheck,
        requiredPermissions: [
          'LEAVE_BALANCE_VIEW',
          'LEAVE_TYPE_VIEW',
          'LEAVE_POLICY_VIEW',
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
      },
    ],
  },
  {
    category: 'ระบบและการตั้งค่า',
    items: [
      {
        title: 'ข้อมูลหลัก (Master Data)',
        href: '/master',
        matchPrefix: '/master',
        icon: Database,
        requiredPermissions: [
          'MASTER_DATA_VIEW',
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
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, hasPermission, hasRole } = useAuth();
  const { isCollapsed, toggleSidebar, collapseSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();
  const isDesktop = useIsDesktop();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectMenu = () => {
    // Desktop: ย่อ sidebar, Mobile: ปิด drawer
    if (isDesktop) {
      collapseSidebar();
    } else {
      closeMobileSidebar();
    }
    setSearchTerm('');
  };

  // กรองเมนูตามสิทธิ์ (RBAC: Permission & Role Data Scope)
  const checkItemAccessible = (item: MenuItem) => {
    // 1. หากยังไม่ล็อกอิน ให้ bypass/default
    if (!user) return true;

    // สำหรับเมนูตั้งค่าระบบ อนุญาตให้ผู้ดูแลระบบ (ADMIN หรือ SYSTEM_SUPER) เข้าได้เสมอเพื่อป้องกัน lockout
    if (item.href === '/settings' && (hasRole('ADMIN') || hasRole('SYSTEM_SUPER'))) {
      return true;
    }

    // หากเป็นเมนูแดชบอร์ด ต้องมีสิทธิ์อย่างน้อย 1 สิทธิ์ขึ้นไป (ถ้าไม่มีสิทธิ์ใดๆ เลย จะไม่แสดงแดชบอร์ด)
    if (item.href === '/') {
      const hasAnyPerm = Boolean(user.permissions && user.permissions.length > 0);
      if (!hasAnyPerm) return false;
    }

    // 2. ตรวจสอบ Role ถ้ามีการกำหนด
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasAnyRole = item.requiredRoles.some((role) => hasRole(role));
      if (!hasAnyRole) return false;
    }

    // 3. ตรวจสอบ Permission ถ้ามีการกำหนด
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasAnyPermission = item.requiredPermissions.some((perm) => hasPermission(perm));
      if (!hasAnyPermission) return false;
    }

    return true;
  };

  // Grouped & Filtered by RBAC and Search Term
  const filteredGroups = menuGroups
    .map((group) => {
      const accessibleGroupItems = group.items.filter(checkItemAccessible);
      const matchedItems = accessibleGroupItems.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
      return {
        ...group,
        items: matchedItems,
      };
    })
    .filter((group) => group.items.length > 0);

  // Flatten accessible items for isActive calculation
  const allAccessibleItems = menuGroups
    .flatMap((g) => g.items)
    .filter(checkItemAccessible);

  const isActive = (item: MenuItem) => {
    if (item.href === '/' && pathname === '/') return true;
    if (!item.matchPrefix || !pathname.startsWith(item.matchPrefix)) return false;

    // ป้องกันกรณี matchPrefix ซ้อนกัน — ให้ยึดเมนูที่ prefix ตรงกับ pathname มากที่สุด (ยาวที่สุด) เป็นตัวไฮไลต์เพียงอันเดียว
    const matches = allAccessibleItems.filter((i) => i.matchPrefix && pathname.startsWith(i.matchPrefix));
    if (matches.length === 0) return false;
    const longestMatch = matches.reduce((a, b) => ((b.matchPrefix?.length ?? 0) > (a.matchPrefix?.length ?? 0) ? b : a));
    return longestMatch.href === item.href;
  };

  // ===== Sidebar Inner Content (shared between Desktop and Mobile) =====
  const sidebarContent = (
    <>
      {/* 1. Header: Logo & System Name */}
      <div className={`h-20 flex items-center border-b border-slate-100/80 transition-all ${isCollapsed && isDesktop ? 'justify-center px-0' : 'justify-between px-5'}`}>
        {(!isCollapsed || !isDesktop) && (
          <Link href="/" onClick={handleSelectMenu} className="flex items-center gap-3 overflow-hidden">
            {/* Logo Badge Icon (3 avatars in navy square) */}
            <div className="w-10 h-10 rounded-xl bg-[#0B2046] text-white flex items-center justify-center shadow-md shadow-[#0B2046]/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>

            <div className="leading-tight select-none">
              <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Human</div>
              <div className="text-[15px] font-bold text-[#0B2046] dark:text-blue-400 tracking-tight">Resource</div>
            </div>
          </Link>
        )}

        {/* Desktop: Toggle Collapse Button / Mobile: Close Button */}
        {isDesktop ? (
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
            className="w-8 h-8 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onClick={closeMobileSidebar}
            title="ปิดเมนู"
            className="w-8 h-8 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Search Input */}
      {(!isCollapsed || !isDesktop) && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 dark:text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full pl-9 pr-3 py-2 bg-[#F1F5F9] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 dark:focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      )}

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
            {(!isCollapsed || !isDesktop) ? (
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                {group.category}
              </div>
            ) : (
              groupIndex > 0 && <div className="my-2 border-t border-slate-100 dark:border-slate-700/80 mx-2" />
            )}

            {/* Menu Items */}
            {group.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleSelectMenu}
                  title={isCollapsed && isDesktop ? item.title : undefined}
                  className={`flex items-center gap-3.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-[#0B2046] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  } ${isCollapsed && isDesktop ? 'justify-center px-0 py-2.5' : ''}`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                  {(!isCollapsed || !isDesktop) && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 4. Bottom User Profile Card (like in modern sidebar design) */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {(!isCollapsed || !isDesktop) ? (
          <Link
            href="/profile"
            onClick={handleSelectMenu}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0B2046]/10 dark:bg-[#0B2046]/30 text-[#0B2046] dark:text-blue-400 font-semibold text-xs flex items-center justify-center shrink-0 border border-[#0B2046]/15 dark:border-blue-500/20">
                {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight group-hover:text-[#0B2046] dark:group-hover:text-blue-400">
                  {user?.fullName || user?.username || 'ผู้ใช้งาน'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                  {user?.roleNames?.[0] || formatRoleName(user?.roles?.[0] || '') || 'พนักงาน'}
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/profile"
            onClick={handleSelectMenu}
            title={user?.fullName || user?.username || 'โปรไฟล์'}
            className="flex justify-center p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#0B2046]/10 dark:bg-[#0B2046]/30 text-[#0B2046] dark:text-blue-400 font-semibold text-xs flex items-center justify-center shrink-0 border border-[#0B2046]/15 dark:border-blue-500/20">
              {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ===== Desktop Sidebar: Static flex child, hidden on mobile ===== */}
      <aside
        className={`hidden lg:flex bg-white border-r border-slate-200/80 flex-col shrink-0 transition-all duration-300 ease-in-out z-20 ${
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
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
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

