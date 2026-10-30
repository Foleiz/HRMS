'use client';

import React from 'react';
import { TabBar } from '@/components/ui';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const BENEFITS_SUB_NAV_TABS = [
  {
    title: 'ยอดสวัสดิการพนักงาน',
    href: '/benefits/balances',
    permissions: ['BENEFIT_BALANCE_VIEW', 'BENEFIT_VIEW'],
  },
  {
    title: 'ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ',
    href: '/benefits/claims',
    permissions: ['BENEFIT_CLAIM_VIEW', 'BENEFIT_VIEW'],
  },
];

export const BenefitsSubNav: React.FC = () => {
  const pathname = usePathname();
  const { user, hasPermission, hasRole } = useAuth();

  const isSuper = hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('SYSTEM_SUPER');

  const visibleTabs = BENEFITS_SUB_NAV_TABS.filter((tab) => {
    if (!user) return true;
    if (isSuper) return true;
    return tab.permissions.some((p) => hasPermission(p));
  });

  const isTabActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 -mt-2 rounded-t-2xl shadow-2xs">
      <TabBar
        aria-label="เมนูสวัสดิการ"
        memoryKey="benefits-subnav"
        items={visibleTabs.map((tab) => ({ key: tab.href, label: tab.title, href: tab.href }))}
        activeKey={visibleTabs.find((tab) => isTabActive(tab.href))?.href}
      />
    </div>
  );
};
