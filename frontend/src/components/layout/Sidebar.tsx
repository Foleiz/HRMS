'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  Clock,
  CalendarCheck,
  CreditCard,
  UserCheck,
  Landmark,
  FileSpreadsheet,
  LayoutDashboard,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      heading: 'ภาพรวมระบบ',
      items: [
        {
          title: 'Dashboard',
          href: '/',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          title: 'ข้อมูลธนาคาร (Reference)',
          href: '/master/banks',
          icon: <Landmark className="w-5 h-5 text-indigo-500" />,
          badge: 'Demo',
        },
      ],
    },
    {
      heading: '👨‍💻 Dev 1: Time & Operations',
      items: [
        {
          title: 'ผังองค์กรและฝ่าย/แผนก',
          href: '/organization',
          icon: <Building2 className="w-5 h-5 text-blue-500" />,
        },
        {
          title: 'กะและเวลาการทำงาน',
          href: '/attendance/shifts',
          icon: <Clock className="w-5 h-5 text-blue-500" />,
        },
        {
          title: 'นำเข้าเวลาเข้า-ออก (Excel)',
          href: '/attendance/import',
          icon: <FileSpreadsheet className="w-5 h-5 text-blue-500" />,
        },
      ],
    },
    {
      heading: '👩‍💻 Dev 2: Talent & Compensation',
      items: [
        {
          title: 'ทะเบียนข้อมูลพนักงาน',
          href: '/employees',
          icon: <Users className="w-5 h-5 text-emerald-500" />,
        },
        {
          title: 'ระบบการลาและโควตา',
          href: '/leave',
          icon: <CalendarCheck className="w-5 h-5 text-emerald-500" />,
        },
        {
          title: 'ประมวลผลเงินเดือน',
          href: '/payroll',
          icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
        },
      ],
    },
    {
      heading: 'พอร์ทัลพนักงาน',
      items: [
        {
          title: 'Employee Self-Service',
          href: '/ess',
          icon: <UserCheck className="w-5 h-5 text-amber-500" />,
        },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
          HR
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white">HRMS Enterprise</h1>
          <p className="text-xs text-slate-400">Next.js + .NET + Supabase</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">
              {section.heading}
            </h2>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / Workspace Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
            Dev
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">HRMS Dev Team</p>
            <p className="text-xs text-slate-400 truncate">Supabase PostgreSQL</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
