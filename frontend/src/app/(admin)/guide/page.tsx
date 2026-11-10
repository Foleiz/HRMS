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
  RotateCcw,
  Check,
  Clock,
  Layers,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { ONBOARDING_STEPS_DATA } from '@/components/guide/FloatingOnboardingGuide';

interface UpcomingQuest {
  id: string;
  title: string;
  categoryLabel: string;
  duration: string;
  stepCount: number;
  description: string;
  steps: string[];
}

const UPCOMING_QUESTS: UpcomingQuest[] = [
  {
    id: 'leave-request',
    title: 'การยื่นคำขอลาหยุดงาน (Leave Request)',
    categoryLabel: 'พนักงานทั่วไป (ESS)',
    duration: '~1 นาที',
    stepCount: 2,
    description: 'เลือกประเภทการลา ตรวจสอบโควตาวันลาคงเหลือ และส่งคำขออนุมัติ',
    steps: ['เลือกประเภทการลา & ดูวันลาคงเหลือ', 'ระบุวันที่ แนบไฟล์ และส่งคำขอ'],
  },
  {
    id: 'attendance-check',
    title: 'บันทึกเวลาและการตอกบัตร (Attendance)',
    categoryLabel: 'พนักงานทั่วไป (ESS)',
    duration: '~1 นาที',
    stepCount: 2,
    description: 'ตรวจเช็คเวลาเข้า-ออกงาน สถิติการมาสาย และยื่นขอปรับปรุงเวลา',
    steps: ['ตรวจสถิติเวลาทำงานรายเดือน', 'ยื่นคำขอปรับเวลาเมื่อลืมสแกนนิ้ว'],
  },
  {
    id: 'manager-approvals',
    title: 'การอนุมัติคำขอของลูกทีม (Approvals)',
    categoryLabel: 'หัวหน้างาน (Approval)',
    duration: '~1 นาที',
    stepCount: 2,
    description: 'ตรวจสอบรายการคำขอลาและเวลาทำงานของลูกทีม พร้อมกดอนุมัติ',
    steps: ['ตรวจสอบใบลาและเหตุผล', 'พิจารณากดอนุมัติหรือไม่อนุมัติ'],
  },
];

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const [activeStep, setActiveStep] = useState<number>(1);

  const isCompletedFlow =
    searchParams?.get('completed') === 'hr-onboarding' || searchParams?.get('completed') === '1';

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const currentStepData = ONBOARDING_STEPS_DATA[activeStep - 1];

  const handleNextStep = () => {
    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
    } else {
      router.push('/guide?completed=hr-onboarding');
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const openActualPage = () => {
    router.push(`${currentStepData.route}?guide=hr-onboarding`);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. Header Banner
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-primary to-blue-900 text-white p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-blue-300" />
              คู่มือแนะนำการใช้งาน (Tutorial Playbook)
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              วิธีการใช้งาน: Flow เพิ่มพนักงานใหม่ (HR Onboarding)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              ขั้นตอนมาตรฐาน 3 เมนูสำหรับฝ่ายบุคคล: 1. บันทึกข้อมูลพนักงาน → 2. สร้างสัญญาจ้าง → 3. ออกบัญชีผู้ใช้งาน
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={openActualPage}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              เปิดหน้าทำงานจริง ↗
            </Button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* แจ้งเตือนเมื่อทำ Onboarding Flow สำเร็จ */}
      {isCompletedFlow && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                🎉 ยินดีด้วย! คุณทำความเข้าใจ Flow เพิ่มพนักงานใหม่ครบทั้ง 3 ขั้นตอนแล้ว
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                พนักงานมีข้อมูลครบถ้วน: ประวัติพนักงาน (/employees) → สัญญาจ้าง (/employees/contracts) → บัญชีผู้ใช้งาน (/settings?tab=users)
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => {
              setActiveStep(1);
              router.push('/guide');
            }}
            className="shrink-0 text-xs"
          >
            เริ่มอ่านใหม่
          </Button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. Interactive Stepper Card (No Spotlight, Clean & Clear)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {/* Stepper Tabs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          {[
            { step: 1, title: '1. ข้อมูลพนักงาน', route: '/employees', icon: Users },
            { step: 2, title: '2. สัญญาจ้างงาน', route: '/employees/contracts', icon: FileText },
            { step: 3, title: '3. บัญชีผู้ใช้งาน', route: '/settings?tab=users', icon: UserCheck },
          ].map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeStep === item.step;
            const isPassed = activeStep > item.step;

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                className={`p-4 text-left transition-all border-b-2 sm:border-b-0 sm:border-r last:border-r-0 flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 border-primary text-primary dark:text-blue-400 font-bold shadow-2xs'
                    : isPassed
                    ? 'border-transparent text-emerald-600 dark:text-emerald-400 hover:bg-slate-100/60'
                    : 'border-transparent text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : isPassed
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4" /> : item.step}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                      {item.route}
                    </span>
                  </div>
                </div>

                <ItemIcon className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" />
              </button>
            );
          })}
        </div>

        {/* Step Detail Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header of Active Step */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-blue-400 mb-1">
                <span>ขั้นตอนที่ {activeStep} จาก 3</span>
                <span>•</span>
                <span className="font-mono text-slate-400">{currentStepData.menuName}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {currentStepData.title}
              </h2>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={openActualPage}
              className="text-xs shrink-0"
            >
              เปิดหน้าทำงานนี้ทันที ↗
            </Button>
          </div>

          {/* 2-Column Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Box 1: เพื่ออะไร (Purpose) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                🎯 เพื่ออะไร (จุดประสงค์ของขั้นตอนนี้):
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentStepData.purpose}
              </p>
            </div>

            {/* Box 2: สิ่งที่ต้องทำ (Action) */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                ⚡ สิ่งที่ต้องทำในหน้านี้ (Action):
              </span>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                {currentStepData.actionText}
              </p>
            </div>
          </div>

          {/* Fields Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                📝 ช่องสำคัญที่ต้องกรอกในแบบฟอร์ม & คำแนะนำ:
              </h3>
              <span className="text-[11px] text-slate-400">
                {currentStepData.fields.length} รายการสำคัญ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentStepData.fields.map((f, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/30 border border-slate-200/70 dark:border-slate-800 space-y-1 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{f.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-7 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar: ย้อนกลับ / ถัดไป */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            disabled={activeStep === 1}
            icon={<ChevronLeft className="w-4 h-4" />}
            onClick={handlePrevStep}
            className="text-xs font-semibold"
          >
            ย้อนกลับ
          </Button>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            ขั้นตอนที่ {activeStep} / 3
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleNextStep}
            className="text-xs font-semibold shadow-xs"
          >
            <span>{activeStep === 3 ? 'จบ Flow การรับพนักงานใหม่ 🎉' : 'ขั้นตอนถัดไป'}</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Upcoming Guides List (เร็วๆ นี้)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          หัวข้อคู่มืออื่นๆ ในระบบ (เร็วๆ นี้):
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {UPCOMING_QUESTS.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 opacity-60 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                    {q.categoryLabel}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> เร็วๆ นี้
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  {q.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {q.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                • {q.stepCount} ขั้นตอน ({q.duration})
              </div>
            </div>
          ))}
        </div>
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
