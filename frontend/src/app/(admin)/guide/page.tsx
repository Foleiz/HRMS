'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useAuth } from '@/context/AuthContext';
import { isPathAccessible, getPayrollViewAccess } from '@/lib/routePermissions';
import { Inbox } from 'lucide-react';
import { Button, TableToolbar } from '@/components/ui';
import { WIZARD_FLOWS } from '@/config/wizardTours';

interface GuideItem {
  id: string;
  title: string;
  stepCount: number;
  icon: React.ElementType;
  route: string;
}

const GUIDE_FLOW_PERMISSIONS: Record<string, string[]> = {
  'hr-onboarding': ['GUIDE_ONBOARDING_VIEW'],
  'payroll-cycle-hr': ['GUIDE_PAYROLL_HR_VIEW'],
  'payroll-cycle-finance': ['GUIDE_PAYROLL_FINANCE_VIEW'],
  'payroll-cycle-ceo': ['GUIDE_PAYROLL_CEO_VIEW'],
  'payroll-cycle-bank': ['GUIDE_PAYROLL_FINANCE_VIEW'],
  'payroll-cycle': ['GUIDE_PAYROLL_HR_VIEW'],
  'offboarding': ['GUIDE_OFFBOARDING_VIEW'],
  'shift-schedule': ['GUIDE_SHIFT_SCHEDULE_VIEW'],
  'attendance-import': ['GUIDE_ATTENDANCE_IMPORT_VIEW'],
  'transfer-flow': ['GUIDE_TRANSFER_VIEW'],
  'leave-setup': ['GUIDE_LEAVE_SETUP_VIEW'],
  'leave-approval': ['GUIDE_LEAVE_APPROVAL_VIEW'],
  'company-setup': ['GUIDE_COMPANY_SETUP_VIEW'],
};

const GUIDE_FLOW_STEP_MODULES: Record<string, string[]> = {
  'hr-onboarding': ['EMP_PROFILE', 'EMP_CONTRACT', 'SETTINGS_USERS'],
  'payroll-cycle-hr': ['TIME_DAILY', 'PAYROLL_CALC'],
  'payroll-cycle-finance': ['PAYROLL_CALC'],
  'payroll-cycle-ceo': ['PAYROLL_CALC'],
  'payroll-cycle-bank': ['PAYROLL_CALC'],
  'payroll-cycle': ['TIME_DAILY', 'PAYROLL_CALC'],
  'offboarding': ['ESS_RESIGN', 'ESS_DOCS', 'EMP_CONTRACT', 'SETTINGS_USERS'],
  'shift-schedule': ['TIME_SCHEDULE', 'TIME_DAILY'],
  'attendance-import': ['TIME_IMPORT', 'TIME_DAILY'],
  'transfer-flow': ['EMP_TRANSFER', 'EMP_CONTRACT', 'ORG_CHART'],
  'leave-setup': ['LEAVE_TYPE', 'WORK_CALENDAR', 'LEAVE_BALANCE'],
  'leave-approval': ['APPROVAL_LEAVE', 'LEAVE_BALANCE'],
  'company-setup': ['MASTER_DATA', 'WORK_CALENDAR', 'ORG_STRUCT'],
};

const PARENT_PERM_MAP: Record<string, string> = {
  EMP_PROFILE: 'EMP_VIEW',
  EMP_CONTRACT: 'EMP_VIEW',
  EMP_TRANSFER: 'EMP_VIEW',
  SETTINGS_USERS: 'SETTINGS_VIEW',
  TIME_DAILY: 'TIME_VIEW',
  TIME_SCHEDULE: 'TIME_VIEW',
  TIME_IMPORT: 'TIME_VIEW',
  PAYROLL_CALC: 'PAYROLL_VIEW',
  ESS_DOCS: 'DOCS_VIEW',
  ESS_RESIGN: 'ESS_RESIGN_VIEW',
  LEAVE_TYPE: 'LEAVE_VIEW',
  LEAVE_BALANCE: 'LEAVE_VIEW',
  APPROVAL_LEAVE: 'APPROVALS_VIEW',
  ORG_STRUCT: 'ORG_VIEW',
};

function GuidePageContent() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { user, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setBreadcrumb({ page: 'วิธีการใช้งาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // กรองเฉพาะคู่มือที่ผู้ใช้งานมีสิทธิ์เข้าถึงครบทุกขั้นตอนเท่านั้น (หากสิทธิ์ไม่ครบทุกขั้นตอน จะถือว่าคู่มือนั้นไม่ได้ใช้งาน)
  const roleAccessibleItems = useMemo<GuideItem[]>(() => {
    const payrollAccess = getPayrollViewAccess(user);

    return WIZARD_FLOWS.map((flow) => {
      // 1. ตรวจสอบสิทธิ์ระดับ Flow ไกด์ (GUIDE_xxx_VIEW) ต้องมีสิทธิ์เปิดใช้งานอยู่เสมอ
      const flowPerms = GUIDE_FLOW_PERMISSIONS[flow.id];
      if (
        flowPerms &&
        flowPerms.length > 0 &&
        !flowPerms.some((p) => hasPermission(p) || (p.startsWith('GUIDE_PAYROLL_') && hasPermission('GUIDE_PAYROLL_VIEW')))
      ) {
        return null;
      }

      // 2. ตรวจสอบสิทธิ์โมดูลย่อยของแต่ละขั้นตอนในคู่มือ (หากติ๊กสิทธิ์ขั้นตอนไม่ครบ ให้ถือว่าคู่มือนั้นไม่ถูกใช้งาน)
      const stepModules = GUIDE_FLOW_STEP_MODULES[flow.id];
      if (stepModules && stepModules.length > 0) {
        const hasAllStepPerms = stepModules.every((modCode) => {
          if (hasPermission(`${modCode}_VIEW`)) return true;
          const parentPerm = PARENT_PERM_MAP[modCode];
          if (parentPerm && hasPermission(parentPerm)) return true;
          return false;
        });
        if (!hasAllStepPerms) return null;
      }

      // 3. ตรวจสอบสิทธิ์เฉพาะด้าน Payroll View
      if (user && flow.requiredPayrollView) {
        if (flow.requiredPayrollView === 'HR' && !payrollAccess.canAccessHrView) return null;
        if (flow.requiredPayrollView === 'FINANCE' && !payrollAccess.canAccessFinanceView) return null;
        if (flow.requiredPayrollView === 'APPROVER' && !payrollAccess.canAccessApproverView) return null;
        if (flow.requiredPayrollView === 'BANK' && !payrollAccess.canAccessBankView) return null;
      }

      // 4. ตรวจสอบสิทธิ์การเข้าถึงหน้า (Route Access)
      const accessiblePages = flow.pages.filter((page) => {
        if (!user) return true;
        const cleanPath = page.route.split('?')[0];
        return isPathAccessible(cleanPath, user).allowed;
      });

      // หากขั้นตอนในคู่มือเข้าถึงได้ไม่ครบทุกขั้นตอน ให้ถือว่าคู่มือนั้นไม่ถูกใช้งาน
      if (accessiblePages.length < flow.pages.length) return null;

      return {
        id: flow.id,
        title: flow.title,
        stepCount: accessiblePages.length,
        icon: flow.icon,
        route: accessiblePages[0].route,
      };
    }).filter((item): item is GuideItem => item !== null);
  }, [user, hasPermission]);

  // กรองคู่มือตามคำค้นหา
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roleAccessibleItems;
    return roleAccessibleItems.filter((item) =>
      item.title.toLowerCase().includes(q)
    );
  }, [searchQuery, roleAccessibleItems]);

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
