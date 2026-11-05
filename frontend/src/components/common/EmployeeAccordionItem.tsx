'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

const initialsOf = (name: string) => {
  const parts = (name || '')
    .trim()
    .replace(/^(นางสาว|นาย|นาง|น\.ส\.|Mr\.?|Mrs\.?|Ms\.?|Miss)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase() : 'EM';
};

/**
 * แถวพนักงานที่กดขยายดูรายละเอียดได้ (ยอดวันลา / ยอดสวัสดิการ / ปิดยอดสิ้นปี)
 *
 *   <EmployeeAccordionItem open={open} onToggle={toggle} name="..." code="EMP0001"
 *     subtitle="แผนก · ตำแหน่ง" metrics={<AccordionMetric label="คงเหลือรวม" value="10 วัน" />}>
 *     ...ตารางย่อย...
 *   </EmployeeAccordionItem>
 */
export function EmployeeAccordionItem({
  open,
  onToggle,
  name,
  code,
  avatar,
  tags,
  subtitle,
  metrics,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  name: string;
  code?: string;
  /** รูปโปรไฟล์ (ไม่ใส่ = ตัวย่อชื่อ) */
  avatar?: React.ReactNode;
  /** ป้ายเพิ่มเติมต่อจากรหัสพนักงาน */
  tags?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** ตัวเลขสรุปด้านขวา */
  metrics?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden bg-white dark:bg-slate-800 ${
        open
          ? 'border-blue-200 dark:border-blue-700 shadow-sm'
          : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronRight
            className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''}`}
          />
          {avatar ?? (
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm shadow-xs shrink-0 border border-blue-100 dark:border-blue-900">
              {initialsOf(name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{name}</span>
              {code && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {code}
                </span>
              )}
              {tags}
            </div>
            {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
        </div>
        {metrics && <div className="flex flex-wrap items-center gap-4 sm:gap-6 pl-8 sm:pl-0">{metrics}</div>}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/60 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

/** ตัวเลขสรุปหนึ่งช่องในแถวพนักงาน */
export function AccordionMetric({
  label,
  value,
  valueClassName = 'text-xs font-bold text-slate-800 dark:text-slate-200',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="text-left sm:text-right">
      <span className="text-[11px] text-slate-400 block">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

export default EmployeeAccordionItem;
