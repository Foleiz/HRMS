'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Bell,
  Moon,
  ChevronDown,
  LogOut,
  User,
  Shield,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (pathname === '/') return { section: 'หน้าหลัก', page: 'แดชบอร์ด' };
    if (pathname.startsWith('/master/banks')) return { section: 'ข้อมูลหลัก', page: 'จัดการข้อมูลธนาคาร' };
    if (pathname.startsWith('/employees')) return { section: 'พนักงาน', page: 'จัดการพนักงาน' };
    if (pathname.startsWith('/attendance')) return { section: 'การเข้างาน', page: 'ตรวจบันทึกเวลา' };
    if (pathname.startsWith('/documents')) return { section: 'ยื่นเอกสาร', page: 'รายการเอกสาร' };
    if (pathname.startsWith('/leave')) return { section: 'การลา', page: 'จัดการการลาและโควตา' };
    if (pathname.startsWith('/payroll')) return { section: 'เงินเดือน', page: 'ประมวลผลเงินเดือน' };
    if (pathname.startsWith('/approvals')) return { section: 'การอนุมัติ', page: 'รายการรออนุมัติ' };
    if (pathname.startsWith('/organization')) return { section: 'โครงสร้างองค์กร', page: 'ผังองค์กรและฝ่าย' };
    if (pathname.startsWith('/reports')) return { section: 'รายงาน', page: 'รายงานภาพรวม' };
    if (pathname.startsWith('/settings')) return { section: 'ตั้งค่า', page: 'ตั้งค่าระบบ' };
    return { section: 'พนักงาน', page: 'จัดการพนักงาน' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 z-10">
      {/* 1. Left Side: Circular Back Button & Breadcrumb */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => router.back()}
          title="ย้อนกลับ"
          className="w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#081836] text-white flex items-center justify-center transition-all shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-500 font-normal">{breadcrumb.section}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-semibold">{breadcrumb.page}</span>
        </div>
      </div>

      {/* 2. Right Side: Notifications, Dark mode toggle, and User Profile Pill */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          title="การแจ้งเตือน"
          className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          title="โหมดกลางคืน (Coming soon)"
          className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors"
        >
          <Moon className="w-4 h-4" />
        </button>

        {/* User Profile Dropdown Pill */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200/80"
            >
              {/* Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-slate-300/80 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0).toUpperCase()}
              </div>

              {/* User Name */}
              <span className="text-xs font-medium text-slate-800 max-w-[140px] truncate hidden sm:inline-block">
                {user.fullName || user.username}
              </span>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user.fullName || user.username}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">@{user.username}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B2046]/10 text-[#0B2046]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="px-1 py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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
