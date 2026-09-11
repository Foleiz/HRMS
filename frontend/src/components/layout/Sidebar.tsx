'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Landmark,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
}

const menuItems: MenuItem[] = [
  {
    title: 'แดชบอร์ด',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'พนักงาน',
    href: '/employees',
    matchPrefix: '/employees',
    icon: Users,
  },
  {
    title: 'ตรวจบันทึกเวลา',
    href: '/attendance/daily',
    matchPrefix: '/attendance/daily',
    icon: Clock,
  },
  {
    title: 'การจัดตารางงาน',
    href: '/attendance/schedules',
    matchPrefix: '/attendance/schedules',
    icon: CalendarRange,
  },
  {
    title: 'ยื่นเอกสาร',
    href: '/documents',
    matchPrefix: '/documents',
    icon: FileText,
  },
  {
    title: 'การลา',
    href: '/leave',
    matchPrefix: '/leave',
    icon: CalendarCheck,
  },
  {
    title: 'เงินเดือน',
    href: '/payroll',
    matchPrefix: '/payroll',
    icon: CreditCard,
  },
  {
    title: 'การอนุมัติ',
    href: '/approvals',
    matchPrefix: '/approvals',
    icon: CheckCircle2,
  },
  {
    title: 'โครงสร้างองค์กร',
    href: '/organization',
    matchPrefix: '/organization',
    icon: Building2,
  },
  {
    title: 'วันทำงานและวันหยุด',
    href: '/work-calendar',
    matchPrefix: '/work-calendar',
    icon: CalendarDays,
  },
  {
    title: 'รายงาน',
    href: '/reports',
    matchPrefix: '/reports',
    icon: BarChart3,
  },
  {
    title: 'ตั้งค่า',
    href: '/settings',
    matchPrefix: '/settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredItems = menuItems.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const isActive = (item: MenuItem) => {
    if (item.href === '/' && pathname === '/') return true;
    if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
    return false;
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. Header: Logo & System Name */}
      <div className={`h-20 flex items-center border-b border-slate-100/80 transition-all ${isCollapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            {/* Logo Badge Icon (3 avatars in navy square) */}
            <div className="w-10 h-10 rounded-xl bg-[#0B2046] text-white flex items-center justify-center shadow-md shadow-[#0B2046]/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>

            <div className="leading-tight select-none">
              <div className="text-[15px] font-bold text-slate-900 tracking-tight">Human</div>
              <div className="text-[15px] font-bold text-[#0B2046] tracking-tight">Resource</div>
            </div>
          </Link>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          className="w-8 h-8 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Search Input */}
      {!isCollapsed && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา"
              className="w-full pl-9 pr-3 py-2 bg-[#F1F5F9] border border-slate-200/60 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] transition-all"
            />
          </div>
        </div>
      )}

      {/* 3. Navigation Menu Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {filteredItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.title : undefined}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-[#0B2046] text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
              {!isCollapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 4. Footer Mini Link (Quick Bank Reference Access) */}
      <div className="p-3 border-t border-slate-100">
        <Link
          href="/master/banks"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="ข้อมูลธนาคาร (Phase 0 Reference)"
        >
          <Landmark className="w-4 h-4 text-indigo-500 shrink-0" />
          {!isCollapsed && <span className="truncate">ข้อมูลธนาคาร (Reference)</span>}
        </Link>
      </div>
    </aside>
  );
};
