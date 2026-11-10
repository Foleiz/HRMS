'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  Search,
  Users,
  CalendarDays,
  ShieldCheck,
  X,
  BookOpen,
} from 'lucide-react';

interface GuideItem {
  id: string;
  title: string;
  description: string;
  stepCount: number;
  duration: string;
  icon: React.ElementType;
  route: string;
}

const GUIDE_ITEMS: GuideItem[] = [
  {
    id: 'hr-onboarding',
    title: 'เพิ่มพนักงานใหม่',
    description: 'บันทึกประวัติพนักงานใหม่ จัดทำสัญญาจ้าง และกำหนดสิทธิ์ผู้ใช้งาน',
    stepCount: 3,
    duration: 'ประมาณ 2 นาที',
    icon: Users,
    route: '/employees?tour=hr-onboarding-1',
  },
  {
    id: 'leave-request',
    title: 'การยื่นคำขอลาและวันหยุด',
    description: 'เลือกประเภทการลา ตรวจสอบสิทธิ์คงเหลือ และส่งคำขอให้อนุมัติ',
    stepCount: 2,
    duration: 'ประมาณ 1 นาที',
    icon: CalendarDays,
    route: '/documents/leave',
  },
  {
    id: 'roles-permissions',
    title: 'การกำหนดบทบาทและสิทธิ์การใช้งาน',
    description: 'สร้างผู้ใช้งาน กำหนดบทบาท และจัดการสิทธิ์การเข้าถึงเมนูต่างๆ',
    stepCount: 3,
    duration: 'ประมาณ 2 นาที',
    icon: ShieldCheck,
    route: '/settings?tab=users&tour=hr-onboarding-3',
  },
];

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewedGuides, setViewedGuides] = useState<Record<string, boolean>>({});

  const completedParam = searchParams?.get('completed');

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // โหลดประวัติการดูจาก localStorage
    const saved = localStorage.getItem('hrms_guide_viewed_items');
    let map: Record<string, boolean> = {};
    if (saved) {
      try {
        map = JSON.parse(saved);
      } catch {}
    }

    if (completedParam === 'hr-onboarding') {
      map['hr-onboarding'] = true;
      localStorage.setItem('hrms_guide_hr_onboarding_completed', 'true');
      localStorage.setItem('hrms_guide_viewed_items', JSON.stringify(map));
    } else {
      const isDone = localStorage.getItem('hrms_guide_hr_onboarding_completed') === 'true';
      if (isDone) {
        map['hr-onboarding'] = true;
      }
    }

    setViewedGuides(map);
  }, [completedParam]);

  const handleStartGuide = (item: GuideItem) => {
    const updated = { ...viewedGuides, [item.id]: true };
    setViewedGuides(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrms_guide_viewed_items', JSON.stringify(updated));
    }
    router.push(item.route);
  };

  // กรองคู่มือตามคำค้นหา
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return GUIDE_ITEMS;
    return GUIDE_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. Header Section: Title & Search Bar
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            วิธีการใช้งาน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            คู่มือแนะนำการใช้งานระบบแบบทีละขั้นตอน เลือกหัวข้อที่ต้องการเพื่อเริ่มดู
          </p>
        </div>

        {/* ช่องค้นหาคู่มือ */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาคู่มือ เช่น เพิ่มพนักงาน, ลา"
            className="w-full sm:w-80 pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. Unified Guide Cards List (รวมรายการทั้งหมดเป็นลิสต์เดียว)
      ───────────────────────────────────────────────────────────── */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isViewed = Boolean(viewedGuides[item.id]);
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* ฝั่งซ้าย: ไอคอน, ชื่อหัวข้อ และคำอธิบาย */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* ฝั่งขวา: จำนวนขั้นตอน, เวลา, ป้ายสถานะ และปุ่มดำเนินการ */}
                <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center shrink-0">
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                    {item.stepCount} ขั้นตอน · {item.duration}
                  </span>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      isViewed
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isViewed ? 'ดูแล้ว' : 'ยังไม่ได้ดู'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStartGuide(item)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap ${
                      isViewed
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isViewed ? 'ดูคู่มืออีกครั้ง' : 'เริ่มดูคู่มือ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-xs">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            ไม่พบคู่มือที่ตรงกับคำค้นหา
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            ลองค้นหาด้วยคำอื่น เช่น &ldquo;พนักงาน&rdquo;, &ldquo;ลา&rdquo;, &ldquo;สิทธิ์&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ล้างคำค้นหา
          </button>
        </div>
      )}
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
