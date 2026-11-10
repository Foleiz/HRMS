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
  ShieldCheck,
  User,
  Clock,
  FileText,
  Users,
  Coins,
  Settings,
  HelpCircle,
  PlayCircle,
  Check,
  Info,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface FlowStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  route: string;
  tourParam: string;
  permissionCode: string;
  permissionLabel: string;
  icon: React.ElementType;
  highlights: string[];
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'employees',
    stepNumber: 1,
    title: '1. เพิ่มข้อมูลและประวัติพนักงาน',
    subtitle: 'ไปที่เมนู "พนักงาน" เพื่อบันทึกประวัติพนักงานใหม่ รหัสพนักงาน แผนก และตำแหน่ง',
    route: '/employees',
    tourParam: 'hr-onboarding-1',
    permissionCode: 'EMP_PROFILE_VIEW',
    permissionLabel: 'ดูและจัดการประวัติพนักงาน (EMP_PROFILE_VIEW)',
    icon: Users,
    highlights: ['ปุ่มเพิ่มพนักงานใหม่ (+ เพิ่มพนักงาน)', 'กรอกรหัสพนักงาน, ชื่อ-นามสกุล', 'เลือกตำแหน่ง, แผนก และประเภทพนักงาน'],
  },
  {
    id: 'contracts',
    stepNumber: 2,
    title: '2. บันทึกและสร้างสัญญาจ้างงาน',
    subtitle: 'ไปที่เมนู "สัญญาจ้าง" เพื่อสร้างสัญญาจ้าง กำหนดประเภทสัญญา วันเริ่มงาน และเงินเดือน',
    route: '/employees/contracts',
    tourParam: 'hr-onboarding-2',
    permissionCode: 'EMP_CONTRACT_VIEW',
    permissionLabel: 'ดูและสร้างสัญญาจ้างงาน (EMP_CONTRACT_VIEW)',
    icon: FileText,
    highlights: ['ปุ่มสร้างสัญญาใหม่ (+ สร้างสัญญาใหม่)', 'เลือกพนักงานที่เพิ่มจากขั้นตอนที่ 1', 'กำหนดประเภทสัญญา, วันเริ่มสัญญา และแนบเอกสาร'],
  },
  {
    id: 'users',
    stepNumber: 3,
    title: '3. ผูกบัญชีผู้ใช้งานและกำหนดสิทธิ์',
    subtitle: 'ไปที่เมนู "ผู้ใช้งาน" เพื่อสร้าง Username, รหัสผ่าน และมอบหมายบทบาท (Role) สำหรับเข้าระบบ',
    route: '/settings?tab=users',
    tourParam: 'hr-onboarding-3',
    permissionCode: 'SETTINGS_USERS_VIEW',
    permissionLabel: 'จัดการบัญชีผู้ใช้งาน (SETTINGS_USERS_VIEW)',
    icon: User,
    highlights: ['ปุ่มเพิ่มผู้ใช้งาน (+ เพิ่มผู้ใช้งาน)', 'เลือกพนักงานที่ผูกสัญญาจ้างแล้ว', 'กำหนด Username, Password และสิทธิ์บทบาท (Role)'],
  },
];

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const isCompletedFlow =
    searchParams?.get('completed') === 'hr-onboarding' || searchParams?.get('completed') === '1';

  // State: สำหรับจำลองการเปิด-ปิด Permission ในการทดสอบ
  const [mockPermissions, setMockPermissions] = useState<Record<string, boolean>>({
    EMP_PROFILE_VIEW: true,
    EMP_CONTRACT_VIEW: true,
    SETTINGS_USERS_VIEW: true,
  });

  useEffect(() => {
    setBreadcrumb({ section: 'ภาพรวม', page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // ฟังก์ชันเช็คว่าผู้ใช้มีสิทธิ์จริง หรือจำลองมีสิทธิ์
  const checkEffectivePermission = (permCode: string) => {
    // ถ้าผู้ใช้เป็น Admin หรือ System Super ให้ถือว่ามีสิทธิ์เสมอ เว้นแต่จะสั่ง Mock ปิด
    const actualPerm =
      hasPermission(permCode) || hasRole('ADMIN') || hasRole('SYSTEM_SUPER') || Boolean(user?.employeeId);
    // รวมกับ Mock state
    return actualPerm && (mockPermissions[permCode] ?? true);
  };

  const toggleMock = (permCode: string) => {
    setMockPermissions((prev) => ({
      ...prev,
      [permCode]: !prev[permCode],
    }));
  };

  // เริ่ม Onboarding Flow ข้ามหน้า
  const handleStartOnboardingJourney = () => {
    // หาหน้าแรกที่ผู้ใช้มีสิทธิ์เข้าถึงตามลำดับ
    for (const step of FLOW_STEPS) {
      if (checkEffectivePermission(step.permissionCode)) {
        // ส่ง query param mock ไปด้วย เพื่อให้หน้าปลายทางจำลองสิทธิ์ต่อได้อย่างต่อเนื่อง
        const mockParam = encodeURIComponent(JSON.stringify(mockPermissions));
        router.push(`${step.route}${step.route.includes('?') ? '&' : '?'}tour=${step.tourParam}&mock=${mockParam}`);
        return;
      }
    }
    alert('คุณไม่มีสิทธิ์เข้าถึงขั้นตอนใดเลยใน Flow นี้');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Banner
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-primary to-blue-950 text-white p-7 sm:p-9 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <Compass className="w-3.5 h-3.5" />
            ระบบแนะนำการใช้งานเสมือนจริง (Action-Oriented Onboarding)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            วิธีการใช้งาน: Flow เพิ่มพนักงานใหม่ (HR Onboarding)
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            คู่มือการปฏิบัติงานแบบเป็นลำดับขั้นตอนสำหรับฝ่ายบุคคล (HR) ในการรับพนักงานใหม่เข้าสู่ระบบ HRMS
            ระบบจะพาคุณเปิดแบบฟอร์ม แนะนำช่องที่ต้องกรอก และเชื่อมต่อไปยังหน้าถัดไปแบบอัตโนมัติ
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* แจ้งเตือนเมื่อทำ Onboarding Flow สำเร็จ */}
      {isCompletedFlow && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 animate-in fade-in">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              🎉 ยินดีด้วย! คุณทำ Flow เพิ่มพนักงานใหม่ (HR Onboarding) สำเร็จครบทั้ง 3 ขั้นตอนแล้ว
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              ขั้นตอน: 1. บันทึกข้อมูลพนักงาน (/employees) → 2. สร้างสัญญาจ้าง (/employees/contracts) → 3. ผูกบัญชีผู้ใช้งานระบบ (/settings?tab=users)
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. Interactive Showcase: Onboarding Flow 3 หน้าจอ
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/70 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
              <Sparkles className="w-4 h-4" />
              HR ONBOARDING JOURNEY: 3 หน้าจอต่อเนื่อง
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Flow เพิ่มพนักงานใหม่ (เชื่อมต่อ 3 หน้าจอแบบ Interactive Tour)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ลำดับขั้นตอน: 1. ทะเบียนประวัติพนักงาน → 2. สัญญาจ้างงาน → 3. ผูกบัญชีผู้ใช้งานระบบ พร้อมระบบตรวจสอบ Permission อัตโนมัติ
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={<PlayCircle className="w-4 h-4" />}
            onClick={handleStartOnboardingJourney}
            className="shadow-md shadow-blue-600/20"
          >
            🚀 เริ่มต้น Tour แนะนำทีละขั้นตอน
          </Button>
        </div>

        {/* Stepper Cards 3 ขั้นตอน */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {FLOW_STEPS.map((step) => {
            const hasPerm = checkEffectivePermission(step.permissionCode);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`relative rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  hasPerm
                    ? 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600'
                    : 'bg-slate-100/60 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {step.stepNumber}
                    </span>
                    {hasPerm ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" /> มีสิทธิ์เข้าถึง
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <Lock className="w-3 h-3" /> ข้าม (ไม่มีสิทธิ์)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                    {step.subtitle}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      ข้อมูลที่ไกด์จะแนะนำให้กรอก:
                    </span>
                    {step.highlights.map((h, hIdx) => (
                      <div key={hIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px] truncate max-w-[170px]" title={step.permissionCode}>
                    🔑 {step.permissionCode}
                  </span>
                  <span className="font-mono text-[11px]">{step.route.split('?')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            Permission Simulator Box
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                เครื่องมือทดสอบการทำงานของ Permission (Permission Simulator)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ลองกดสลับเพื่อทดสอบว่า หาก Role ของพนักงานไม่มีสิทธิ์ในหน้าใดหน้าหนึ่ง ระบบจะข้ามหน้านั้นไปอย่างปลอดภัยโดยอัตโนมัติได้อย่างไร:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FLOW_STEPS.map((step) => {
              const isChecked = mockPermissions[step.permissionCode] ?? true;
              return (
                <button
                  key={step.permissionCode}
                  type="button"
                  onClick={() => toggleMock(step.permissionCode)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                    isChecked
                      ? 'bg-white dark:bg-slate-800 border-blue-400 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'bg-slate-200/50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 text-slate-500 line-through'
                  }`}
                >
                  <span className="truncate pr-2">
                    {isChecked ? '✅ เปิดสิทธิ์' : '❌ ปิดสิทธิ์'}: {step.stepNumber}. {step.title.split('&')[0]}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${isChecked ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {isChecked ? 'Active' : 'Locked'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>สรุปผล:</strong> หากผู้ใช้ไม่มีสิทธิ์ในหน้า 2 (สัญญาจ้าง) เมื่อกดถัดไปจากหน้า 1 (พนักงาน) ระบบจะกระโดดข้ามไปยังหน้า 3 (ผู้ใช้งาน) ทันทีโดยไม่เกิดหน้า 403 Forbidden!
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. Detailed Checklist for HR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/70 p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ข้อแนะนำและข้อมูลที่ต้องเตรียมก่อนเริ่มดำเนินการ (Prerequisites & Checklist)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            เตรียมข้อมูลสำคัญเหล่านี้ไว้ล่วงหน้าเพื่อให้การกรอกข้อมูลในแต่ละหน้าจอเป็นไปอย่างรวดเร็วและครบถ้วน:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> ข้อมูลพนักงาน (หน้า 1)
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>รหัสพนักงาน (EMP-xxx) และรหัสสแกนนิ้ว</li>
              <li>คำนำหน้า, ชื่อ-นามสกุลภาษาไทย</li>
              <li>ตำแหน่งงานและแผนกที่สังกัด</li>
              <li>ประเภทการจ้างงาน (เช่น พนักงานทดลองงาน)</li>
              <li>วันเริ่มงาน (Effective Date)</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> สัญญาจ้างงาน (หน้า 2)
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>ชื่อพนักงาน (เลือกจากที่บันทึกไว้ในขั้นตอนที่ 1)</li>
              <li>ประเภทสัญญา (ทดลองงาน, ประจำ, ชั่วคราว)</li>
              <li>วันเริ่มต้นสัญญา และวันสิ้นสุด (ถ้ามี)</li>
              <li>ฐานเงินเดือนเริ่มต้นและค่าตอบแทน</li>
              <li>ไฟล์เอกสารสัญญาจ้าง (PDF / Word)</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
            <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <User className="w-4 h-4" /> บัญชีผู้ใช้งานระบบ (หน้า 3)
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>ชื่อผู้ใช้ (Username) สำหรับเข้าสู่ระบบ</li>
              <li>รหัสผ่านชั่วคราวเริ่มต้น (Initial Password)</li>
              <li>เลือกพนักงานที่เชื่อมต่อกับบัญชี</li>
              <li>กำหนดบทบาท (Role) ในระบบ HRMS</li>
              <li>เปิดสถานะบัญชีให้เป็น "เปิดใช้งาน (Active)"</li>
            </ul>
          </div>
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
