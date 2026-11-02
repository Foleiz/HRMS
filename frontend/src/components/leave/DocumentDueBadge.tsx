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

/** ป้าย "รอเอกสาร" / "เกินกำหนดแนบเอกสาร" ของใบลาที่นโยบายให้แนบเอกสารภายหลังได้ */
export function DocumentDueBadge({ leave, className = 'mt-1' }: { leave?: Pick<LeaveRequest, 'documentStatus' | 'documentDueDate'> | null; className?: string }) {
  if (!leave?.documentStatus) return null;
  const overdue = leave.documentStatus === 'OVERDUE';
  return (
    <span
      title={`กำหนดแนบเอกสาร ${thaiDay(leave.documentDueDate)}`}
      className={`${className} inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${
        overdue
          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
          : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
      }`}
    >
      <Paperclip className="w-3 h-3" />
      {overdue ? 'เกินกำหนดแนบเอกสาร' : `รอเอกสาร ภายใน ${thaiDay(leave.documentDueDate)}`}
    </span>
  );
}

export default DocumentDueBadge;
