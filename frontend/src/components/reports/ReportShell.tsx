'use client';

/**
 * ชุด UI กลางของหน้ารายงานทุกตัว (Report Shell)
 * โครงสร้างมาตรฐาน: Hero → FilterBar → KPI Cards → Insights → Panels(กราฟ) → ตารางรายละเอียด
 * ทุกรายงานใช้ชุดนี้ร่วมกัน เปลี่ยนเฉพาะ theme สี ตัวกรอง และเนื้อหา
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calculator,
  Database,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import {
  AvatarName,
  RefreshIndicator,
  TableEmpty,
  TableLoading,
  TablePagination,
  TableToolbar,
} from '@/components/ui';

export { AvatarName, TableEmpty, TableLoading };

/* ───────────────────────── Theme ───────────────────────── */
export type ReportThemeKey = 'dept' | 'attendance' | 'leave' | 'turnover' | 'tax';

export interface ReportTheme {
  gradient: string;
  accent: string;
  /** สี hex สำหรับ SVG / inline style */
  hex: string;
}

export const REPORT_THEMES: Record<ReportThemeKey, ReportTheme> = {
  dept: { gradient: 'linear-gradient(120deg,#1d4ed8,#6366f1)', accent: 'text-blue-600 dark:text-blue-300', hex: '#2563eb' },
  attendance: { gradient: 'linear-gradient(120deg,#059669,#14b8a6)', accent: 'text-emerald-600 dark:text-emerald-300', hex: '#059669' },
  leave: { gradient: 'linear-gradient(120deg,#7c3aed,#d946ef)', accent: 'text-violet-600 dark:text-violet-300', hex: '#7c3aed' },
  turnover: { gradient: 'linear-gradient(120deg,#e11d48,#f97316)', accent: 'text-rose-600 dark:text-rose-300', hex: '#e11d48' },
  tax: { gradient: 'linear-gradient(120deg,#b45309,#f59e0b)', accent: 'text-amber-600 dark:text-amber-300', hex: '#d97706' },
};

export type KpiTone = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';

const TONES: Record<KpiTone, { box: string; hex: string }> = {
  blue: { box: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300', hex: '#2563eb' },
  violet: { box: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300', hex: '#7c3aed' },
  emerald: { box: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300', hex: '#059669' },
  amber: { box: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300', hex: '#d97706' },
  rose: { box: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300', hex: '#e11d48' },
  slate: { box: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', hex: '#64748b' },
  sky: { box: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300', hex: '#0284c7' },
};

/* ───────────────────────── Hero ───────────────────────── */
export function ReportHero({
  theme,
  icon: Icon,
  title,
  description,
  actions,
}: {
  theme: ReportThemeKey;
  icon: LucideIcon;
  title: string;
  description: string;
  /** ส่วนควบคุมด้านขวา เช่น สวิตช์ รายวัน/รายเดือน */
  actions?: React.ReactNode;
}) {
  const t = REPORT_THEMES[theme];
  return (
    <div data-print-hide className="relative overflow-hidden rounded-[22px] p-5 text-white md:p-6" style={{ background: t.gradient }}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-44 w-44 rounded-full bg-white/10" />
      <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold md:text-2xl">{title}</h2>
            <p className="mt-0.5 max-w-xl text-sm text-white/80">{description}</p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 text-xs">{actions}</div>}
      </div>
    </div>
  );
}

/** สวิตช์สลับมุมมองบน Hero (พื้นหลังโปร่งแสง) */
export function HeroSwitch<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-xl bg-white/20 p-1 backdrop-blur">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Filter bar ───────────────────────── */
export function ReportFilterBar({
  children,
  right,
  loading,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      data-print-hide
      className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center"
    >
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/** ช่องตัวกรองแบบชิป: ไอคอน + ป้าย + ตัวควบคุม */
export function FilterChip({
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/60">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      {label && <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
      {children}
    </div>
  );
}

/* ───────────────────────── KPI ───────────────────────── */
export function Sparkline({ values, color, width = 84, height = 30 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const mx = Math.max(...values);
  const mn = Math.min(...values);
  const pts = values.map((v, i) => [(i * width) / (values.length - 1), height - 3 - ((v - mn) / (mx - mn || 1)) * (height - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={`${d} L${width} ${height} L0 ${height}Z`} fill={color} opacity={0.13} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ป้ายเปรียบเทียบกับช่วงก่อนหน้า  good=true → สีเขียว, false → สีแดง */
export function DeltaBadge({ delta, unit = '', good, invert = false }: { delta: number; unit?: string; good?: boolean; invert?: boolean }) {
  if (!Number.isFinite(delta) || delta === 0) {
    return <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800">คงที่</span>;
  }
  const up = delta > 0;
  // invert: ค่าที่ "ลดลง" ถือว่าดี (เช่น มาสาย ลาออก)
  const isGood = good ?? (invert ? !up : up);
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
        isGood ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {Number.isInteger(delta) ? delta : delta.toFixed(1)}
      {unit}
    </span>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  tone = 'blue',
  delta,
  note,
  source,
  formula,
  spark,
  className = '',
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: KpiTone;
  /** ป้ายเปรียบเทียบ (ส่ง <DeltaBadge/>) — แสดงในกล่องคำอธิบายเมื่อชี้เมาส์ */
  delta?: React.ReactNode;
  /** ข้อมูลประกอบเพิ่มเติม — แสดงในกล่องคำอธิบายเมื่อชี้เมาส์ */
  note?: React.ReactNode;
  /** ที่มาของข้อมูลตัวเลขที่แสดง */
  source?: React.ReactNode;
  /** สูตรการคำนวณ หรือหลักการคิดคำนวณ */
  formula?: React.ReactNode;
  spark?: number[];
  className?: string;
}) {
  const t = TONES[tone];
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const hasTooltip = Boolean(source || formula || note || delta);

  const showTooltip = useCallback(() => {
    const el = cardRef.current;
    if (!el || !hasTooltip) return;
    const r = el.getBoundingClientRect();
    const tooltipWidth = 320;
    const estHeight = 190;
    const above = r.bottom + 10 + estHeight > window.innerHeight && r.top - 10 - estHeight > 0;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - tooltipWidth - 12));
    setPos({
      left,
      top: above ? r.top - 10 : r.bottom + 10,
      above,
    });
  }, [hasTooltip]);

  const hideTooltip = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, [pos, hideTooltip]);

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={hasTooltip ? 0 : undefined}
        className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-slate-300 hover:shadow-md focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 ${
          hasTooltip ? 'cursor-help' : ''
        } ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.box}`}>
            <Icon className="h-5 w-5" />
          </div>
          {spark && spark.length > 1 && <Sparkline values={spark} color={t.hex} />}
        </div>
        <div className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[28px] font-extrabold leading-9 text-slate-900 dark:text-slate-100">{value}</span>
          {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
        </div>
      </div>

      {pos &&
        hasTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              transform: pos.above ? 'translateY(-100%)' : undefined,
            }}
            className="pointer-events-none z-[120] w-80 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-700/70">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.box}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{label}</span>
              </div>
              <div className="shrink-0 flex items-baseline gap-1">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{value}</span>
                {unit && <span className="text-[11px] text-slate-400">{unit}</span>}
              </div>
            </div>

            <div className="mt-2.5 space-y-2 text-xs">
              {source && (
                <div className="flex items-start gap-2">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">ที่มาของตัวเลข</div>
                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{source}</div>
                  </div>
                </div>
              )}

              {formula && (
                <div className="flex items-start gap-2">
                  <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">สูตร / หลักการคำนวณ</div>
                    <div className="mt-1 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                      {formula}
                    </div>
                  </div>
                </div>
              )}

              {(delta || note) && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                  {delta}
                  {note && <span>{note}</span>}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 5 }) {
  const cls = cols === 5 ? 'xl:grid-cols-5' : cols === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4';
  return <div className={`grid grid-cols-2 gap-4 ${cls}`}>{children}</div>;
}

/* ───────────────────────── Panel / Insights ───────────────────────── */
export function ReportPanel({
  title,
  subtitle,
  right,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle && <div className="mt-0.5 text-[11px] text-slate-400">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function InsightBox({ items, theme }: { items: React.ReactNode[]; theme: ReportThemeKey }) {
  if (items.length === 0) return null;
  const hex = REPORT_THEMES[theme].hex;
  return (
    <div className="rounded-2xl border p-4" style={{ background: `${hex}0f`, borderColor: `${hex}33` }}>
      <div className="mb-2 flex items-center gap-2 text-sm font-extrabold" style={{ color: hex }}>
        <Sparkles className="h-4 w-4" /> ข้อสังเกตอัตโนมัติ
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((t, i) => (
          <div key={i} className="rounded-xl border border-white bg-white/80 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Small widgets ───────────────────────── */
/** รายการแท่งแนวนอน (อันดับ/สัดส่วน) */
export function BarList({
  items,
  color = '#3b82f6',
  max,
  emptyText = 'ไม่มีข้อมูล',
}: {
  items: { label: string; value: number; display?: string; color?: string; sub?: string }[];
  color?: string;
  max?: number;
  emptyText?: string;
}) {
  if (items.length === 0) return <div className="py-8 text-center text-xs text-slate-400">{emptyText}</div>;
  const m = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate pr-2 font-semibold text-slate-700 dark:text-slate-200">
              {i.label}
              {i.sub && <span className="ml-1.5 font-normal text-slate-400">{i.sub}</span>}
            </span>
            <span className="shrink-0 font-bold text-slate-900 dark:text-slate-100">{i.display ?? i.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (i.value / m) * 100))}%`, background: i.color || color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** แท่งแนวตั้งง่ายๆ พร้อมป้ายค่า (ใช้กับการกระจายเป็นช่วง) */
export function MiniColumns({
  items,
  color = '#38bdf8',
  highlightIndex,
  highlightColor = '#2563eb',
  height = 150,
}: {
  items: { label: string; value: number }[];
  color?: string;
  highlightIndex?: number;
  highlightColor?: string;
  height?: number;
}) {
  const mx = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {items.map((it, i) => (
        <div key={it.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{it.value}</span>
          <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: (it.value / mx) * (height - 40), minHeight: it.value > 0 ? 3 : 0, background: i === highlightIndex ? highlightColor : color }} />
          <span className="text-center text-[10px] leading-tight text-slate-400">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

const AVATAR_BG = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
export function ReportAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const clean = name.replace(/^(นาย|นางสาว|นาง|น\.ส\.)\s*/, '').trim();
  const ch = clean.charAt(0) || '?';
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: AVATAR_BG[ch.charCodeAt(0) % AVATAR_BG.length] }}
    >
      {ch}
    </span>
  );
}

export function ReportLoading({ text = 'กำลังโหลดรายงาน...' }: { text?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary dark:text-blue-300" />
      {text}
    </div>
  );
}

export function ReportEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
      {text}
    </div>
  );
}

/** ปุ่มคำสั่งข้างตัวกรอง (เช่น รีเฟรช) */
export function IconButton({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

export interface ReportTableCardProps {
  /** ค่าค้นหาใน TableToolbar (ถ้าส่งมาจะแสดงช่องค้นหาด้านซ้ายสุดของตาราง) */
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  /** ตัวกรองเพิ่มเติมใน TableToolbar (ต่อจากช่องค้นหา) */
  filters?: React.ReactNode;
  /** ปุ่มหรือองค์ประกอบด้านขวาใน TableToolbar */
  actions?: React.ReactNode;
  /** สถานะกำลังรีเฟรชข้อมูล */
  refreshing?: boolean;
  /** ความกว้างขั้นต่ำของตาราง เช่น min-w-[880px] */
  minWidthClassName?: string;
  /** เนื้อหาภายใน <table> (<thead>...</thead><tbody>...</tbody><tfoot>...</tfoot>) */
  children: React.ReactNode;
  /** ข้อมูลการแบ่งหน้า (TablePagination มาตรฐานของระบบ) */
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
    totalLabel?: string;
  };
}

/**
 * การ์ดตารางมาตรฐานกลางสำหรับรายงาน — ใช้โครงสร้างและ Component เดียวกับส่วนอื่นของระบบ:
 * [TableToolbar] -> [RefreshIndicator] -> [table.table-standard] -> [TablePagination]
 */
export function ReportTableCard({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'ค้นหา...',
  filters,
  actions,
  refreshing = false,
  minWidthClassName = 'min-w-[850px]',
  children,
  pagination,
}: ReportTableCardProps) {
  const showToolbar = searchValue !== undefined || filters !== undefined || actions !== undefined;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
      {showToolbar && (
        <div data-print-hide>
          <TableToolbar
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            filters={filters}
            actions={actions}
          />
        </div>
      )}

      <RefreshIndicator active={refreshing} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className={`table-standard w-full ${minWidthClassName} text-left text-xs border-collapse whitespace-nowrap`}>
          {children}
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div data-print-hide>
          <TablePagination
            total={pagination.total}
            page={pagination.page}
            pageSize={pagination.pageSize}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            pageSizeOptions={pagination.pageSizeOptions}
            totalLabel={pagination.totalLabel}
          />
        </div>
      )}
    </div>
  );
}
