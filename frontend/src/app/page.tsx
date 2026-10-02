'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';
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
  const { user, hasRole, hasPermission, logout } = useAuth();

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

  const [activeRole, setActiveRole] = useState<DashboardRole>('EMPLOYEE');

  useEffect(() => {
    if (user && allowedDashboards.length > 0) {
      if (!allowedDashboards.includes(activeRole)) {
        setActiveRole(allowedDashboards[0]);
      }
    }
  }, [user, allowedDashboards, activeRole]);

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

  if (user && !hasAnyPermission) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-8 max-w-2xl w-full mx-auto flex items-center justify-center">
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 w-full max-w-[1500px] mx-auto">
          {/* Main 2-Column Responsive Layout */}
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            
            {/* Left / Center Main Content (flex-1) */}
            <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
              {/* Greeting Banner */}
              <GreetingBanner displayName={displayName} />

              {!hasDataModulePermission ? (
                /* กล่องแจ้งเตือนเมื่อติ๊กเฉพาะแดชบอร์ด แต่ไม่ได้เลือกหัวข้อข้อมูลอื่นใด */
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
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>จำกัดสิทธิ์การแสดงผลเฉพาะโมดูลที่ได้รับอนุญาต</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Middle Row: 6 Stat Cards (Left) + Upcoming Events Box (Right) */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                    {/* 6 Stat Cards: spans 2 cols on xl */}
                    <div className="xl:col-span-2">
                      {activeRole === 'EMPLOYEE' ? (
                        <EmployeeStatCards />
                      ) : (
                        <ManagerStatCards role={activeRole} />
                      )}
                    </div>

                    {/* Upcoming Events Widget: spans 1 col on xl */}
                    <div className="xl:col-span-1">
                      <UpcomingEventsWidget />
                    </div>
                  </div>

                  {/* Bottom Row: Personal Recent Transactions Table (Self Only) */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <RecentTransactionsTable />
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Widgets Stack (แสดงเฉพาะเมื่อมีสิทธิ์ในโมดูลข้อมูล) */}
            {hasDataModulePermission && (
              <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
                {activeRole === 'EMPLOYEE' ? (
                  <>
                    <div className="shrink-0">
                      <CalendarWidget />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                      <NewsWidget />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="shrink-0">
                      <NotificationsWidget role={activeRole} />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                      <AttendancePieChart role={activeRole} />
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
