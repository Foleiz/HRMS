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

interface ModuleGuide {
  id: string;
  title: string;
  category: 'พนักงานทั่วไป (ESS)' | 'หัวหน้างาน (Approval)' | 'ฝ่ายบุคคล (HR)' | 'ผู้ดูแลระบบ (Admin)';
  description: string;
  route: string;
  requiredPermissions: string[];
  icon: React.ElementType;
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'profile',
    stepNumber: 1,
    title: 'ข้อมูลส่วนตัวและรูปโปรไฟล์',
    subtitle: 'ตรวจทานข้อมูลพนักงาน อัปเดตที่อยู่ เบอร์ติดต่อ และรูปถ่าย',
    route: '/profile?tab=personal',
    tourParam: 'onboarding-1',
    permissionCode: 'ESS_PROFILE_VIEW',
    permissionLabel: 'ดูและแก้ไขโปรไฟล์ตนเอง (ESS_PROFILE_VIEW)',
    icon: User,
    highlights: ['การ์ดสรุปข้อมูลและรูปโปรไฟล์', 'แท็บข้อมูลติดต่อ & ประกันสังคม', 'ปุ่มแก้ไขข้อมูลส่วนตัว'],
  },
  {
    id: 'attendance',
    stepNumber: 2,
    title: 'ตรวจบันทึกเวลาทำงาน & กะงาน',
    subtitle: 'ดูประวัติสแกนนิ้ว วันทำงาน มาสาย และวิธียื่นขอปรับปรุงเวลา',
    route: '/ess/attendance',
    tourParam: 'onboarding-2',
    permissionCode: 'ESS_TIME_VIEW',
    permissionLabel: 'ดูบันทึกเวลาทำงานตนเอง (ESS_TIME_VIEW)',
    icon: Clock,
    highlights: ['การ์ดสรุปเวลาทำงานประจำเดือน', 'ตารางประวัติการเข้า-ออกงาน', 'แท็บยื่นคำขอปรับปรุงเวลา'],
  },
  {
    id: 'leave',
    stepNumber: 3,
    title: 'วิธียื่นคำขอลา & ดูโควตาคงเหลือ',
    subtitle: 'เลือกประเภทการลา เช็คสิทธิ์วันลา แนบไฟล์ และส่งใบลา',
    route: '/documents/leave',
    tourParam: 'onboarding-3',
    permissionCode: 'ESS_LEAVE_VIEW',
    permissionLabel: 'ยื่นคำขอลาและดูสิทธิ์วันลา (ESS_LEAVE_VIEW)',
    icon: FileText,
    highlights: ['ประเภทการลา & สิทธิ์คงเหลือ', 'การเลือกวันที่ & รูปแบบเต็ม/ครึ่งวัน', 'แถบปุ่มบันทึกและส่งคำขอ'],
  },
];

const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: 'guide-leave',
    title: 'การยื่นคำขอลาหยุดงาน',
    category: 'พนักงานทั่วไป (ESS)',
    description: 'เรียนรู้วิธีการเลือกประเภทการลา ตรวจสอบวันลาคงเหลือ แนบเอกสารประกอบ และส่งคำขอไปยังสายการอนุมัติ',
    route: '/documents/leave?tour=direct',
    requiredPermissions: ['ESS_LEAVE_VIEW', 'ESS_DOCS_CREATE', 'ESS_DOCS_VIEW'],
    icon: FileText,
  },
  {
    id: 'guide-attendance',
    title: 'ตรวจบันทึกเวลาทำงานและการตอกบัตร',
    category: 'พนักงานทั่วไป (ESS)',
    description: 'ตรวจสอบสถิติเวลาทำงานรายเดือน วันเข้างาน มาสาย ขาดงาน และวิธียื่นคำขอปรับปรุงเวลาเมื่อลืมสแกนนิ้ว',
    route: '/ess/attendance?tour=direct',
    requiredPermissions: ['ESS_TIME_VIEW', 'TIME_DAILY_VIEW'],
    icon: Clock,
  },
  {
    id: 'guide-profile',
    title: 'ข้อมูลส่วนตัวและรูปโปรไฟล์',
    category: 'พนักงานทั่วไป (ESS)',
    description: 'ดูข้อมูลประวัติการทำงาน สัญญาจ้าง สิทธิประโยชน์ และวิธีการอัปเดตข้อมูลติดต่อกับรูปถ่ายส่วนตัว',
    route: '/profile?tour=direct',
    requiredPermissions: ['ESS_PROFILE_VIEW'],
    icon: User,
  },
  {
    id: 'guide-approvals',
    title: 'การอนุมัติคำขอของลูกทีม',
    category: 'หัวหน้างาน (Approval)',
    description: 'หน้าจอสำหรับผู้บังคับบัญชา ตรวจสอบใบลา คำขอปรับปรุงเวลา และการกดอนุมัติ/ปฏิเสธพร้อมเหตุผล',
    route: '/approvals?tour=direct',
    requiredPermissions: ['APPROVAL_LEAVE_VIEW', 'APPROVAL_LEAVE_APPROVE', 'APPROVALS_VIEW'],
    icon: CheckCircle2,
  },
  {
    id: 'guide-employees',
    title: 'การบริหารจัดการพนักงาน',
    category: 'ฝ่ายบุคคล (HR)',
    description: 'ค้นหาพนักงาน เพิ่มพนักงานใหม่ จัดการสายงาน สัญญาจ้าง และเอกสารสำคัญของบุคลากรในองค์กร',
    route: '/employees?tour=direct',
    requiredPermissions: ['EMP_VIEW', 'EMP_MANAGE', 'EMP_PROFILE_VIEW'],
    icon: Users,
  },
  {
    id: 'guide-payroll',
    title: 'การประมวลผลเงินเดือน',
    category: 'ฝ่ายบุคคล (HR)',
    description: 'จัดการรอบคำนวณเงินเดือน ฐานเงินเดือนพนักงาน โบนัส ค่าล่วงเวลา ภาษี และการส่งออกสลิปเงินเดือน',
    route: '/payroll?tour=direct',
    requiredPermissions: ['PAYROLL_HR_VIEW', 'PAYROLL_ADMIN_VIEW', 'PAYROLL_CALC_VIEW'],
    icon: Coins,
  },
  {
    id: 'guide-settings-roles',
    title: 'การจัดการบทบาทและสิทธิ์ (RBAC Matrix)',
    category: 'ผู้ดูแลระบบ (Admin)',
    description: 'สร้างบทบาท (Roles) กำหนดสิทธิ์การเข้าถึงเมนู และจัดขอบเขตข้อมูล (Self, Team, Dept, Org)',
    route: '/settings?tab=roles&tour=direct',
    requiredPermissions: ['SETTINGS_ROLES_VIEW'],
    icon: Settings,
  },
];

function GuidePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission, hasRole } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const isCompletedFlow = searchParams?.get('completed') === '1';

  // State: สำหรับจำลองการเปิด-ปิด Permission ในการทดสอบ
  const [mockPermissions, setMockPermissions] = useState<Record<string, boolean>>({
    ESS_PROFILE_VIEW: true,
    ESS_TIME_VIEW: true,
    ESS_LEAVE_VIEW: true,
  });

  const [activeCategory, setActiveCategory] = useState<string>('ทั้งหมด');

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

  const filteredGuides =
    activeCategory === 'ทั้งหมด'
      ? MODULE_GUIDES
      : MODULE_GUIDES.filter((g) => g.category === activeCategory);

  return (
    <div className="space-y-8 pb-16">
      {/* ─────────────────────────────────────────────────────────────
          1. Hero Banner
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-primary to-blue-950 text-white p-7 sm:p-9 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <Compass className="w-3.5 h-3.5" />
            ระบบแนะนำการใช้งานเสมือนจริง (Interactive Onboarding)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            วิธีการใช้งานและคู่มือระบบ HRMS
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            ศูนย์รวมคำแนะนำการใช้งานและระบบพาเดินชมแบบ Spotlight ทีละขั้นตอน
            ระบบจะปรับแต่งคู่มือให้อัตโนมัติโดยอิงตามบทบาท (Role) และสิทธิ์ (Permission) ของคุณ
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
              🎉 ยินดีด้วย! คุณทำ Onboarding Flow พนักงานใหม่สำเร็จครบทุกขั้นตอนแล้ว
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              ระบบได้บันทึกสถานะการเรียนรู้เรียบร้อยแล้ว คุณสามารถกลับมาทบทวนคู่มือแต่ละโมดูลได้ทุกเมื่อที่ต้องการ
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
              LIVE DEMO: MULTI-PAGE JOURNEY
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              จำลอง Onboarding Flow พนักงานใหม่ (เชื่อมต่อ 3 หน้าจอ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              แสดงการทำงานของระบบทัวร์ที่เชื่อมต่อข้ามเมนู พร้อมกลไกตรวจเช็ค Permission ในแต่ละขั้นตอน
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={<PlayCircle className="w-4 h-4" />}
            onClick={handleStartOnboardingJourney}
            className="shadow-md shadow-blue-600/20"
          >
            🚀 เริ่มทดสอบ Cross-Page Tour
          </Button>
        </div>

        {/* Stepper Cards 3 ขั้นตอน */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {FLOW_STEPS.map((step, idx) => {
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
                      จุดไฮไลต์บนหน้าจอ:
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
              <strong>สรุปผล:</strong> หากผู้ใช้ไม่มีสิทธิ์ในหน้า 2 (เวลา) เมื่อกดถัดไปจากหน้า 1 (โปรไฟล์) ระบบจะกระโดดข้ามไปยังหน้า 3 (ลา) ทันทีโดยไม่เกิดหน้า 403 Forbidden!
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. All System Guides Catalog
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary dark:text-blue-400" />
              คลังคู่มือแนะนำการใช้งานทั้งหมดแยกตามโมดูล
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              คลิกเพื่อเปิดดูทัวร์ของแต่ละโมดูลได้โดยตรงตามที่คุณมีสิทธิ์เข้าถึง
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['ทั้งหมด', 'พนักงานทั่วไป (ESS)', 'หัวหน้างาน (Approval)', 'ฝ่ายบุคคล (HR)', 'ผู้ดูแลระบบ (Admin)'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuides.map((guide) => {
            const GuideIcon = guide.icon;
            // เช็คว่ามีสิทธิ์อย่างน้อย 1 สิทธิ์ใน requiredPermissions
            const hasAnyPerm =
              hasRole('ADMIN') ||
              hasRole('SYSTEM_SUPER') ||
              guide.requiredPermissions.some((perm) => hasPermission(perm) || mockPermissions[perm]);

            return (
              <div
                key={guide.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  hasAnyPerm
                    ? 'border-slate-200 dark:border-slate-700/70 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500'
                    : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                      <GuideIcon className="w-5 h-5" />
                    </div>
                    {hasAnyPerm ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" /> มีสิทธิ์ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-3 h-3" /> ล็อก (ไม่มีสิทธิ์)
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {guide.category}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {guide.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 truncate max-w-[150px]" title={guide.requiredPermissions.join(', ')}>
                    สิทธิ์: {guide.requiredPermissions[0]}
                  </div>

                  {hasAnyPerm ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<PlayCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      onClick={() => router.push(guide.route)}
                    >
                      เริ่มดูวิธีใช้งาน
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled className="text-slate-400 cursor-not-allowed">
                      ไม่มีสิทธิ์ใช้งาน
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
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
