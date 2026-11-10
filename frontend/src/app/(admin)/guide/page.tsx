'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  Compass,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  FileText,
  UserCheck,
  Play,
  RotateCcw,
  Check,
  Clock,
  Layers,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface TutorialQuest {
  id: string;
  title: string;
  category: 'HR' | 'ESS' | 'APPROVAL';
  categoryLabel: string;
  duration: string;
  stepCount: number;
  description: string;
  isAvailable: boolean;
  route?: string;
  steps: {
    number: number;
    title: string;
    detail: string;
    routeText: string;
    icon: React.ElementType;
  }[];
}

const TUTORIAL_QUESTS: TutorialQuest[] = [
  {
    id: 'hr-onboarding',
    title: 'เพิ่มพนักงานใหม่ (HR Onboarding)',
    category: 'HR',
    categoryLabel: 'ฝ่ายบุคคล (HR)',
    duration: '~2 นาที',
    stepCount: 3,
    description: 'บันทึกประวัติพนักงานใหม่ จัดทำสัญญาจ้าง และผูกบัญชีผู้ใช้เข้าสู่ระบบ',
    isAvailable: true,
    route: '/employees?tour=hr-onboarding-1',
    steps: [
      {
        number: 1,
        title: 'ข้อมูลพนักงาน',
        detail: 'รหัสพนักงาน, ชื่อ-นามสกุล, ตำแหน่ง และแผนก',
        routeText: '/employees',
        icon: Users,
      },
      {
        number: 2,
        title: 'สัญญาจ้างงาน',
        detail: 'ประเภทสัญญา, วันเริ่มงาน และเงินเดือนเริ่มต้น',
        routeText: '/employees/contracts',
        icon: FileText,
      },
      {
        number: 3,
        title: 'บัญชีผู้ใช้งาน',
        detail: 'กำหนด Username, รหัสผ่าน และมอบหมายสิทธิ์ (Role)',
        routeText: '/settings?tab=users',
        icon: UserCheck,
      },
    ],
  },
  {
    id: 'leave-request',
    title: 'การยื่นคำขอลาหยุดงาน (Leave Request)',
    category: 'ESS',
    categoryLabel: 'พนักงานทั่วไป (ESS)',
    duration: '~1 นาที',
    stepCount: 2,
    description: 'เลือกประเภทการลา ตรวจสอบโควตาวันลาคงเหลือ และส่งคำขออนุมัติ',
    isAvailable: false,
    steps: [
      {
        number: 1,
        title: 'เลือกประเภทวันลา',
        detail: 'ลาพักร้อน, ลาป่วย, ลากิจ และตรวจวันลาคงเหลือ',
        routeText: '/documents/leave',
        icon: FileText,
      },
      {
        number: 2,
        title: 'ระบุวันที่และส่งคำขอ',
        detail: 'เลือกวันลา แนบไฟล์เอกสาร และส่งให้หัวหน้าอนุมัติ',
        routeText: '/documents/leave',
        icon: Clock,
      },
    ],
  },
  {
    id: 'attendance-check',
    title: 'บันทึกเวลาและการตอกบัตร (Attendance)',
    category: 'ESS',
    categoryLabel: 'พนักงานทั่วไป (ESS)',
    duration: '~1 นาที',
    stepCount: 2,
    description: 'ตรวจเช็คเวลาเข้า-ออกงาน สถิติการมาสาย และยื่นขอปรับปรุงเวลา',
    isAvailable: false,
    steps: [
      {
        number: 1,
        title: 'ตรวจสถิติเวลาทำงาน',
        detail: 'ตรวจสอบบันทึกเวลาเข้างาน ขาด ลา มาสาย รายเดือน',
        routeText: '/ess/attendance',
        icon: CalendarDays,
      },
      {
        number: 2,
        title: 'ขอปรับปรุงเวลา',
        detail: 'ยื่นคำร้องขอปรับเวลาทำงานเมื่อลืมสแกนนิ้ว',
        routeText: '/ess/attendance',
        icon: CheckCircle2,
      },
    ],
  },
  {
    id: 'manager-approvals',
    title: 'การอนุมัติคำขอของลูกทีม (Approvals)',
    category: 'APPROVAL',
    categoryLabel: 'หัวหน้างาน (Approval)',
    duration: '~1 นาที',
    stepCount: 2,
    description: 'ตรวจสอบรายการคำขอลาและเวลาทำงานของลูกทีม พร้อมกดอนุมัติ',
    isAvailable: false,
    steps: [
      {
        number: 1,
        title: 'ตรวจสอบรายการคำขอ',
        detail: 'ดูคำขอลาคงค้าง และเหตุผลประกอบการลา',
        routeText: '/approvals',
        icon: Layers,
      },
      {
        number: 2,
        title: 'อนุมัติ / ไม่อนุมัติ',
        detail: 'กดอนุมัติหรือส่งกลับแก้ไขพร้อมระบุเหตุผล',
        routeText: '/approvals',
        icon: CheckCircle2,
      },
    ],
  },
];

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const isCompletedFlow =
    searchParams?.get('completed') === 'hr-onboarding' || searchParams?.get('completed') === '1';

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const filteredQuests =
    selectedCategory === 'ALL'
      ? TUTORIAL_QUESTS
      : TUTORIAL_QUESTS.filter((q) => q.category === selectedCategory);

  const startTutorial = (route?: string) => {
    if (!route) return;
    router.push(route);
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. Header Banner (Compact & Game-Style)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-primary to-blue-900 text-white p-6 sm:p-7 shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-blue-300" />
              Tutorial Hub • คู่มือแนะนำการใช้งาน
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              วิธีการใช้งานระบบ (Tutorials & Guides)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              เลือกบทเรียนที่คุณต้องการ ระบบจะพาทำทีละขั้นตอนอย่างรวดเร็ว
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>พร้อมใช้งาน 1 หัวข้อ</span>
            </div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* แจ้งเตือนเมื่อทำ Onboarding Flow สำเร็จ (Quest Completed Banner) */}
      {isCompletedFlow && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                🎉 ยินดีด้วย! คุณทำไกด์ "เพิ่มพนักงานใหม่" สำเร็จครบทั้ง 3 ขั้นตอนแล้ว
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                พนักงานมีข้อมูลครบถ้วน: ประวัติพนักงาน → สัญญาจ้างงาน → บัญชีผู้ใช้งานระบบ
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => startTutorial('/employees?tour=hr-onboarding-1')}
            className="shrink-0 text-xs"
          >
            ทำซ้ำอีกครั้ง
          </Button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. Category Filter Tabs (สไตล์ Game Quest Tab)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'ทั้งหมด' },
          { key: 'HR', label: 'ฝ่ายบุคคล (HR)' },
          { key: 'ESS', label: 'พนักงานทั่วไป' },
          { key: 'APPROVAL', label: 'หัวหน้างาน' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedCategory(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === tab.key
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Tutorial Quests List
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQuests.map((quest) => {
          const isCompleted = quest.id === 'hr-onboarding' && isCompletedFlow;

          return (
            <div
              key={quest.id}
              className={`rounded-2xl border transition-all ${
                quest.isAvailable
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500'
                  : 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800/80 opacity-60'
              }`}
            >
              <div className="p-5 sm:p-6 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        quest.isAvailable
                          ? 'bg-primary text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {quest.title}
                        </h2>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {quest.categoryLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {quest.stepCount} ขั้นตอน ({quest.duration})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {quest.isAvailable ? (
                      <>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 px-2 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5" /> สำเร็จแล้ว
                          </span>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Play className="w-3.5 h-3.5 fill-current" />}
                          onClick={() => startTutorial(quest.route)}
                          className="shadow-xs text-xs font-semibold"
                        >
                          {isCompleted ? 'เปิดดูอีกครั้ง' : 'เริ่มไกด์ทันที'}
                        </Button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-3.5 h-3.5" /> เร็วๆ นี้
                      </span>
                    )}
                  </div>
                </div>

                {/* Steps Mini-Timeline (สไตล์เควสต์ 3 ด่านในเกม) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  {quest.steps.map((st) => {
                    const StepIcon = st.icon;
                    return (
                      <div
                        key={st.number}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          quest.isAvailable
                            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
                            : 'bg-transparent border-slate-200/40 dark:border-slate-800/40'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {st.number}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <StepIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {st.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {st.detail}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 block mt-1">
                            {st.routeText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลดวิธีการใช้งาน...</div>}>
      <GuidePageContent />
    </Suspense>
  );
}
