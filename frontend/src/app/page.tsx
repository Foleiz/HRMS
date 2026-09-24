'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/common/AccessDenied';

import {
  DashboardHeader,
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
  const { user, hasRole, logout } = useAuth();

  // กำหนด Default Role จากข้อมูลสิทธิ์จริงของ User
  const detectDefaultRole = (): DashboardRole => {
    if (!user) return 'ADMIN';
    const roles = user.roles || [];
    if (roles.includes('ADMIN') || roles.includes('SYSTEM_SUPER') || roles.includes('HR_ADMIN')) {
      return 'ADMIN';
    }
    if (roles.includes('CEO') || roles.includes('EXECUTIVE')) {
      return 'CEO';
    }
    if (roles.includes('DIV_MGR') || roles.includes('LINE_MANAGER')) {
      return 'DIV_MGR';
    }
    if (roles.includes('DEPT_MGR')) {
      return 'DEPT_MGR';
    }
    return 'EMPLOYEE';
  };

  const [activeRole, setActiveRole] = useState<DashboardRole>('EMPLOYEE');

  useEffect(() => {
    if (user) {
      setActiveRole(detectDefaultRole());
    }
  }, [user]);

  const hasAnyPermission = Boolean(
    (user?.permissions && user.permissions.length > 0) || hasRole('ADMIN')
  );

  if (user && !hasAnyPermission) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        {/* Dashboard Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 w-full max-w-[1500px] mx-auto">
          {/* Main 2-Column Responsive Layout matching images */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            
            {/* Left / Center Main Content (flex-1) */}
            <div className="flex-1 w-full space-y-4">
              {/* 1. Greeting Banner & Role Switcher */}
              <DashboardHeader
                user={user}
                activeRole={activeRole}
                onRoleChange={setActiveRole}
              />

              {/* 2. Middle Row: 6 Stat Cards (Left) + Upcoming Events Box (Right) */}
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

              {/* 3. Bottom Row: Personal Recent Transactions Table (Self Only) */}
              <RecentTransactionsTable />
            </div>

            {/* Right Column: Widgets Stack (w-full lg:w-80 shrink-0) */}
            <div className="w-full lg:w-80 shrink-0 space-y-4">
              {activeRole === 'EMPLOYEE' ? (
                <>
                  {/* Employee: Calendar + News */}
                  <CalendarWidget />
                  <NewsWidget />
                </>
              ) : (
                <>
                  {/* Management: Notifications + Attendance Pie Chart */}
                  <NotificationsWidget role={activeRole} />
                  <AttendancePieChart role={activeRole} />
                </>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
