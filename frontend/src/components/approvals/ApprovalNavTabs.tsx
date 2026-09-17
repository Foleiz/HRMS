'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const APPROVAL_TABS = [
  { title: 'เอกสารรอดำเนินการ', href: '/approvals/leave-requests' },
  { title: 'ประวัติเอกสาร', href: '/approvals/history' },
];

interface ApprovalNavTabsProps {
  currentSubTitle?: string;
}

export const ApprovalNavTabs: React.FC<ApprovalNavTabsProps> = () => {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
      <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
        {APPROVAL_TABS.map((tab) => {
          const isTabActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium ${
                isTabActive
                  ? 'border-[#0B2046] text-[#0B2046] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
