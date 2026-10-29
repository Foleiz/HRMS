'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/common/AccessDenied';

import {
  GreetingBanner,
  DashboardRole,
} from '@/components/dashboard/DashboardHeader';
import { UpcomingEventsWidget } from '@/components/dashboard/UpcomingEventsWidget';
import { RecentTransactionsTable } from '@/components/dashboard/RecentTransactionsTable';

// Employee specific widgets
import { EmployeeStatCards } from '@/components/dashboard/employee/EmployeeStatCards';
import { CalendarWidget } from '@/components/dashboard/employee/CalendarWidget';
import { NewsWidget } from '@/components/dashboard/employee/NewsWidget';

// Manager specific widgets
import { ManagerStatCards } from '@/components/dashboard/manager/ManagerStatCards';
import { NotificationsWidget } from '@/components/dashboard/manager/NotificationsWidget';
import { AttendancePieChart } from '@/components/dashboard/manager/AttendancePieChart';

export default function HomePage() {
  const { user, isLoading, hasRole, hasPermission, logout } = useAuth();
  const router = useRouter();

  // หน้าแรกต้องเข้าสู่ระบบก่อนเสมอ — ยังไม่ login ให้ไปหน้า login (replace: กดย้อนกลับแล้วไม่วนกลับมาหน้านี้)
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  // คำนวณแดชบอร์ดที่ผู้ใช้ได้รับสิทธิ์จริงจากระบบสิทธิ์ (Dashboard Permission Matrix)
  const allowedDashboards = React.useMemo<DashboardRole[]>(() => {
    if (!user) return ['EMPLOYEE'];
    const roles = user.roles || [];
    if (roles.includes('ADMIN') || roles.includes('SYSTEM_SUPER')) {
      return ['ADMIN', 'CEO', 'DIV_MGR', 'DEPT_MGR', 'EMPLOYEE'];
    }

    const list: DashboardRole[] = [];
    if (hasPermission('DASHBOARD_ADMIN_VIEW') || roles.includes('ADMIN') || roles.includes('HR_ADMIN')) {
      list.push('ADMIN');
    }
    if (hasPermission('DASHBOARD_CEO_VIEW') || roles.includes('CEO') || roles.includes('EXECUTIVE')) {
      list.push('CEO');
    }
    if (hasPermission('DASHBOARD_DIV_VIEW') || roles.includes('DIV_MGR') || roles.includes('LINE_MANAGER')) {
      list.push('DIV_MGR');
    }
    if (hasPermission('DASHBOARD_DEPT_VIEW') || roles.includes('DEPT_MGR')) {
      list.push('DEPT_MGR');
    }
    if (
      hasPermission('DASHBOARD_EMP_VIEW') ||
      hasPermission('DASHBOARD_EMPLOYEE_VIEW') ||
      roles.includes('EMPLOYEE') ||
      roles.includes('STAFF') ||
      list.length === 0
    ) {
      list.push('EMPLOYEE');
    }

    return list.length > 0 ? list : ['EMPLOYEE'];
  }, [user, hasPermission]);

  const [selectedRole, setSelectedRole] = useState<DashboardRole | null>(null);
  const initializedForUserRef = React.useRef<string | number | null>(null);

  const currentUid = user ? (user.id || user.username || 'current') : null;

  useEffect(() => {
    if (user && allowedDashboards.length > 0 && currentUid) {
      if (initializedForUserRef.current !== currentUid) {
        initializedForUserRef.current = currentUid;
        setSelectedRole(allowedDashboards[0]);
      } else if (selectedRole && !allowedDashboards.includes(selectedRole)) {
        setSelectedRole(allowedDashboards[0]);
      }
    }
  }, [user, allowedDashboards, currentUid, selectedRole]);

  const activeRole: DashboardRole =
    selectedRole && allowedDashboards.includes(selectedRole) && initializedForUserRef.current === currentUid
      ? selectedRole
      : allowedDashboards[0] || 'EMPLOYEE';

  const displayName = user?.fullName || user?.username || 'ผู้ใช้งาน';

  const hasAnyPermission = Boolean(
    (user?.permissions && user.permissions.length > 0) || hasRole('ADMIN')
  );

  // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงข้อมูลในโมดูลอื่นใดหรือไม่ (ที่ไม่ใช่แค่สิทธิ์ดูแดชบอร์ดอย่างเดียว)
  const hasDataModulePermission = React.useMemo(() => {
    if (!user) return false;
    if (hasRole('ADMIN') || hasRole('SYSTEM_SUPER')) return true;

    const permissions = user.permissions || [];
    // คัดกรองสิทธิ์ที่เกี่ยวกับโมดูลข้อมูลจริง (เช่น EMP, TIME, LEAVE, PAYROLL, ORG, REPORT, ESS, SETTINGS ฯลฯ)
    const dataPerms = permissions.filter(
      (p) => !p.startsWith('DASHBOARD_') && p !== 'DASHBOARD' && p !== 'DASHBOARD_VIEW'
    );
    return dataPerms.length > 0;
  }, [user, hasRole]);

  // ระหว่างตรวจเซสชัน / กำลังพาไปหน้า login — ไม่แสดงแดชบอร์ด
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-blue-300" aria-label="กำลังตรวจสอบการเข้าสู่ระบบ" />
      </div>
    );
  }

  if (user && !hasAnyPermission) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-2xl w-full mx-auto flex items-center justify-center">
            <AccessDenied
              title="คุณยังไม่ได้รับสิทธิ์การใช้งานในระบบ"
              message="ขออภัย บัญชีของคุณยังไม่ได้รับการกำหนดสิทธิ์ในการเข้าถึงเมนูหรือโมดูลใดๆ ในระบบ กรุณาติดต่อผู้ดูแลระบบ (Admin) หรือฝ่ายทรัพยากรบุคคลเพื่อขอสิทธิ์การใช้งาน"
              backText="ออกจากระบบ (Logout)"
              onBackAction={logout}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        {/* Dashboard Main Workspace */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 w-full">
          {!hasDataModulePermission ? (
            <div className="flex flex-col gap-4">
              <GreetingBanner displayName={displayName} />
              {/* กล่องแจ้งเตือนเมื่อติ๊กเฉพาะแดชบอร์ด แต่ไม่ได้เลือกหัวข้อข้อมูลอื่นใด */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-8 sm:p-14 text-center shadow-xs flex flex-col items-center justify-center my-2">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-5 shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                  คุณไม่มีสิทธิ์การเข้าถึงข้อมูล
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed mb-6">
                  บทบาทของคุณยังไม่ได้รับการกำหนดสิทธิ์ในการเข้าถึงข้อมูลสถิติหรือโมดูลใดๆ ในระบบ 
                  หากต้องการดูข้อมูลสรุป กรุณาติดต่อผู้ดูแลระบบ (Admin) หรือฝ่ายทรัพยากรบุคคลเพื่อขอเปิดสิทธิ์ในโมดูลที่ต้องการใช้งาน
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 min-h-full">
              {/* Top Row: Left (GreetingBanner + 6 Stat Cards + UpcomingEvents) aligned at bottom with Right (CalendarWidget) */}
              <div className="flex flex-col lg:flex-row gap-4 items-stretch shrink-0">
                <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
                  <GreetingBanner displayName={displayName} />

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch flex-1">
                    {/* 6 Stat Cards: spans 2 cols on xl */}
                    <div className="xl:col-span-2 h-full">
                      {activeRole === 'EMPLOYEE' ? (
                        <EmployeeStatCards />
                      ) : (
                        <ManagerStatCards role={activeRole} />
                      )}
                    </div>

                    {/* Upcoming Events Widget: spans 1 col on xl */}
                    <div className="xl:col-span-1 h-full">
                      <UpcomingEventsWidget />
                    </div>
                  </div>
                </div>

                {/* Right Top: Calendar Widget */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col">
                  <CalendarWidget />
                </div>
              </div>

              {/* Bottom Row: Left (RecentTransactionsTable) aligned at top with Right (NewsWidget) */}
              <div className="flex flex-col lg:flex-row gap-4 items-stretch flex-1 min-h-0">
                <div className="flex-1 w-full flex flex-col min-h-0 min-w-0">
                  <RecentTransactionsTable />
                </div>

                <div className="w-full lg:w-80 shrink-0 flex flex-col min-h-0">
                  <NewsWidget />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
