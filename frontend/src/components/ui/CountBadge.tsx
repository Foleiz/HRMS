import React from 'react';

/**
 * ป้ายจำนวนรายการต่อท้ายหัวข้อตาราง เช่น "ทั้งหมด 25"
 *
 *   <h3>รายการมอบหมายกะพนักงานทั้งหมด</h3> <CountBadge count={rows.length} />
 */
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium whitespace-nowrap shrink-0 ${className}`}
    >
      ทั้งหมด {count.toLocaleString('th-TH')}
    </span>
  );
}

export default CountBadge;
