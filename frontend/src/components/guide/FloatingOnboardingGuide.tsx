'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  Users,
  FileText,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui';

export interface GuideStepData {
  stepNumber: number;
  title: string;
  menuName: string;
  route: string;
  purpose: string;
  actionText: string;
  fields: {
    label: string;
    description: string;
  }[];
  nextRoute?: string;
  prevRoute?: string;
}

export const ONBOARDING_STEPS_DATA: GuideStepData[] = [
  {
    stepNumber: 1,
    title: 'บันทึกข้อมูลและประวัติพนักงาน',
    menuName: 'เมนูพนักงาน (/employees)',
    route: '/employees',
    purpose: 'สร้างฐานข้อมูลประวัติบุคคล กำหนดตำแหน่ง แผนก และผูกสายการบังคับบัญชาในระบบ HRMS',
    actionText: 'คลิกปุ่ม "+ เพิ่มพนักงาน" ด้านบนขวาเพื่อเปิดแบบฟอร์ม',
    fields: [
      { label: 'รหัสพนักงาน (EMP Code)', description: 'ระบบจะรันรหัสอัตโนมัติ (เช่น EMP-001) หรือแก้ไขให้ตรงกับผังองค์กร' },
      { label: 'รหัสสแกนนิ้ว (Biometric ID)', description: 'ระบุรหัสให้ตรงกับเครื่องตอกบัตร/สแกนนิ้ว เพื่อเชื่อมต่อเวลาเข้างาน' },
      { label: 'คำนำหน้า, ชื่อจริง และนามสกุล', description: 'ข้อมูลภาษาไทยตามกฎหมายแรงงานสำหรับออกเอกสารราชการ' },
      { label: 'ตำแหน่งงาน & แผนกที่สังกัด', description: 'เลือกเพื่อให้ระบบผูกสายการบังคับบัญชาและผู้อนุมัติเอกสารอัตโนมัติ' },
      { label: 'ประเภทพนักงาน', description: 'เลือกประเภทการจ้างงาน เช่น "พนักงานทดลองงาน" หรือ "ประจำ"' },
    ],
    nextRoute: '/employees/contracts?guide=hr-onboarding',
  },
  {
    stepNumber: 2,
    title: 'จัดทำและบันทึกสัญญาจ้างงาน',
    menuName: 'เมนูสัญญาจ้าง (/employees/contracts)',
    route: '/employees/contracts',
    purpose: 'ทำข้อตกลงจ้างงานอย่างเป็นทางการ กำหนดระยะเวลาทดลองงาน ฐานเงินเดือน และแนบสัญญาฉบับจริง',
    actionText: 'คลิกปุ่ม "+ สร้างสัญญาใหม่" ด้านบนเพื่อเปิดแบบฟอร์ม',
    fields: [
      { label: 'เลือกพนักงาน', description: 'ค้นหาและเลือกชื่อพนักงานใหม่ที่เพิ่งเพิ่มจากขั้นตอนที่ 1' },
      { label: 'ประเภทสัญญาจ้าง', description: 'เลือก เช่น สัญญาจ้างทดลองงาน (Probation) หรือสัญญาประจำ' },
      { label: 'วันเริ่มสัญญา - วันที่สิ้นสุด', description: 'กำหนดวันเริ่มงานจริง และกำหนดวันครบกำหนดทดลองงาน (เช่น 119 วัน)' },
      { label: 'ฐานเงินเดือนเริ่มต้น', description: 'ระบุอัตราค่าจ้าง เพื่อส่งต่อไปยังระบบประมวลผลเงินเดือน (Payroll)' },
      { label: 'แนบไฟล์สัญญาจ้าง', description: 'อัปโหลดไฟล์สัญญาฉบับจริง (PDF/Word) เก็บเป็นประวัติดิจิทัล' },
    ],
    prevRoute: '/employees?guide=hr-onboarding',
    nextRoute: '/settings?tab=users&guide=hr-onboarding',
  },
  {
    stepNumber: 3,
    title: 'สร้างบัญชีผู้ใช้และกำหนดสิทธิ์',
    menuName: 'เมนูผู้ใช้งาน (/settings?tab=users)',
    route: '/settings?tab=users',
    purpose: 'ออกบัญชีล็อกอิน (Username/Password) และมอบหมาย Role ให้พนักงานเข้าสู่ระบบ HRMS ได้ทันที',
    actionText: 'คลิกปุ่ม "+ เพิ่มผู้ใช้งาน" ด้านบนเพื่อเปิดแถบแบบฟอร์ม (Drawer)',
    fields: [
      { label: 'เลือกพนักงานที่จะผูกบัญชี', description: 'เลือกพนักงานที่มีข้อมูลครบถ้วนจากขั้นตอนที่ 1 และ 2' },
      { label: 'ชื่อผู้ใช้งาน (Username)', description: 'ตั้งชื่อบัญชีสำหรับล็อกอิน (แนะนำใช้รหัสพนักงาน เช่น EMP-001)' },
      { label: 'รหัสผ่านเริ่มต้น (Password)', description: 'กำหนดรหัสผ่านชั่วคราวเพื่อให้พนักงานใช้ล็อกอินครั้งแรก' },
      { label: 'เลือกบทบาทและสิทธิ์ (Role)', description: 'พนักงานทั่วไปเลือก EMPLOYEE หรือฝ่ายบุคคลเลือก HR' },
      { label: 'สถานะบัญชี', description: 'เลือก "เปิดใช้งาน (Active)" เพื่อให้เข้าสู่ระบบได้ทันที' },
    ],
    prevRoute: '/employees/contracts?guide=hr-onboarding',
    nextRoute: '/guide?completed=hr-onboarding',
  },
];

interface FloatingOnboardingGuideProps {
  currentStep: 1 | 2 | 3;
}

export const FloatingOnboardingGuide: React.FC<FloatingOnboardingGuideProps> = ({ currentStep }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuideActive = searchParams?.get('guide') === 'hr-onboarding';

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // ถ้าไม่มี query param guide และผู้ใช้ปิดไป ก็จะไม่โชว์
  if (!isGuideActive || !isVisible) {
    return null;
  }

  const stepData = ONBOARDING_STEPS_DATA[currentStep - 1];

  const handleNext = () => {
    if (stepData.nextRoute) {
      router.push(stepData.nextRoute);
    }
  };

  const handlePrev = () => {
    if (stepData.prevRoute) {
      router.push(stepData.prevRoute);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // State: ย่อเป็นปุ่มเล็ก
  if (isMinimized) {
    return (
      <aside aria-label="แถบคู่มือแนะนำการใช้งาน" className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-2">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md transition-all text-xs font-semibold group"
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <Compass className="w-4 h-4 text-blue-400 group-hover:rotate-45 transition-transform" />
          <span>คู่มือ: ขั้นตอนที่ {currentStep} จาก 3</span>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="หน้าต่างคู่มือแนะนำการใช้งาน" className="fixed bottom-5 right-5 z-40 w-[92vw] max-w-[420px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-blue-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Compass className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold truncate">คู่มือ: Flow เพิ่มพนักงานใหม่</h4>
            <span className="text-[10px] text-blue-200 block truncate font-mono">
              ขั้นตอนที่ {currentStep} จาก 3 • {stepData.menuName.split(' ')[0]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="ย่อขนาด"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="ปิดคู่มือ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800/80 p-1 gap-1 text-[11px] font-semibold">
        {[
          { num: 1, label: '1. ข้อมูลพนักงาน' },
          { num: 2, label: '2. สัญญาจ้าง' },
          { num: 3, label: '3. บัญชีผู้ใช้' },
        ].map((s) => (
          <div
            key={s.num}
            className={`py-1 text-center rounded-lg transition-colors truncate px-1 ${
              s.num === currentStep
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-300 font-bold shadow-2xs'
                : s.num < currentStep
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Content Body */}
      <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
        {/* Title & Action */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {currentStep}
            </span>
            <span>{stepData.title}</span>
          </h3>
          <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <strong className="block text-[11px] font-semibold text-blue-800 dark:text-blue-200">
                สิ่งที่ต้องทำ:
              </strong>
              <span>{stepData.actionText}</span>
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <span className="font-semibold text-slate-700 dark:text-slate-200 block text-[11px] mb-0.5">
            🎯 เพื่ออะไร (จุดประสงค์):
          </span>
          <p className="leading-relaxed">{stepData.purpose}</p>
        </div>

        {/* Fields to Fill */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            📝 ช่องสำคัญที่ต้องกรอกในแบบฟอร์ม:
          </span>
          <div className="space-y-1.5">
            {stepData.fields.map((f, fIdx) => (
              <div
                key={fIdx}
                className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{f.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 pl-3">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Controls: Back & Next */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!stepData.prevRoute}
          icon={<ChevronLeft className="w-3.5 h-3.5" />}
          onClick={handlePrev}
          className="text-xs"
        >
          ย้อนกลับ
        </Button>

        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {currentStep} / 3
        </span>

        <Button
          variant="primary"
          size="sm"
          onClick={handleNext}
          className="text-xs shadow-xs"
        >
          <span>{currentStep === 3 ? 'จบขั้นตอน 🎉' : 'ถัดไป'}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </aside>
  );
};
