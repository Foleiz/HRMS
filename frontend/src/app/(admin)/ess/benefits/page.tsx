'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import { EmployeeBenefitsUsageTab } from '@/components/employees/EmployeeBenefitsUsageTab';
import { Gift, User, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

export default function MyBenefitsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const searchParams = useSearchParams();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // Set breadcrumb
  useEffect(() => {
    setBreadcrumb({
      section: 'บริการตนเอง (ESS)',
      page: 'สวัสดิการของฉัน',
    });
  }, [setBreadcrumb]);

  // Determine initial selected employee (from query param or current user)
  useEffect(() => {
    const paramId = searchParams.get('employeeId');
    if (paramId) {
      setSelectedEmployeeId(Number(paramId));
    } else if (user?.employeeId) {
      setSelectedEmployeeId(user.employeeId);
    }
  }, [searchParams, user]);

  // Fetch selected employee details
  useEffect(() => {
    if (!selectedEmployeeId) return;

    let isMounted = true;
    setLoadingEmployee(true);

    employeeService
      .getById(selectedEmployeeId)
      .then((emp: Employee) => {
        if (isMounted) setSelectedEmployee(emp);
      })
      .catch((err: unknown) => {
        console.error('Error fetching employee:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingEmployee(false);
      });


    return () => {
      isMounted = false;
    };
  }, [selectedEmployeeId]);

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 dark:text-slate-400 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2046] dark:text-cyan-400 mb-2" />
        <p className="text-xs font-medium">กำลังเตรียมข้อมูลผู้ใช้งาน...</p>
      </div>
    );
  }

  const effectiveEmployeeId = selectedEmployeeId || user?.employeeId;
  const effectiveEmployeeName = selectedEmployee?.fullName || user?.fullName || 'พนักงาน';

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header Banner */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-[#0B2046] via-[#153468] to-[#1e448b] text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Gift className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold tracking-tight">สวัสดิการของฉัน (My Benefits)</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-cyan-200 border border-white/20">
                  ESS Portal
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                ตรวจสอบวงเงินสวัสดิการ สิทธิ์คงเหลือรายปี บันทึกการขอใช้สิทธิ์ และประวัติการเบิกจ่าย
              </p>
            </div>
          </div>
        </div>

        {/* Employee Info Bar */}
        {selectedEmployee && (
          <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-blue-100/90">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-semibold text-white">{selectedEmployee.fullName}</span>
              <span className="font-mono text-cyan-200">({selectedEmployee.employeeCode})</span>
            </div>
            <div>
              <span className="text-blue-200">ตำแหน่ง:</span>{' '}
              <span className="font-medium text-white">{selectedEmployee.positionName || '-'}</span>
            </div>
            <div>
              <span className="text-blue-200">ฝ่าย/แผนก:</span>{' '}
              <span className="font-medium text-white">
                {selectedEmployee.divisionName || selectedEmployee.departmentName || '-'}
              </span>
            </div>
            <div className="ml-auto">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                {selectedEmployee.employeeType || 'พนักงานประจำ'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {effectiveEmployeeId ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-5 md:p-6 shadow-xs">
          <EmployeeBenefitsUsageTab
            key={effectiveEmployeeId}
            employeeId={effectiveEmployeeId}
            employeeName={effectiveEmployeeName}
          />
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Gift className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            ไม่พบข้อมูลพนักงานที่ผูกกับบัญชีผู้ใช้นี้
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            กรุณาติดต่อผู้ดูแลระบบ (HR/Admin) เพื่อผูกบัญชีผู้ใช้เข้ากับประวัติพนักงาน
          </p>
        </div>
      )}
    </div>
  );
}
