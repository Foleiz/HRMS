'use client';

import React from 'react';
import { TabBar } from '@/components/ui';
import { usePathname } from 'next/navigation';

/**
 * แถบเมนูย่อยในตัวของหมวด "ยื่นเอกสาร" — สลับไปมาระหว่าง "รายการเอกสาร" กับ "ประวัติเอกสาร"
 * ใช้รูปแบบเดียวกับแถบ subNavTabs ของหน้า "พนักงาน" (จัดการพนักงาน / ประเภทพนักงาน)
 * เพื่อให้ทั้งสองหน้านี้อยู่ภายใต้เมนูหลัก "ยื่นเอกสาร" เพียงอันเดียวในแถบด้านข้าง
 * โดยไม่ต้องทำเป็นเมนูย่อยแบบขยาย/ย่อ (accordion) ในแถบด้านข้าง
 */
const DOCUMENTS_SUB_NAV_TABS = [
  { title: 'รายการเอกสาร', href: '/documents' },
  { title: 'ประวัติเอกสาร', href: '/documents/history' },
];

export const DocumentsSubNav: React.FC = () => {
  const pathname = usePathname();

  // "รายการเอกสาร" ต้อง active ค้างไว้แม้จะลึกเข้าไปในฟอร์มย่อย เช่น /documents/leave, /documents/resignation
  // (ทุกอย่างใต้ /documents ที่ไม่ใช่ /documents/history) — ไม่ใช้ exact match เพื่อไม่ให้แถบเมนูย่อยเปลี่ยนรูปแบบ
  // ไปเป็นอย่างอื่นเมื่อกดเข้าไปยื่นเอกสารแต่ละประเภท
  const isTabActive = (href: string) => {
    if (href === '/documents/history') {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith('/documents/history'));
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 -mt-2 rounded-t-2xl">
      <TabBar
        aria-label="เมนูยื่นเอกสาร"
        memoryKey="documents-subnav"
        items={DOCUMENTS_SUB_NAV_TABS.map((tab) => ({ key: tab.href, label: tab.title, href: tab.href }))}
        activeKey={DOCUMENTS_SUB_NAV_TABS.find((tab) => isTabActive(tab.href))?.href}
      />
    </div>
  );
};
