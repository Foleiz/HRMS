'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import EmployeeDetailView from '@/components/employees/EmployeeDetailView';

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = Number(params.id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb({ section: 'พนักงาน', page: 'ดูข้อมูลพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    if (!employeeId || isNaN(employeeId)) {
      setErrorMessage('รหัสพนักงานไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const data = await employeeService.getById(employeeId);
        setEmployee(data);
      } catch (err: unknown) {
        console.error('Failed to load employee details:', err);
        const error = err as { message?: string };
        setErrorMessage(error?.message || 'ไม่สามารถโหลดข้อมูลพนักงานได้');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 dark:text-slate-400 font-sans">
        <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mb-3" />
        <p className="text-sm font-medium">กำลังโหลดข้อมูลพนักงาน...</p>
      </div>
    );
  }

  if (errorMessage || !employee) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1.5">ไม่พบข้อมูลพนักงาน</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{errorMessage || 'ไม่พบรายการข้อมูลพนักงานที่ต้องการดูในระบบ'}</p>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] text-white text-xs rounded-xl font-medium hover:bg-[#153468] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>กลับไปยังหน้ารายชื่อพนักงาน</span>
        </Link>
      </div>
    );
  }

  return (
    <EmployeeDetailView
      employee={employee}
      onEmployeeUpdate={setEmployee}
      editButtonLabel="แก้ไขข้อมูล"
    />
  );
}
