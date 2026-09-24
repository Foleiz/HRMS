'use client';

import React, { useState, useEffect } from 'react';
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

  const displayName =
    activeRole === 'EMPLOYEE'
      ? (user?.fullName || 'สมชาย')
      : (user?.fullName || 'แอดมิน');

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
          {/* Main 2-Column Responsive Layout (items-stretch ให้สูงเท่ากันพอดีกับ panel ข้างๆ) */}
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            
            {/* Left / Center Main Content (flex-1) */}
            <div className="flex-1 w-full space-y-4 flex flex-col">
              {/* Greeting Banner (ตรงกับหัวข้อปฏิทิน/แจ้งเตือนพอดี) */}
              <GreetingBanner displayName={displayName} />

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
              <div className="flex-1 flex flex-col">
                <RecentTransactionsTable />
              </div>
            </div>

            {/* Right Column: Widgets Stack (w-full lg:w-80 shrink-0) ขยายเต็มความสูงเท่ากับ panel ข้างซ้าย */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
              {activeRole === 'EMPLOYEE' ? (
                <>
                  {/* Employee: Calendar (คงที่) + News (ขยายลงมาพอดี panel ข้างๆ) */}
                  <div className="shrink-0">
                    <CalendarWidget />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <NewsWidget />
                  </div>
                </>
              ) : (
                <>
                  {/* Management: Notifications (คงที่) + Attendance Pie Chart (ขยายลงมาพอดี panel ข้างๆ) */}
                  <div className="shrink-0">
                    <NotificationsWidget role={activeRole} />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <AttendancePieChart role={activeRole} />
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
