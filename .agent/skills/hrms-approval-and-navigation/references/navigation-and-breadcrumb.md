# Reference: Standardized Navigation Tabs & Breadcrumb Implementation Guide

คู่มือแนวทางและตัวอย่างโค้ด (Code Templates) สำหรับการสร้างหน้าจอและเมนูย่อยตามมาตรฐาน HRMS

---

## 1. แม่แบบโค้ดแถบเมนูย่อย (Sub-Navigation Tabs Template)

เมื่อสร้างหรือปรับปรุงหน้าจอที่มีเมนูย่อย (Sub-Tabs) ให้ใช้โครงสร้างนี้เสมอ:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

type TabKey = 'tab1' | 'tab2' | 'tab3';

interface TabDefinition {
  key: TabKey;
  label: string;
}

const SUB_TABS: TabDefinition[] = [
  { key: 'tab1', label: 'แท็บที่หนึ่ง' },
  { key: 'tab2', label: 'แท็บที่สอง' },
  { key: 'tab3', label: 'แท็บที่สาม' },
];

export default function MyModulePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('tab1');
  const { setBreadcrumb } = useBreadcrumb();

  // ซิงโครไนซ์ Breadcrumb ตามแท็บที่กำลังเปิด
  useEffect(() => {
    const currentTab = SUB_TABS.find((t) => t.key === activeTab);
    setBreadcrumb({
      section: 'ชื่อเมนูหลัก',
      page: currentTab?.label || 'แท็บที่หนึ่ง',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  return (
    <div className="space-y-6 pb-12">
      {/* แถบเมนูย่อยมาตรฐาน (ตรงตามมาตรฐานเมนูพนักงาน) */}
      <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
          {SUB_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                  isActive
                    ? 'border-[#0B2046] text-[#0B2046] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* เนื้อหาในแท็บ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {activeTab === 'tab1' && <div>เนื้อหาแท็บ 1</div>}
        {activeTab === 'tab2' && <div>เนื้อหาแท็บ 2</div>}
        {activeTab === 'tab3' && <div>เนื้อหาแท็บ 3</div>}
      </div>
    </div>
  );
}
```

---

## 2. แถบเมนูย่อยแบบแยกลิงก์หลายหน้า (Multi-Page Link Navigation)

สำหรับกรณีที่เมนูย่อยแยก URL เส้นทางออกจากกัน (เช่น เมนูยื่นเอกสาร `DocumentsSubNav` หรือ เมนูพนักงาน):

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkTab {
  title: string;
  href: string;
}

const TABS: NavLinkTab[] = [
  { title: 'หน้ารายการ', href: '/my-module' },
  { title: 'หน้าประวัติ', href: '/my-module/history' },
];

export const MyModuleSubNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white px-4 -mt-2 rounded-t-2xl">
      <nav className="flex space-x-6 overflow-x-auto no-scrollbar py-2 text-[13px] font-medium">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-2 whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                isActive
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
```

---

## 3. สิ่งที่ห้ามทำ (Do Not Do)
- ❌ **ห้ามใส่ไอคอน SVGs หน้าข้อความแท็บ:** ทำให้เลย์เอาต์ดูรก ไม่เข้ากับสไตล์ Minimalist ที่ตั้งไว้
- ❌ **ห้ามสร้างปุ่ม Back หรือ Breadcrumb ย่อยซ้ำซ้อนในตัวเนื้อหาเพจ:** ให้ใช้ปุ่ม Back และ Breadcrumb ของ `Navbar.tsx` ด้านบนเท่านั้น
- ❌ **ห้ามลืมใส่ `return () => setBreadcrumb(null);` ใน `useEffect`:** เพื่อสุขอนามัยที่ดีในการคืนหน่วยความจำเมื่อ Component ถูก Unmount
