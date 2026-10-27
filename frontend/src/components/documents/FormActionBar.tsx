'use client';

import React from 'react';

/** แถบปุ่มติดขอบล่างของฟอร์มยื่นเอกสาร — ปุ่มหลักอยู่ที่เดิมเสมอ (ใช้ร่วมทุกหน้าในหมวดยื่นเอกสาร) */
export function FormActionBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 px-1">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="text-sm text-slate-600 dark:text-slate-400 min-w-0">{note}</div>
        <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">{children}</div>
      </div>
    </div>
  );
}

export default FormActionBar;
