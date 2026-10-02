'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import EmployeeDetailView from '@/components/employees/EmployeeDetailView';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setBreadcrumb({ section: 'โปรไฟล์', page: 'ข้อมูลพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  const fetchEmployeeData = async () => {
    setIsLoading(true);
    try {
      const targetId = user?.employeeId || 1;
      const data = await employeeService.getById(targetId);
      setEmployee(data);
    } catch (err: unknown) {
      console.error('Failed to load profile:', err);
      toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchEmployeeData();
    }
  }, [user?.employeeId, isAuthLoading]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-[#0B2046] mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1.5">ไม่พบข้อมูลโปรไฟล์</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">ไม่สามารถโหลดข้อมูลโปรไฟล์ผู้ใช้งานได้</p>
      </div>
    );
  }

  return (
    <EmployeeDetailView
      employee={employee}
      onEmployeeUpdate={setEmployee}
      isProfilePage={true}
      onEditClick={() => router.push(`/employees/${employee.id}/edit?from=profile`)}
      editButtonLabel="แก้ไขข้อมูล"
    />
  );
}
