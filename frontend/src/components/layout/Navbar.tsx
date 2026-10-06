'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ChevronLeft,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  Shield,
  LogIn,
  History,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useSidebar } from '@/context/SidebarContext';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { breadcrumb: customBreadcrumb } = useBreadcrumb();
  const { openMobileSidebar } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic Breadcrumb based on route
  const getBreadcrumb = () => {
    if (customBreadcrumb) return customBreadcrumb;

    // 1. หน้าหลัก (Dashboard)
    if (pathname === '/') return { section: 'หน้าหลัก', page: 'แดชบอร์ด' };

    // 2. ข้อมูลหลัก (Master Data)
    if (pathname.startsWith('/master/banks')) return { section: 'ข้อมูลหลัก', page: 'จัดการข้อมูลธนาคาร' };

    // 3. พนักงาน (Employees) - เรียงลำดับ sub-routes ก่อน
    if (pathname.match(/^\/employees\/\d+\/edit/)) return { section: 'พนักงาน', page: 'แก้ไขข้อมูลพนักงาน' };
    if (pathname.match(/^\/employees\/\d+/)) return { section: 'พนักงาน', page: 'ดูข้อมูลพนักงาน' };
    if (pathname.startsWith('/employees/types')) return { section: 'พนักงาน', page: 'ประเภทพนักงาน' };
    if (pathname.startsWith('/employees/contracts')) return { section: 'พนักงาน', page: 'สัญญาจ้าง' };
    if (pathname.startsWith('/employees/transfers')) return { section: 'พนักงาน', page: 'การโอนย้ายพนักงาน' };
    if (pathname.startsWith('/employees/documents')) return { section: 'พนักงาน', page: 'เอกสารใกล้หมดอายุ' };
    if (pathname.startsWith('/employees')) return { section: 'พนักงาน', page: 'จัดการพนักงาน' };

    // โปรไฟล์ (Profile / ESS)
    if (pathname.startsWith('/profile')) return { section: 'โปรไฟล์', page: 'แก้ไขโปรไฟล์' };

    // ยอดวันลาคงเหลือ (ESS)
    if (pathname.startsWith('/team-leave-calendar')) return { section: 'การลา', page: 'ปฏิทินการลาของทีม' };
    if (pathname.startsWith('/leave-balances')) return { section: 'ยอดวันลาคงเหลือ', page: 'ภาพรวมยอดวันลา' };

    // เงินเดือนของฉัน (ESS)
    if (pathname.startsWith('/my-salary')) return { section: 'เงินเดือนของฉัน', page: 'ภาพรวมเงินเดือน' };

    // 4. บันทึกเวลาของฉัน (ESS)
    if (pathname.startsWith('/ess/attendance')) return { section: 'บันทึกเวลาของฉัน (ESS)', page: 'ตรวจบันทึกเวลาของฉัน' };

    // สวัสดิการของฉัน (ESS)
    if (pathname.startsWith('/ess/benefits')) return { section: 'สวัสดิการของฉัน', page: 'ภาพรวมโควตาและการใช้สิทธิ์' };

    // 5. ยื่นเอกสาร (Documents)
    if (pathname.startsWith('/documents/history')) return { section: 'ยื่นเอกสาร', page: 'ประวัติเอกสาร' };
    if (pathname.startsWith('/documents/leave')) return { section: 'ยื่นเอกสาร', page: 'ยื่นคำขอลา' };
    if (pathname.startsWith('/documents')) return { section: 'ยื่นเอกสาร', page: 'รายการเอกสาร' };

    // 6. ตรวจบันทึกเวลา & การจัดตารางงาน (Attendance)
    if (pathname.startsWith('/attendance/daily')) return { section: 'ตรวจบันทึกเวลา', page: 'ตรวจบันทึกเวลาประจำวัน' };
    if (pathname.startsWith('/attendance/schedules')) return { section: 'การจัดตารางงาน', page: 'มอบหมายกะให้พนักงาน' };
    if (pathname.startsWith('/attendance/shifts')) return { section: 'การจัดตารางงาน', page: 'กะการทำงาน' };
    if (pathname.startsWith('/attendance/import')) return { section: 'ตรวจบันทึกเวลา', page: 'นำเข้าไฟล์บันทึกเวลา' };
    if (pathname.startsWith('/attendance')) return { section: 'ตรวจบันทึกเวลา', page: 'ตรวจบันทึกเวลาประจำวัน' };

    // 7. การลา (Leave)
    if (pathname.startsWith('/leave')) return { section: 'การลา', page: 'ประเภทการลา' };

    // 8. เงินเดือน (Payroll)
    if (pathname.startsWith('/payroll')) return { section: 'เงินเดือน', page: 'ภาพรวม' };

    // 9. การอนุมัติ (Approvals)
    if (pathname.startsWith('/approvals/leave-requests')) return { section: 'การอนุมัติ', page: 'เอกสารรอดำเนินการ' };
    if (pathname.startsWith('/approvals/history')) return { section: 'การอนุมัติ', page: 'ประวัติเอกสาร' };
    if (pathname.startsWith('/approvals')) return { section: 'การอนุมัติ', page: 'เอกสารรอดำเนินการ' };

    // 10. โครงสร้างองค์กร (Organization)
    if (pathname.startsWith('/organization')) return { section: 'โครงสร้างองค์กร', page: 'จัดการฝ่าย' };

    // 11. วันทำงานและวันหยุด (Work Calendar)
    if (pathname.startsWith('/work-calendar')) return { section: 'วันทำงานและวันหยุด', page: 'วันทำงานประจำสัปดาห์' };

    // 12. รายงานและสถิติ (Reports)
    if (pathname.startsWith('/reports')) return { section: 'รายงาน', page: 'อัตรากำลังคนประจำวัน' };

    // 13. ตั้งค่าระบบ (Settings)
    if (pathname.startsWith('/settings')) return { section: 'ตั้งค่า', page: 'ผู้ใช้งาน' };

    return { section: 'หน้าหลัก', page: 'แดชบอร์ด' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 transition-colors duration-200">
      {/* 1. Left Side: Hamburger (mobile) + Back Button + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Hamburger Menu Button — visible only on mobile (< lg) */}
        <button
          onClick={openMobileSidebar}
          title="เปิดเมนู"
          className="w-9 h-9 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white flex items-center justify-center transition-all shadow-sm active:scale-95 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Back Button — hidden on mobile to save space */}
        <button
          onClick={() => {
            const editMatch = pathname.match(/^\/employees\/(\d+)\/edit/);
            if (editMatch) {
              router.push(`/employees/${editMatch[1]}`);
            } else if (pathname.match(/^\/employees\/\d+/)) {
              router.push('/employees');
            } else {
              router.back();
            }
          }}
          title="ย้อนกลับ"
          className="w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#081836] text-white hidden sm:flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Breadcrumb: Mobile shows page only, Desktop shows section / page */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">{breadcrumb.section}</span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">{breadcrumb.page}</span>
        </div>
      </div>

      {/* 2. Right Side: Notifications, Dark mode toggle, and User Profile Pill */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Hub */}
        <NotificationBell />

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setTheme(mounted && theme === 'dark' ? 'light' : 'dark')}
          title={mounted ? (theme === 'dark' ? 'สลับเป็นโหมดกลางวัน' : 'สลับเป็นโหมดกลางคืน') : 'สลับโหมดการแสดงผล'}
          aria-label={mounted ? (theme === 'dark' ? 'สลับเป็นโหมดกลางวัน' : 'สลับเป็นโหมดกลางคืน') : 'สลับโหมดการแสดงผล'}
          className="w-9 h-9 rounded-full bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* User Profile Dropdown Pill */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80 cursor-pointer"
            >
              {/* Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0).toUpperCase()}
              </div>

              {/* User Name */}
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate hidden sm:inline-block">
                {user.fullName || user.username}
              </span>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-slate-900/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user.fullName || user.username}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">@{user.username}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B2046]/10 dark:bg-blue-500/20 text-[#0B2046] dark:text-blue-300"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="px-1 py-1">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    โปรไฟล์ของฉัน
                  </Link>

                  <Link
                    href="/profile?tab=history"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    ประวัติการเปลี่ยนแปลง
                  </Link>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors mt-0.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  );
};
