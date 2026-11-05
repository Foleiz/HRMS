'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

/** ความกว้างของแถบโครงร่างแต่ละแถว (ให้ดูเป็นข้อมูลจริง ไม่เท่ากันทุกแถว) */
const SKELETON_WIDTHS = [
  ['w-1/5', 'w-1/4', 'w-1/6'],
  ['w-1/4', 'w-1/5', 'w-1/5'],
  ['w-1/6', 'w-1/3', 'w-1/6'],
  ['w-1/5', 'w-1/5', 'w-1/4'],
  ['w-1/4', 'w-1/4', 'w-1/6'],
];

/**
 * แถว "กำลังโหลด" สำหรับตาราง — โครงร่างข้อมูลแบบเงาวิ่ง แทนวงกลมหมุน
 * ใช้ใน <tbody> แทนการเขียนเองทุกหน้า
 */
export function TableLoading({ colSpan, text = 'กำลังโหลดข้อมูล...', rows = 5 }: { colSpan: number; text?: string; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => {
        const [a, b2, c2] = SKELETON_WIDTHS[i % SKELETON_WIDTHS.length];
        return (
          <tr key={`skeleton-${i}`} aria-hidden={i > 0 ? true : undefined}>
            <td colSpan={colSpan} className="px-4 py-3.5">
              {i === 0 && <span className="sr-only" role="status">{text}</span>}
              <div className="flex items-center gap-4" style={{ opacity: 1 - i * 0.12 }}>
                <div className="skeleton-bar w-8 h-8 shrink-0" />
                <div className={`skeleton-bar h-3 ${a}`} />
                <div className={`skeleton-bar h-3 ${b2}`} />
                <div className={`skeleton-bar h-3 ${c2} ml-auto`} />
              </div>
            </td>
          </tr>
        );
      })}
    </>
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
      <td colSpan={colSpan} className="py-12 text-center text-slate-400 dark:text-slate-500 animate-in fade-in duration-300">
        <Inbox className="w-7 h-7 mx-auto mb-2 opacity-60" />
        <p className="text-sm">{text}</p>
        {action && <div className="mt-3">{action}</div>}
      </td>
    </tr>
  );
}
