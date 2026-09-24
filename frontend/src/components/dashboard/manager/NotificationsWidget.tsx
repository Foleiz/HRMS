'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardRole } from '../DashboardHeader';

interface NotificationsWidgetProps {
  role: DashboardRole;
}

interface NotificationItem {
  count: number;
  label: string;
  href: string;
}

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({ role }) => {
  // สังเกตจากรูปภาพ: หัวหน้าแผนก (DEPT_MGR) จะมีข้อความแถวแรกเป็น "เอกสารรอให้อนุมัติ"
  // ส่วน DIV_MGR, CEO, ADMIN จะเป็น "สัญญาจ้างใกล้หมดอายุ"
  const getItems = (): NotificationItem[] => {
    if (role === 'DEPT_MGR') {
      return [
        { count: 4, label: 'เอกสารรอให้อนุมัติ', href: '/approvals/leave-requests' },
        { count: 3, label: 'สิ้นสุดทดลองงานใน 7 วัน', href: '/employees/contracts' },
        { count: 8, label: 'เอกสารใกล้หมดอายุ', href: '/documents' },
      ];
    }
    return [
      { count: 5, label: 'สัญญาจ้างใกล้หมดอายุ', href: '/employees/contracts' },
      { count: 3, label: 'สิ้นสุดทดลองงานใน 7 วัน', href: '/employees/contracts' },
      { count: 8, label: 'เอกสารใกล้หมดอายุ', href: '/documents' },
    ];
  };

  const items = getItems();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header: Coral / Rose */}
      <div className="bg-[#FF8080] text-white px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide">การแจ้งเตือน</h3>
      </div>

      {/* List of Notification Rows */}
      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors group"
          >
            <span className="text-lg font-black text-slate-900 w-9 text-center group-hover:text-[#0B2046] transition-colors">
              {item.count}
            </span>
            <span className="text-xs font-medium text-slate-700 ml-2 group-hover:text-slate-900 transition-colors">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
