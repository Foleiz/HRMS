'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, ShieldCheck, LogOut, LogIn, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (roles: string[] = []) => {
    if (roles.includes('ADMIN')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-700">ADMIN</span>;
    }
    if (roles.includes('HR_MGR')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700">HR MGR</span>;
    }
    if (roles.includes('DEPT_MGR')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">DEPT MGR</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700">STAFF</span>;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Database Connected (Supabase: hrms)
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          title="การแจ้งเตือน"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user.fullName || user.username}</p>
                {getRoleBadge(user.roles)}
              </div>
              <p className="text-xs text-slate-400 mt-1">รหัส: {user.employeeCode || 'N/A'}</p>
            </div>

            <button
              onClick={logout}
              title="ออกจากระบบ"
              className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LogIn className="w-4 h-4" />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  );
};
