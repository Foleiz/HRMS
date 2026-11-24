'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

function ReportsPageContent() {
  const { hasPermission, hasRole } = useAuth();
  const searchParams = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // สิทธิ์การเข้าถึงแต่ละรายงาน (อิงตามการตั้งค่าสิทธิ์ในตารางบทบาท)
  const canViewHeadcount =
    hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW');
  const canExportHeadcount =
    hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || canViewHeadcount;

  const canViewLateness =
    hasPermission('REPORT_ATT_VIEW') || hasPermission('REPORT_VIEW');
  const canExportLateness =
    hasPermission('REPORT_ATT_EXPORT') || hasPermission('REPORT_EXPORT') || canViewLateness;

  const canViewAttendance = canViewHeadcount || canViewLateness;

  const canViewLeave =
    hasPermission('REPORT_LEAVE_VIEW') ||
    hasPermission('REPORT_LEAVE') ||
    hasPermission('REPORT_VIEW');

  const canViewTurnover =
    hasPermission('REPORT_HEADCOUNT_VIEW') || hasPermission('REPORT_VIEW');
  const canExportTurnover =
    hasPermission('REPORT_HEADCOUNT_EXPORT') || hasPermission('REPORT_EXPORT') || canViewTurnover;

  const canViewTax =
    hasPermission('PAYROLL_VIEW') ||
    hasPermission('PAYROLL_TAX_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW');
  const canExportTax =
    hasPermission('PAYROLL_TAX_VIEW') ||
    hasPermission('PAYROLL_FINANCE_VIEW') ||
    hasPermission('PAYROLL_ADMIN_VIEW') ||
    hasPermission('PAYROLL_EXPORT');
  const canExportSso = canExportTax || hasPermission('PAYROLL_HR_VIEW');

  const canViewAnyReport =
    canViewHeadcount || canViewLateness || canViewLeave || canViewTurnover || canViewTax;

  const handleReportError = useCallback((message: string) => {
    toastRef.current.error(message);
  }, []);

  // แปลง query ?tab= เป็น view และโหมดเริ่มต้นของการเข้าออกงาน
  const resolveFromTabParam = useCallback(
    (tabParam: string | null): { view: ReportView; attMode: 'daily' | 'monthly' } => {
      if (!tabParam || tabParam === 'hub') return { view: 'hub', attMode: 'daily' };
      if (tabParam === 'department' && canViewHeadcount) return { view: 'department', attMode: 'daily' };
      if (tabParam === 'attendance' && canViewAttendance) {
        return { view: 'attendance', attMode: 'daily' };
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

      // ค่าเริ่มต้นเมื่อ tabParam ไม่ตรงกับสิทธิ์ที่กำหนด
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

  return (
    <div className="space-y-5 pb-12">
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
          canViewDaily={canViewHeadcount || canViewLateness}
          canViewMonthly={canViewLateness}
          canExportDaily={canExportHeadcount || canExportLateness}
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
