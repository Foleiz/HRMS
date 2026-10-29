'use client';

import React from 'react';

interface RequesterSummaryProps {
  fullName: string;
  positionTitle?: string | null;
  departmentName?: string | null;
  /** วันที่ยื่น — ไม่ส่ง = วันนี้ */
  date?: Date;
  /** ปุ่มชิดขวาบรรทัดเดียวกัน เช่น "ล้างฟอร์ม" */
  action?: React.ReactNode;
}

const thaiDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * แถบ "ยื่นในนาม" บรรทัดเดียว ใช้ทุกฟอร์มในหมวดยื่นเอกสาร
 * ข้อมูลที่ระบบรู้อยู่แล้วไม่ทำเป็นช่องกรอก — รายละเอียดเต็มอยู่ในตัวอย่างเอกสาร
 */
export function RequesterSummary({ fullName, positionTitle, departmentName, date, action }: RequesterSummaryProps) {
  const initial = fullName.replace(/^(นาย|นางสาว|นาง|Mr\.?|Mrs\.?|Ms\.?)\s*/i, '').trim().charAt(0) || '?';
  const parts = [positionTitle, departmentName, `วันที่ยื่น ${thaiDate(date ?? new Date())}`].filter(
    (p): p is string => !!p && p !== '-'
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-slate-600 dark:text-slate-400">
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-primary dark:text-slate-100 text-xs font-bold inline-flex items-center justify-center uppercase"
      >
        {initial}
      </span>
      <span>
        ยื่นในนาม <strong className="font-semibold text-slate-900 dark:text-slate-100">{fullName}</strong>
      </span>
      {parts.map((p) => (
        <React.Fragment key={p}>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span>{p}</span>
        </React.Fragment>
      ))}
    </div>
    {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default RequesterSummary;
