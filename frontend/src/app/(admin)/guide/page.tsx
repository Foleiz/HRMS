'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { Users, CalendarDays, ShieldCheck, Inbox } from 'lucide-react';
import { Button, TableToolbar } from '@/components/ui';

interface GuideItem {
  id: string;
  title: string;
  stepCount: number;
  icon: React.ElementType;
  route: string;
}

const GUIDE_ITEMS: GuideItem[] = [
  {
    id: 'hr-onboarding',
    title: 'เพิ่มพนักงานใหม่',
    stepCount: 3,
    icon: Users,
    route: '/employees?tour=hr-onboarding-1',
  },
  {
    id: 'leave-request',
    title: 'การยื่นคำขอลาและวันหยุด',
    stepCount: 2,
    icon: CalendarDays,
    route: '/documents/leave',
  },
  {
    id: 'roles-permissions',
    title: 'การกำหนดบทบาทและสิทธิ์การใช้งาน',
    stepCount: 3,
    icon: ShieldCheck,
    route: '/settings?tab=users&tour=hr-onboarding-3',
  },
];

function GuidePageContent() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // กรองคู่มือตามคำค้นหา
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return GUIDE_ITEMS;
    return GUIDE_ITEMS.filter((item) =>
      item.title.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 font-sans pb-12">
      <h1 className="sr-only">วิธีการใช้งาน</h1>

      {/* Main Content Card (Panel พื้นหลังครอบตามมาตรฐานเดียวกับหน้าอื่นๆ ในระบบ) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          {/* Toolbar: ช่องค้นหาจัดวางฝั่งซ้ายมาตรฐานกลางระบบ */}
          <TableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="ค้นหาคู่มือ เช่น เพิ่มพนักงาน, ลา..."
          />

          {/* รายการคู่มือ */}
          {filteredItems.length > 0 ? (
            <div className="space-y-3 pt-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 transition-all hover:bg-slate-100/60 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* ฝั่งซ้าย: ไอคอน และชื่อหัวข้อ (ไม่มีรายละเอียดย่อย) */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                    </div>

                    {/* ฝั่งขวา: จำนวนขั้นตอน และปุ่มเริ่มดูคู่มือ */}
                    <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                        {item.stepCount} ขั้นตอน
                      </span>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(item.route)}
                        className="shadow-2xs text-xs font-semibold"
                      >
                        เริ่มดูคู่มือ
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 animate-in fade-in duration-300">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-60 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                ไม่พบคู่มือที่ตรงกับคำค้นหา
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                ลองค้นหาด้วยคำอื่น เช่น &quot;พนักงาน&quot;, &quot;ลา&quot;, &quot;สิทธิ์&quot;
              </p>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  ล้างคำค้นหา
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          กำลังโหลดวิธีการใช้งาน...
        </div>
      }
    >
      <GuidePageContent />
    </Suspense>
  );
}
