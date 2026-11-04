'use client';

import React from 'react';
import { Paperclip } from 'lucide-react';
import type { LeaveRequest } from '@/types/leave';

const thaiDay = (d?: string | null) => {
  if (!d) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  const dt = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** ป้าย "รอไฟล์แนบ" / "เกินกำหนดแนบไฟล์" / "มีไฟล์แนบแล้ว" ของใบลาหรือเอกสารแนบ */
export function DocumentDueBadge({
  leave,
  hasAttachments,
  onClick,
  className = 'mt-1',
}: {
  leave?: Pick<LeaveRequest, 'documentStatus' | 'documentDueDate'> | null;
  hasAttachments?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  // 1. ถ้ามีการแนบไฟล์แล้ว ให้เปลี่ยนข้อความเป็น "มีไฟล์แนบแล้ว" (แสดงผลอย่างเดียว กดไม่ได้)
  if (hasAttachments) {
    const badgeCls = `${className} inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 select-none cursor-default`;
    return (
      <span title="มีไฟล์แนบแล้ว" className={badgeCls}>
        <Paperclip className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>มีไฟล์แนบแล้ว</span>
      </span>
    );
  }

  // 2. ถ้ายังไม่แนบไฟล์ และมี documentStatus
  if (!leave?.documentStatus) return null;
  const overdue = leave.documentStatus === 'OVERDUE';
  const text = overdue ? 'เกินกำหนดแนบไฟล์' : `รอไฟล์แนบ ภายใน ${thaiDay(leave.documentDueDate)}`;
  const titleText = overdue
    ? 'เกินกำหนดแนบไฟล์ — คลิกเพื่อแนบเอกสารเพิ่ม'
    : `กำหนดแนบไฟล์ ${thaiDay(leave.documentDueDate)} — คลิกเพื่อแนบเอกสารเพิ่ม`;

  const badgeCls = `${className} inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${
    overdue
      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
      : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={titleText}
        className={`${badgeCls} ${
          overdue
            ? 'hover:bg-rose-100 hover:border-rose-300'
            : 'hover:bg-sky-100 hover:border-sky-300'
        } transition cursor-pointer hover:shadow-xs`}
      >
        <Paperclip className="w-3 h-3" />
        <span>{text}</span>
      </button>
    );
  }

  return (
    <span title={`กำหนดแนบไฟล์ ${thaiDay(leave.documentDueDate)}`} className={badgeCls}>
      <Paperclip className="w-3 h-3" />
      <span>{text}</span>
    </span>
  );
}

export default DocumentDueBadge;
