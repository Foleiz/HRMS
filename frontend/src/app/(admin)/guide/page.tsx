'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  Search,
  Flag,
  Users,
  CalendarDays,
  ShieldCheck,
  Check,
  X,
  BookOpen,
} from 'lucide-react';

interface GuideItem {
  id: string;
  category: 'ONBOARDING' | 'EMPLOYEE' | 'LEAVE' | 'SETTINGS';
  categoryLabel: string;
  title: string;
  description: string;
  stepCount: number;
  duration: string;
  icon: React.ElementType;
  route: string;
  defaultViewed?: boolean;
}

const CATEGORIES = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'ONBOARDING', label: 'เริ่มต้นใช้งาน' },
  { key: 'EMPLOYEE', label: 'พนักงาน' },
  { key: 'LEAVE', label: 'การลา' },
  { key: 'SETTINGS', label: 'ผู้ใช้งานและสิทธิ์' },
] as const;

const GUIDE_ITEMS: GuideItem[] = [
  {
    id: 'system-overview',
    category: 'ONBOARDING',
    categoryLabel: 'เริ่มต้นใช้งาน',
    title: 'เริ่มต้นใช้งานระบบ',
    description: 'ทำความรู้จักเมนูหลักและการตั้งค่าเริ่มต้นของบริษัท',
    stepCount: 4,
    duration: 'ประมาณ 3 นาที',
    icon: Flag,
    route: '/employees?tour=hr-onboarding-1',
    defaultViewed: true,
  },
  {
    id: 'manage-employees',
    category: 'EMPLOYEE',
    categoryLabel: 'พนักงาน',
    title: 'จัดการพนักงาน',
    description: 'เพิ่ม แก้ไข และค้นหาข้อมูลพนักงาน',
    stepCount: 3,
    duration: 'ประมาณ 2 นาที',
    icon: Users,
    route: '/employees?tour=hr-onboarding-1',
    defaultViewed: false,
  },
  {
    id: 'leave-request',
    category: 'LEAVE',
    categoryLabel: 'การลา',
    title: 'การยื่นคำขอลาและวันหยุด',
    description: 'เลือกประเภทการลา ตรวจสอบสิทธิ์คงเหลือ และส่งคำขอให้อนุมัติ',
    stepCount: 2,
    duration: 'ประมาณ 1 นาที',
    icon: CalendarDays,
    route: '/documents/leave',
    defaultViewed: false,
  },
  {
    id: 'roles-permissions',
    category: 'SETTINGS',
    categoryLabel: 'ผู้ใช้งานและสิทธิ์',
    title: 'การกำหนดบทบาทและสิทธิ์การใช้งาน',
    description: 'สร้างผู้ใช้งาน กำหนดบทบาท และจัดการสิทธิ์การเข้าถึงเมนูต่างๆ',
    stepCount: 3,
    duration: 'ประมาณ 2 นาที',
    icon: ShieldCheck,
    route: '/settings?tab=users&tour=hr-onboarding-3',
    defaultViewed: false,
  },
];

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewedGuides, setViewedGuides] = useState<Record<string, boolean>>({
    'system-overview': true,
  });

  // ตรวจสอบสถานะการทำ Flow Onboarding
  const completedParam = searchParams?.get('completed');
  const [isCompletedFlow, setIsCompletedFlow] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(2); // Default ที่ขั้น 2 ตามตัวอย่างในภาพ

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // โหลดสถานะการดูจาก localStorage
    const savedViewed = localStorage.getItem('hrms_guide_viewed_items');
    if (savedViewed) {
      try {
        setViewedGuides(JSON.parse(savedViewed));
      } catch {}
    }

    if (completedParam === 'hr-onboarding') {
      setIsCompletedFlow(true);
      setCurrentStep(3);
      localStorage.setItem('hrms_guide_hr_onboarding_completed', 'true');
    } else {
      const isDone = localStorage.getItem('hrms_guide_hr_onboarding_completed') === 'true';
      if (isDone) {
        setIsCompletedFlow(true);
        setCurrentStep(3);
      }
    }
  }, [completedParam]);

  const handleStartGuide = (item: GuideItem) => {
    // บันทึกสถานะว่าดูแล้ว
    const updated = { ...viewedGuides, [item.id]: true };
    setViewedGuides(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrms_guide_viewed_items', JSON.stringify(updated));
    }
    router.push(item.route);
  };

  const handleHeroAction = () => {
    if (isCompletedFlow) {
      router.push('/employees?tour=hr-onboarding-1');
      return;
    }
    if (currentStep === 1) {
      router.push('/employees?tour=hr-onboarding-1');
    } else if (currentStep === 2) {
      router.push('/employees/contracts?tour=hr-onboarding-2');
    } else {
      router.push('/settings?tab=users&tour=hr-onboarding-3');
    }
  };

  // กรองและจัดกลุ่มคู่มือตามหมวดหมู่และการค้นหา
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GUIDE_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === 'ALL' || item.category === activeCategory;
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // จัดกลุ่มตาม Category เพื่อแสดง Header หมวดหมู่
  const groupedGuides = useMemo(() => {
    const map = new Map<string, { label: string; items: GuideItem[] }>();

    filteredItems.forEach((item) => {
      if (!map.has(item.category)) {
        map.set(item.category, {
          label: item.categoryLabel,
          items: [],
        });
      }
      map.get(item.category)!.items.push(item);
    });

    return Array.from(map.entries()).map(([cat, val]) => ({
      category: cat,
      categoryLabel: val.label,
      items: val.items,
    }));
  }, [filteredItems]);

  const heroButtonText = useMemo(() => {
    if (isCompletedFlow) return 'ดูคู่มืออีกครั้ง';
    if (currentStep === 1) return 'เริ่มขั้นตอนที่ 1';
    if (currentStep === 2) return 'ทำต่อจากขั้นที่ 2';
    return 'ทำต่อจากขั้นที่ 3';
  }, [isCompletedFlow, currentStep]);

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
            คู่มือแบบทีละขั้นตอนสำหรับทุกฟีเจอร์ของระบบ เลือกหัวข้อที่ต้องการเพื่อเริ่มดู
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
          2. Category Filter Pills
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Featured Hero Banner ("รับพนักงานใหม่ครบวงจร")
      ───────────────────────────────────────────────────────────── */}
      {(!searchQuery || 'รับพนักงานใหม่ครบวงจร'.includes(searchQuery)) && (
        <div className="bg-[#0b172a] dark:bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* ฝั่งซ้าย: ข้อมูลหัวข้อและ Steps */}
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <span>แนะนำ · ทำต่อจากที่ค้างไว้</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                รับพนักงานใหม่ครบวงจร
              </h2>

              {/* 3 Step Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {/* ขั้นที่ 1: เพิ่มพนักงาน */}
                <button
                  type="button"
                  onClick={() => router.push('/employees?tour=hr-onboarding-1')}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span>เพิ่มพนักงาน</span>
                </button>

                {/* ขั้นที่ 2: เพิ่มสัญญาจ้าง */}
                <button
                  type="button"
                  onClick={() => router.push('/employees/contracts?tour=hr-onboarding-2')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 border transition-colors cursor-pointer ${
                    currentStep === 2 && !isCompletedFlow
                      ? 'bg-slate-800/90 border-slate-500 text-white font-semibold'
                      : isCompletedFlow
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">
                    {isCompletedFlow ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '2'}
                  </span>
                  <span>เพิ่มสัญญาจ้าง</span>
                </button>

                {/* ขั้นที่ 3: เพิ่มผู้ใช้งาน */}
                <button
                  type="button"
                  onClick={() => router.push('/settings?tab=users&tour=hr-onboarding-3')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 border transition-colors cursor-pointer ${
                    currentStep === 3 && !isCompletedFlow
                      ? 'bg-slate-800/90 border-slate-500 text-white font-semibold'
                      : isCompletedFlow
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">
                    {isCompletedFlow ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '3'}
                  </span>
                  <span>เพิ่มผู้ใช้งาน</span>
                </button>
              </div>
            </div>

            {/* ฝั่งขวา: Progress bar & ปุ่มทำต่อ */}
            <div className="flex flex-col items-start lg:items-end justify-center gap-3 shrink-0">
              <div className="w-full sm:w-64">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
                  <span>
                    {isCompletedFlow
                      ? 'เสร็จแล้ว 3 จาก 3 ขั้นตอน'
                      : `เสร็จแล้ว ${currentStep - 1} จาก 3 ขั้นตอน`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{
                      width: isCompletedFlow
                        ? '100%'
                        : `${Math.round(((currentStep - 1) / 3) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleHeroAction}
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {heroButtonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. Grouped Guide Cards List
      ───────────────────────────────────────────────────────────── */}
      {groupedGuides.length > 0 ? (
        <div className="space-y-6">
          {groupedGuides.map((group) => (
            <div key={group.category} className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                {group.categoryLabel}
              </h3>

              <div className="space-y-3">
                {group.items.map((item) => {
                  const isViewed = Boolean(viewedGuides[item.id] || item.defaultViewed);
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: Icon & Title/Description */}
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

                      {/* Right: Step count, Badge & Button */}
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
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-xs">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            ไม่พบคู่มือที่ตรงกับคำค้นหา
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            ลองค้นหาด้วยคำอื่น เช่น &ldquo;พนักงาน&rdquo;, &ldquo;ลา&rdquo;, &ldquo;สัญญา&rdquo; หรือเลือกหมวดหมู่ทั้งหมด
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('ALL');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition-colors"
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
