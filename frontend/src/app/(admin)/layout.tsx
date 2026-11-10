'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlobalWizardTour } from '@/components/common/GlobalWizardTour';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // แสดง Loading ระหว่างตรวจสอบเซสชัน
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  // หากยังไม่ได้เข้าสู่ระบบ ไม่เรนเดอร์เนื้อหาภายใน
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Suspense fallback={<aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shrink-0" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
          <Suspense fallback={null}>
            <GlobalWizardTour />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
