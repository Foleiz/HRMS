'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  backHref?: string;
  backText?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'ไม่มีสิทธิ์เข้าถึงหน้านี้',
  message = 'ขออภัย บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงหรือดูข้อมูลในส่วนนี้ กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อขอสิทธิ์การใช้งาน',
  backHref = '/',
  backText = 'กลับไปยังหน้าหลัก',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2046] hover:bg-[#112d5e] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{backText}</span>
      </Link>
    </div>
  );
};

export default AccessDenied;
