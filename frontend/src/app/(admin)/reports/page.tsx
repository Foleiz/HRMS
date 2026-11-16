'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
  CalendarX2,
  LayoutGrid,
  PieChart,
  Receipt,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import AccessDenied from '@/components/common/AccessDenied';
import ReportsHub from '@/components/reports/ReportsHub';
import EmployeesByDepartmentTab from '@/components/reports/EmployeesByDepartmentTab';
import AttendanceReportTab from '@/components/reports/AttendanceReportTab';
import LeaveSummaryReportTab from '@/components/reports/LeaveSummaryReportTab';
import TurnoverReportTab from '@/components/reports/TurnoverReportTab';
import TaxReportTab from '@/components/reports/TaxReportTab';

type ReportView = 'hub' | 'department' | 'attendance' | 'leave' | 'turnover' | 'tax';

interface NavPill {
  key: ReportView;
  label: string;
  icon: LucideIcon;
  dotColor: string;
  visible: boolean;
}

function ReportsPageContent() {
  const { hasPermission, hasRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // สิทธิ์การเข้าถึงแต่ละรายงาน
  const canViewHeadcount =
    hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportHeadcount =
    hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  const canViewLateness =
    hasPermission('REPORT_ATT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportLateness =
    hasPermission('REPORT_ATT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  const canViewAttendance = canViewHeadcount || canViewLateness;

  const canViewLeave =
    hasPermission('REPORT_LEAVE_VIEW') ||
    hasPermission('REPORT_LEAVE') ||
    hasPermission('REPORT_VIEW') ||
    hasRole('ADMIN') ||
    hasRole('SYSTEM_SUPER');

  const canViewTurnover =
    hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW') || hasRole('ADMIN');
  const canExportTurnover =
    hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || hasRole('ADMIN');

  const canViewTax =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_TAX_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW') ||
    hasRole('ADMIN');
  const canExportTax =
    hasPermission('PAYROLL_TAX_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    hasPermission('PAYROLL_EXPORT') ||
    hasRole('ADMIN');
  const canExportSso = canExportTax || hasPermission('PAYROLL_HR_VIEW');

  const canViewAnyReport =
    canViewHeadcount || canViewLateness || canViewLeave || canViewTurnover || canViewTax;

  const handleReportError = useCallback((message: string) => {
    toastRef.current.error(message);
  }, []);

  // แปลง query ?tab= เป็น view และโหมดเริ่มต้นของการเข้าออกงาน
  const resolveFromTabParam = useCallback(
    (tabParam: string | null): { view: ReportView; attMode: 'daily' | 'monthly' } => {
      if (tabParam === 'hub') return { view: 'hub', attMode: 'daily' };
      if (tabParam === 'department' && canViewHeadcount) return { view: 'department', attMode: 'daily' };
      if (tabParam === 'attendance' && canViewAttendance) {
        return { view: 'attendance', attMode: canViewHeadcount ? 'daily' : 'monthly' };
      }
      if (tabParam === 'headcount' && canViewAttendance) {
        return { view: 'attendance', attMode: 'daily' };
      }
      if (tabParam === 'lateness' && canViewAttendance) {
        return { view: 'attendance', attMode: 'monthly' };
      }
      if (tabParam === 'leave' && canViewLeave) return { view: 'leave', attMode: 'daily' };
      if (tabParam === 'turnover' && canViewTurnover) return { view: 'turnover', attMode: 'daily' };
      if (tabParam === 'tax' && canViewTax) return { view: 'tax', attMode: 'daily' };

      // ค่าเริ่มต้นเมื่อเข้ามาที่ /reports
      if (canViewHeadcount) return { view: 'department', attMode: 'daily' };
      if (canViewAttendance) return { view: 'attendance', attMode: 'monthly' };
      if (canViewLeave) return { view: 'leave', attMode: 'daily' };
      if (canViewTurnover) return { view: 'turnover', attMode: 'daily' };
      return { view: 'hub', attMode: 'daily' };
    },
    [canViewHeadcount, canViewAttendance, canViewLeave, canViewTurnover, canViewTax]
  );

  const initial = resolveFromTabParam(searchParams?.get('tab') ?? null);
  const [activeView, setActiveView] = useState<ReportView>(initial.view);
  const [attendanceMode, setAttendanceMode] = useState<'daily' | 'monthly'>(initial.attMode);

  useEffect(() => {
    const next = resolveFromTabParam(searchParams?.get('tab') ?? null);
    setActiveView(next.view);
    setAttendanceMode(next.attMode);
  }, [searchParams, resolveFromTabParam]);

  useEffect(() => {
    const titles: Record<ReportView, string> = {
      hub: 'ภาพรวมรายงาน',
      department: 'พนักงานแยกตามแผนก',
      attendance: 'การเข้าออกงาน',
      leave: 'การลา',
      turnover: 'อัตราการลาออก',
      tax: 'ภาษีและประกันสังคม',
    };
    setBreadcrumb({
      section: 'รายงาน',
      page: titles[activeView] || 'รายงาน',
    });
    return () => setBreadcrumb(null);
  }, [activeView, setBreadcrumb]);

  if (!canViewAnyReport) {
    return <AccessDenied message="คุณไม่มีสิทธิ์เข้าถึงรายงานสรุปและสถิติ" />;
  }

  const navPills: NavPill[] = [
    {
      key: 'hub',
      label: 'ภาพรวม',
      icon: LayoutGrid,
      dotColor: '#4f46e5',
      visible: true,
    },
    {
      key: 'department',
      label: 'พนักงานแยกตามแผนก',
      icon: PieChart,
      dotColor: '#2563eb',
      visible: canViewHeadcount,
    },
    {
      key: 'attendance',
      label: 'การเข้าออกงาน',
      icon: CalendarCheck,
      dotColor: '#059669',
      visible: canViewAttendance,
    },
    {
      key: 'leave',
      label: 'การลา',
      icon: CalendarX2,
      dotColor: '#7c3aed',
      visible: canViewLeave,
    },
    {
      key: 'turnover',
      label: 'อัตราการลาออก',
      icon: UserMinus,
      dotColor: '#e11d48',
      visible: canViewTurnover,
    },
    {
      key: 'tax',
      label: 'ภาษีและประกันสังคม',
      icon: Receipt,
      dotColor: '#d97706',
      visible: canViewTax && activeView === 'tax',
    },
  ];

  const switchView = (view: ReportView) => {
    setActiveView(view);
    router.push(`/reports?tab=${view}`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* แถบสลับรายงานด่วน (Quick Report Switcher) */}
      <div
        data-print-hide
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        {navPills
          .filter((p) => p.visible)
          .map((p) => {
            const Icon = p.icon;
            const isActive = activeView === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => switchView(p.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: isActive ? '#ffffff' : p.dotColor }}
                />
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{p.label}</span>
              </button>
            );
          })}
      </div>

      {/* เนื้อหารายงานแต่ละตัว */}
      {activeView === 'hub' && (
        <ReportsHub
          canDept={canViewHeadcount}
          canAttendance={canViewAttendance}
          canLeave={canViewLeave}
          canTurnover={canViewTurnover}
          canTax={canViewTax}
        />
      )}

      {activeView === 'department' && canViewHeadcount && (
        <EmployeesByDepartmentTab canExport={canExportHeadcount} onError={handleReportError} />
      )}

      {activeView === 'attendance' && canViewAttendance && (
        <AttendanceReportTab
          canViewDaily={canViewHeadcount}
          canViewMonthly={canViewLateness}
          canExportDaily={canExportHeadcount}
          canExportMonthly={canExportLateness}
          initialMode={attendanceMode}
        />
      )}

      {activeView === 'leave' && canViewLeave && (
        <LeaveSummaryReportTab canExport={canViewLeave} onError={handleReportError} />
      )}

      {activeView === 'turnover' && canViewTurnover && (
        <TurnoverReportTab canExport={canExportTurnover} />
      )}

      {activeView === 'tax' && canViewTax && (
        <TaxReportTab canExportTax={canExportTax} canExportSso={canExportSso} />
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageContent />
    </Suspense>
  );
}
