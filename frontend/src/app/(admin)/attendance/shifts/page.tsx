'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';

export default function ShiftsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/attendance/schedules?tab=shifts');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">กำลังนำท่านไปยังหน้า &quot;การจัดตารางงาน&quot;...</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        เมนูกะการทำงานได้ถูกรวมเข้ากับระบบการจัดตารางงานแบบครบวงจรเรียบร้อยแล้ว
      </p>
      <Link
        href="/attendance/schedules?tab=shifts"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
      >
        <span>ไปที่แท็บกะการทำงานทันที</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
