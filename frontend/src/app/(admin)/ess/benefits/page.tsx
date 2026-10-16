'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import { EmployeeBenefitsUsageTab } from '@/components/employees/EmployeeBenefitsUsageTab';
import { Gift, Loader2 } from 'lucide-react';

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
      {/* Main Content Area */}
      {effectiveEmployeeId ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-5 md:p-6 shadow-xs">
          <EmployeeBenefitsUsageTab
            key={effectiveEmployeeId}
            employeeId={effectiveEmployeeId}
            employeeName={effectiveEmployeeName}
            mode={effectiveEmployeeId === user?.employeeId ? 'self' : 'hr'}
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
