'use client';

import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

/** แถว "กำลังโหลด" สำหรับตาราง — ใช้ใน <tbody> แทนการเขียนเองทุกหน้า */
export function TableLoading({ colSpan, text = 'กำลังโหลดข้อมูล...' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-slate-400 dark:text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046] dark:text-blue-400" />
        <span className="text-sm">{text}</span>
      </td>
    </tr>
  );
}

/** แถว "ไม่มีข้อมูล" สำหรับตาราง */
export function TableEmpty({
  colSpan,
  text = 'ไม่พบข้อมูล',
  action,
}: {
  colSpan: number;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-slate-400 dark:text-slate-500">
        <Inbox className="w-7 h-7 mx-auto mb-2 opacity-60" />
        <p className="text-sm">{text}</p>
        {action && <div className="mt-3">{action}</div>}
      </td>
    </tr>
  );
}
