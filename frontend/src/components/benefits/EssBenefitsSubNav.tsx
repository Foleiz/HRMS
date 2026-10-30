'use client';

import React from 'react';
import { TabBar } from '@/components/ui';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * แถบเมนูย่อยในตัวของหมวด "สวัสดิการของฉัน (ESS)" — สลับไปมาระหว่าง "สวัสดิการของฉัน" กับ "ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ"
 * ใช้รูปแบบเดียวกับแถบ DocumentsSubNav (รายการเอกสาร / ประวัติเอกสาร)
 */
export const ESS_BENEFIT_TABS = [
  {
    title: 'สวัสดิการของฉัน',
    href: '/ess/benefits',
    permission: 'ESS_BENEFIT_VIEW',
  },
  {
    title: 'ประวัติการเบิกจ่ายและใช้สิทธิ์สวัสดิการ',
    href: '/ess/benefits/history',
    permission: 'ESS_BENEFIT_CLAIM_VIEW',
  },
];

export const EssBenefitsSubNav: React.FC = () => {
  const pathname = usePathname();
  const { user, hasPermission, hasRole } = useAuth();
  const isSuper = hasRole('ADMIN') || hasRole('SUPER_ADMIN') || hasRole('SYSTEM_SUPER');

  const visibleTabs = ESS_BENEFIT_TABS.filter((tab) => {
    if (!user || isSuper) return true;
    return hasPermission(tab.permission) || hasPermission('ESS_BENEFIT_VIEW');
  });

  const isTabActive = (href: string) => {
    if (href === '/ess/benefits/history') {
      return pathname === href || pathname.startsWith(`${href}/`) || pathname === '/ess/benefits/claims';
    }
    return pathname === '/ess/benefits';
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 -mt-2 rounded-t-2xl">
      <TabBar
        aria-label="เมนูสวัสดิการของฉัน"
        memoryKey="ess-benefits-subnav"
        items={visibleTabs.map((tab) => ({ key: tab.href, label: tab.title, href: tab.href }))}
        activeKey={visibleTabs.find((tab) => isTabActive(tab.href))?.href}
      />
    </div>
  );
};
