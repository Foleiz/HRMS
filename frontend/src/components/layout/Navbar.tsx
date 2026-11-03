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
  ChevronRight,
  LogOut,
  User,
  Shield,
  LogIn,
  History,
  Menu,
  Lock,
  Globe,
  Rocket,
  BookOpen,
  Briefcase,
  Clock,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { essAttendanceService } from '@/services/essAttendanceService';
import { employeeShiftService } from '@/services/scheduleService';
import { EmployeeShift } from '@/types/schedule';
import { organizationService } from '@/services/organizationService';
import { Employee } from '@/types/employee';
import { AttendanceDaily } from '@/types/attendance';
import { hrmsSwal } from '@/lib/sweetalert';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useSidebar } from '@/context/SidebarContext';
import { useAnimatedMount } from '@/hooks/useAnimatedMount';
import { NotificationBell } from './NotificationBell';
import { formatRoleName } from '@/lib/roleUtils';
import { getAvatarUrl } from '@/lib/api-client';

/** อีเวนต์แจ้งว่ารูปโปรไฟล์เปลี่ยน (ส่งจากหน้าข้อมูลพนักงานหลังอัปโหลด) */
export const AVATAR_UPDATED_EVENT = 'hrms:avatar-updated';

function formatTimeFromApi(dateOrTimeStr?: string | null): string {
  if (!dateOrTimeStr) return '';
  const trimmed = String(dateOrTimeStr).trim();

  // If it matches HH:mm (and not starting with a 4-digit year like 2026)
  if (/^\d{1,2}:\d{2}/.test(trimmed) && !trimmed.includes('T') && !trimmed.startsWith('20')) {
    const m = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  }

  // Parse ISO date
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  return '';
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { breadcrumb: customBreadcrumb } = useBreadcrumb();
  const { openMobileSidebar } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { shouldRender: shouldRenderProfile, isActive: isProfileActive } = useAnimatedMount(dropdownOpen, 150);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Profile data for dropdown card
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceDaily | null>(null);
  const [assignedShift, setAssignedShift] = useState<EmployeeShift | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        if (user?.employeeId) {
          const emp = await employeeService.getById(user.employeeId);
          if (!cancelled) setEmployee(emp);
          try {
            const att = await essAttendanceService.getMyToday();
            if (!cancelled) setTodayAttendance(att);
          } catch {
            // ignore
          }
          try {
            const shifts = await employeeShiftService.getAssignmentsByEmployee(user.employeeId);
            if (!cancelled && shifts && shifts.length > 0) {
              const active = shifts.find((s) => s.isActive) || shifts[0];
              if (active) setAssignedShift(active);
            }
          } catch {
            // ignore
          }
        }
        const comp = await organizationService.getCompany();
        if (!cancelled && comp?.companyName) {
          setCompanyName(comp.companyName);
        }
      } catch {
        // ignore
      }
    };
    if (user) {
      loadData();
    }
    return () => {
      cancelled = true;
    };
  }, [user?.employeeId]);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const code = user?.employeeCode || employee?.employeeCode || 'AC9vtp';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLanguageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hrmsSwal.fire({
      title: 'ภาษาของระบบ',
      text: 'ปัจจุบันระบบรองรับภาษาไทยเป็นภาษามาตรฐาน (TH)',
      icon: 'info',
      confirmButtonText: 'ตกลง',
    });
  };

  const handleGettingStarted = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    hrmsSwal.fire({
      title: 'วิธีเริ่มต้นใช้งาน',
      text: 'ยินดีต้อนรับสู่ระบบ HRMS คุณสามารถจัดการข้อมูลพนักงาน ตรวจเวลาทำงาน และสวัสดิการได้จากเมนูด้านซ้าย',
      icon: 'info',
      confirmButtonText: 'เข้าใจแล้ว',
    });
  };

  const handleUserManual = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    hrmsSwal.fire({
      title: 'คู่มือการใช้งาน',
      text: 'คู่มือการใช้งานระบบฉบับสมบูรณ์กำลังเตรียมเปิดให้ดาวน์โหลดเร็วๆ นี้',
      icon: 'info',
      confirmButtonText: 'ตกลง',
    });
  };

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  // รูปโปรไฟล์จริงของผู้ใช้ (โหลดใหม่เมื่อมีการเปลี่ยนรูป) — ถ้าไม่มีรูปจะแสดงอักษรย่อ
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const id = (e as CustomEvent<{ employeeId?: number }>).detail?.employeeId;
      if (!id || id === user?.employeeId) {
        setAvatarFailed(false);
        setAvatarVersion(Date.now());
      }
    };
    window.addEventListener(AVATAR_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, onUpdated);
  }, [user?.employeeId]);
  const navAvatarSrc =
    user?.employeeId && !avatarFailed ? getAvatarUrl(`/api/employees/${user.employeeId}/avatar?v=${avatarVersion}`) : null;
  const navInitial = (() => {
    const name = (user?.fullName || user?.username || '').trim().replace(/^(นางสาว|นาย|นาง|น\.ส\.)\s*/, '');
    return (name.charAt(0) || '?').toUpperCase();
  })();

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
    if (pathname.startsWith('/ess/benefits/history')) return { section: 'สวัสดิการของฉัน', page: 'ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ' };
    if (pathname.startsWith('/ess/benefits')) return { section: 'สวัสดิการของฉัน', page: 'สวัสดิการของฉัน' };

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

  const displayWorkHours = (() => {
    // 1. Check shiftTimeWindow e.g. "08:30 - 17:30 น."
    if (todayAttendance?.shiftTimeWindow) {
      const match = todayAttendance.shiftTimeWindow.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if (match) {
        return `${match[1]} - ${match[2]}`;
      }
    }

    // 2. Check scheduledStart and scheduledEnd from todayAttendance
    if (todayAttendance?.scheduledStart && todayAttendance?.scheduledEnd) {
      const start = formatTimeFromApi(todayAttendance.scheduledStart);
      const end = formatTimeFromApi(todayAttendance.scheduledEnd);
      if (start && end) {
        return `${start} - ${end}`;
      }
    }

    // 3. Check assignedShift
    if (assignedShift?.startTime && assignedShift?.endTime) {
      const start = formatTimeFromApi(assignedShift.startTime);
      const end = formatTimeFromApi(assignedShift.endTime);
      if (start && end) {
        return `${start} - ${end}`;
      }
    }

    // 4. Default standard work hours
    return '08:30 - 17:30';
  })();

  const displayShiftCode =
    todayAttendance?.shiftCode ||
    assignedShift?.shiftCode ||
    todayAttendance?.shiftName ||
    assignedShift?.shiftName ||
    'SHIFT101';

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between px-3 sm:px-6 shrink-0 relative z-30 transition-colors duration-200">
      {/* 1. Left Side: Hamburger (mobile) + Back Button + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Hamburger Menu Button — visible only on mobile (< lg) */}
        <button
          onClick={openMobileSidebar}
          title="เปิดเมนู"
          className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all shadow-sm active:scale-95 lg:hidden"
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
          className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-white hidden sm:flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
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
              {navAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={navAvatarSrc}
                  src={navAvatarSrc}
                  alt={user.fullName || user.username}
                  onError={() => setAvatarFailed(true)}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-300/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                  {navInitial}
                </div>
              )}

              {/* User Name */}
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate hidden sm:inline-block">
                {user.fullName || user.username}
              </span>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {/* Dropdown Menu (Clean Card Design ตามรูปเรฟ) */}
            {shouldRenderProfile && (
              <div
                className={`absolute right-0 mt-2.5 w-[320px] sm:w-[340px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl z-50 origin-top-right transition-all duration-150 ease-out font-sans overflow-hidden ${
                  isProfileActive
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                }`}
              >
                {/* Top Pointer Arrow */}
                <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200/90 dark:border-slate-800 rotate-45 z-10" />

                <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-5 relative z-20 space-y-4">
                  {/* 1. Top Section: Employee Code Badge & Centered Avatar */}
                  <div className="relative pt-1">
                    {/* Employee Code Badge Top-Left */}
                    <div className="absolute -top-1 left-0">
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-primary text-white tracking-wider shadow-2xs">
                        {user.employeeCode || employee?.employeeCode || 'EMP0001'}
                      </span>
                    </div>

                    {/* Avatar Centered */}
                    <div className="flex justify-center">
                      <div className="relative">
                        {navAvatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={navAvatarSrc}
                            src={navAvatarSrc}
                            alt={user.fullName || user.username}
                            onError={() => setAvatarFailed(true)}
                            className="w-18 h-18 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm"
                          />
                        ) : (
                          <div className="w-18 h-18 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xl font-bold shadow-sm">
                            {navInitial}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name & Role Badge */}
                    <div className="text-center mt-2.5 space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {user.fullName || user.username}
                      </h3>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {user.roleNames?.[0] || (user.roles?.[0] ? formatRoleName(user.roles[0]) : 'ผู้ดูแลระบบ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* 2. Information Section with Icon Boxes (สไตล์การ์ดข้อมูลรูปเรฟ) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ข้อมูลตำแหน่ง &amp; สังกัด
                    </h4>

                    {/* 2.1 ตำแหน่ง & แผนก & ฝ่าย & บริษัท */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 mt-0.5 shadow-2xs">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">ตำแหน่งงาน</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {employee?.positionName || (user.roles.includes('ADMIN') ? 'หัวหน้าทีมพัฒนาซอฟต์แวร์' : 'พนักงานประจำ')}
                        </p>
                        {employee?.departmentName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            แผนก: {employee.departmentName}
                          </p>
                        )}
                        {employee?.divisionName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            ฝ่าย: {employee.divisionName}
                          </p>
                        )}
                        {companyName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {companyName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2.2 เวลาทำงาน (เอารหัสกะออก ตามที่ผู้ใช้แจ้ง) */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 mt-0.5 shadow-2xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">เวลาทำงาน</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {displayWorkHours} น.
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          พักเบรก: 12:00 - 13:00 น.
                        </p>
                      </div>
                    </div>

                    {/* 2.3 อีเมล */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 mt-0.5 shadow-2xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">อีเมลองค์กร</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-all mt-0.5">
                          {employee?.contact?.organizationEmail || employee?.contact?.personalEmail || `${user.username}@hrms.internal`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* 3. Action Menu */}
                  <div className="space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>โปรไฟล์ของฉัน</span>
                    </Link>

                    <Link
                      href="/profile?tab=user"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>เปลี่ยนรหัสผ่าน</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLanguageClick}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>ภาษาไทย</span>
                      </div>
                      <span className="text-xs text-slate-400">🇹🇭 ›</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUserManual}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                    >
                      <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>คู่มือการใช้งาน</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* 4. Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer select-none"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            )}          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  );
};
