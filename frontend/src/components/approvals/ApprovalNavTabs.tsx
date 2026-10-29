'use client';

import React from 'react';
import { TabBar } from '@/components/ui';
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
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 -mt-2 rounded-t-2xl">
      <TabBar
        aria-label="เมนูอนุมัติ"
        memoryKey="approvals-subnav"
        items={APPROVAL_TABS.map((tab) => ({ key: tab.href, label: tab.title, href: tab.href }))}
        activeKey={APPROVAL_TABS.find((tab) => pathname.startsWith(tab.href))?.href}
      />
    </div>
  );
};
