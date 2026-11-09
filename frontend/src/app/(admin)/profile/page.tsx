'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import EmployeeDetailView from '@/components/employees/EmployeeDetailView';
import { Loader2, AlertCircle } from 'lucide-react';
import { useOnboardingTour, type TourStep } from '@/hooks/useOnboardingTour';

const PROFILE_TOUR_STEPS: TourStep[] = [
  {
    element: '#tour-profile-card',
    popover: {
      title: '1. ข้อมูลสรุปและรูปโปรไฟล์',
      description: 'ตรวจสอบรหัสพนักงาน ชื่อ ตำแหน่ง และคลิกที่รูปภาพเพื่ออัปโหลดรูปถ่ายโปรไฟล์ของตนเอง',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-profile-tabs',
    popover: {
      title: '2. แท็บข้อมูลประวัติพนักงาน',
      description: 'เรียกดูและตรวจสอบข้อมูลติดต่อ ที่อยู่ บัญชีธนาคาร ประกันสังคม และประวัติการทำงานของคุณได้ที่นี่',
      side: 'bottom',
      align: 'start',
    },
  },
];

function ProfileContent() {
  const { user, hasPermission, hasRole, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tourParam = searchParams?.get('tour');
  const mockParam = searchParams?.get('mock');
  const isOnboardingFlow = tourParam === 'onboarding-1';
  const isDirectTour = tourParam === 'direct';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // เมื่อทัวร์หน้านี้จบ ให้ตรวจสอบสิทธิ์แล้วพาไปหน้าถัดไป
  const handleTourComplete = () => {
    if (!isOnboardingFlow) return;

    let mock: Record<string, boolean> = {};
    if (mockParam) {
      try {
        mock = JSON.parse(decodeURIComponent(mockParam));
      } catch (e) {}
    }

    const canViewTime =
      (mock['ESS_TIME_VIEW'] ?? true) &&
      (hasPermission('ESS_TIME_VIEW') ||
        hasRole('ADMIN') ||
        hasRole('SYSTEM_SUPER') ||
        Boolean(user?.employeeId));

    const canViewLeave =
      (mock['ESS_LEAVE_VIEW'] ?? true) &&
      (hasPermission('ESS_LEAVE_VIEW') ||
        hasPermission('ESS_DOCS_CREATE') ||
        hasRole('ADMIN') ||
        hasRole('SYSTEM_SUPER'));

    const mockQuery = mockParam ? `&mock=${encodeURIComponent(mockParam)}` : '';

    if (canViewTime) {
      router.push(`/ess/attendance?tour=onboarding-2${mockQuery}`);
    } else if (canViewLeave) {
      // ข้ามหน้า 2 ไปหน้า 3 อัตโนมัติ (หากไม่มีสิทธิ์หน้า 2)
      router.push(`/documents/leave?tour=onboarding-3${mockQuery}`);
    } else {
      router.push('/guide?completed=1');
    }
  };

  useOnboardingTour('profile-page', PROFILE_TOUR_STEPS, {
    autoStart: false,
    delayMs: 700,
    doneBtnText: isOnboardingFlow ? 'ไปยังขั้นตอนที่ 2: ตรวจบันทึกเวลา →' : 'เสร็จสิ้น ✨',
    triggerCondition: Boolean(employee && (isOnboardingFlow || isDirectTour)),
    onComplete: handleTourComplete,
  });

  useEffect(() => {
    setBreadcrumb({ section: 'โปรไฟล์', page: 'ข้อมูลพนักงาน' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user?.employeeId) {
      // บัญชีที่ไม่ได้ผูกกับพนักงาน — ไม่เดาเป็นพนักงานรหัส 1
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const fetchEmployeeData = async () => {
      setIsLoading(true);
      try {
        const data = await employeeService.getById(user.employeeId!);
        if (!cancelled) setEmployee(data);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Failed to load profile:', err);
        toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchEmployeeData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.employeeId, isAuthLoading]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-primary mx-auto" />
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
      editButtonLabel="แก้ไขข้อมูล"
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex h-[50vh] items-center justify-center text-xs text-slate-400">กำลังโหลด...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
