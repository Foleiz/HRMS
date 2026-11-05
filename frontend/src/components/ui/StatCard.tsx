import React from 'react';
import { CountUp } from './CountUp';

export type StatTone = 'slate' | 'sky' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';

const TONES: Record<StatTone, { card: string; label: string; value: string; icon: string }> = {
  slate: {
    card: 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700',
    label: 'text-slate-700 dark:text-slate-300',
    value: 'text-slate-900 dark:text-slate-100',
    icon: 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  },
  sky: {
    card: 'bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800',
    label: 'text-sky-800 dark:text-sky-300',
    value: 'text-sky-950 dark:text-sky-100',
    icon: 'bg-white dark:bg-sky-900/60 text-sky-600 dark:text-sky-300',
  },
  blue: {
    card: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800',
    label: 'text-blue-800 dark:text-blue-300',
    value: 'text-blue-950 dark:text-blue-100',
    icon: 'bg-white dark:bg-blue-900/60 text-blue-600 dark:text-blue-300',
  },
  emerald: {
    card: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
    label: 'text-emerald-800 dark:text-emerald-300',
    value: 'text-emerald-700 dark:text-emerald-300',
    icon: 'bg-white dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    card: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800',
    label: 'text-amber-800 dark:text-amber-300',
    value: 'text-amber-700 dark:text-amber-300',
    icon: 'bg-white dark:bg-amber-900/60 text-amber-600 dark:text-amber-400',
  },
  rose: {
    card: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800',
    label: 'text-rose-800 dark:text-rose-300',
    value: 'text-rose-700 dark:text-rose-300',
    icon: 'bg-white dark:bg-rose-900/60 text-rose-600 dark:text-rose-400',
  },
  purple: {
    card: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800',
    label: 'text-purple-800 dark:text-purple-300',
    value: 'text-purple-700 dark:text-purple-300',
    icon: 'bg-white dark:bg-purple-900/60 text-purple-600 dark:text-purple-400',
  },
};

/**
 * การ์ดสรุปตัวเลขหัวหน้า (KPI) — สี/ขนาดเดียวกันทั้งระบบ
 *
 *   <StatCard label="ประกาศทั้งหมด" value={12} icon={Megaphone} tone="sky" />
 *   <StatCard label="อนุมัติแล้ว" value={7} icon={CheckCircle2} tone="emerald" layout="inline" />
 *
 * - layout "stacked" (ค่าเริ่มต้น): ชื่อ + ไอคอนด้านบน ตัวเลขด้านล่าง
 * - layout "inline": ไอคอนซ้าย ชื่อกับตัวเลขขวา
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'slate',
  layout = 'stacked',
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ElementType;
  tone?: StatTone;
  layout?: 'stacked' | 'inline';
  /** บรรทัดเสริมใต้ตัวเลข */
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  const shown = typeof value === 'number' ? <CountUp value={value} /> : value;
  const card = `p-4 rounded-2xl border shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all ${t.card}`;

  if (layout === 'inline') {
    return (
      <div className={`${card} flex items-center gap-3.5`}>
        {Icon && (
          <div className={`w-10 h-10 rounded-full shadow-xs flex items-center justify-center shrink-0 ${t.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className={`text-xs font-bold truncate ${t.label}`}>{label}</div>
          <div className={`text-2xl font-black mt-0.5 ${t.value}`}>{shown}</div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold ${t.label}`}>{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-full shadow-xs flex items-center justify-center shrink-0 ${t.icon}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className={`mt-2 text-2xl font-black ${t.value}`}>{shown}</div>
      {children}
    </div>
  );
}

export default StatCard;
