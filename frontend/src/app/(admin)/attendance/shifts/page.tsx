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
      <Loader2 className="w-8 h-8 animate-spin text-[#0B2046] mb-4" />
      <h2 className="text-lg font-bold text-slate-800 mb-1">กำลังนำท่านไปยังหน้า "การจัดตารางงาน"...</h2>
      <p className="text-sm text-slate-500 mb-4">
        เมนูกะการทำงานได้ถูกรวมเข้ากับระบบการจัดตารางงานแบบครบวงจรเรียบร้อยแล้ว
      </p>
      <Link
        href="/attendance/schedules?tab=shifts"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] text-white rounded-lg text-sm font-medium hover:bg-[#0B2046]/90 transition shadow-sm"
      >
        <span>ไปที่แท็บกะการทำงานทันที</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
