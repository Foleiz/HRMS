'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export const APPROVAL_TABS = [
  { title: 'เอกสารรอดำเนินการ', href: '/approvals/leave-requests' },
  { title: 'ประวัติเอกสาร', href: '/approvals/history' },
];

interface ApprovalNavTabsProps {
  currentSubTitle?: string;
}

export const ApprovalNavTabs: React.FC<ApprovalNavTabsProps> = ({ currentSubTitle }) => {
  const pathname = usePathname();
  const router = useRouter();

  // หา title สำหรับ Breadcrumb
  const activeTab = APPROVAL_TABS.find((t) => pathname.startsWith(t.href)) || APPROVAL_TABS[0];
  const pageTitle = currentSubTitle || activeTab.title;

  return (
    <div className="space-y-4">
      {/* 1. Top Breadcrumb Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-[#0B2046] text-white flex items-center justify-center hover:bg-[#0B2046]/85 transition-all shadow-xs cursor-pointer"
          title="ย้อนกลับ"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
          <Link href="/approvals/leave-requests" className="hover:text-slate-800 transition-colors">
            การอนุมัติ
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">{pageTitle}</span>
        </div>
      </div>

      {/* 2. Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-5 pt-3 shadow-xs overflow-x-auto">
        <div className="flex gap-8 text-sm font-medium whitespace-nowrap min-w-max">
          {APPROVAL_TABS.map((tab) => {
            const isTabActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pb-3 border-b-2 font-semibold transition-all cursor-pointer ${
                  isTabActive
                    ? 'border-[#0B2046] text-[#0B2046]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
