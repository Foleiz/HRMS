import React from 'react';
import { leaveColorVars } from '@/lib/leaveColors';

/** ป้ายชื่อประเภทการลาตามสีที่ตั้งไว้ในประเภทการลา */
export function LeaveTypeChip({ name, color, size = 'sm' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`leave-chip inline-flex items-center gap-2 rounded-full font-semibold ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={leaveColorVars(color) as React.CSSProperties}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export default LeaveTypeChip;
