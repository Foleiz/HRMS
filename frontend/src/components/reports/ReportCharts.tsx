'use client';

/**
 * กราฟสำหรับหน้ารายงาน (SVG/HTML ล้วน ไม่ใช้ไลบรารี)
 * - สีใช้ตัวแปร --viz-* จาก globals.css (มีชุดสีโหมดมืดแยก)
 * - ทุกกราฟมี tooltip เมื่อชี้ และมี legend/ป้ายกำกับ ไม่ใช้สีอย่างเดียวสื่อความหมาย
 */
import React, { useRef, useState } from 'react';

export const VIZ = {
  s1: 'var(--viz-s1)',
  s2: 'var(--viz-s2)',
  s3: 'var(--viz-s3)',
  good: 'var(--viz-good)',
  warning: 'var(--viz-warning)',
  serious: 'var(--viz-serious)',
  critical: 'var(--viz-critical)',
  neutral: 'var(--viz-neutral)',
} as const;

export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const nf = new Intl.NumberFormat('th-TH');
export const fmtNumber = (v: number) => nf.format(v);
export const fmtBaht = (v: number) => `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(v)} บาท`;
const fmtCompact = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K` : `${Math.round(v)}`;

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
interface TipState {
  x: number;
  y: number;
  content: React.ReactNode;
}

function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (e: React.MouseEvent, content: React.ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content });
  };
  const hide = () => setTip(null);
  const node = tip ? (
    <div
      className="pointer-events-none absolute z-20 min-w-[140px] max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-lg"
      style={{ left: tip.x + 12, top: tip.y + 12, transform: tip.x > (ref.current?.clientWidth ?? 0) - 200 ? 'translateX(calc(-100% - 24px))' : undefined }}
    >
      {tip.content}
    </div>
  ) : null;
  return { ref, show, hide, node };
}

export function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <Swatch color={it.color} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        {color && <Swatch color={color} />}
        {label}
      </span>
      <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1) แถบสัดส่วนแนวนอน (100%) ต่อแถว — เช่น สถานะการมาทำงานรายแผนก
// ---------------------------------------------------------------------------
export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function ProportionBars({
  rows,
  unit = 'คน',
}: {
  rows: { id: string | number; label: string; sub?: string; segments: Segment[] }[];
  unit?: string;
}) {
  const tt = useTooltip();
  return (
    <div ref={tt.ref} className="relative space-y-2.5" onMouseLeave={tt.hide}>
      {rows.map((row) => {
        const total = row.segments.reduce((s, x) => s + x.value, 0);
        const rowTip = (
          <div>
            <div className="mb-1 font-semibold text-slate-900">{row.label}</div>
            {row.segments.map((s) => (
              <TipRow key={s.key} color={s.color} label={s.label} value={`${fmtNumber(s.value)} ${unit}`} />
            ))}
          </div>
        );
        return (
          <div key={row.id} className="flex items-center gap-3" onMouseMove={(e) => tt.show(e, rowTip)}>
            <div className="w-44 shrink-0 truncate text-xs">
              <span className="font-medium text-slate-800">{row.label}</span>
              {row.sub && <span className="ml-1 text-[10px] text-slate-400">{row.sub}</span>}
            </div>
            <div className="flex h-3.5 flex-1 gap-[2px] overflow-hidden rounded-full bg-slate-100">
              {total > 0 &&
                row.segments
                  .filter((s) => s.value > 0)
                  .map((s) => <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
            </div>
            <div className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
              {fmtNumber(total)} {unit}
            </div>
          </div>
        );
      })}
      {tt.node}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2) อันดับแนวนอน — เช่น 10 อันดับคนที่มาสายบ่อย
// ---------------------------------------------------------------------------
export function RankBars({
  items,
  color = VIZ.s1,
  emptyText = 'ไม่มีข้อมูล',
}: {
  items: { id: string | number; label: string; sub?: string; value: number; valueLabel: string; tip?: React.ReactNode }[];
  color?: string;
  emptyText?: string;
}) {
  const tt = useTooltip();
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <div className="py-8 text-center text-xs text-slate-400">{emptyText}</div>;
  return (
    <div ref={tt.ref} className="relative space-y-2" onMouseLeave={tt.hide}>
      {items.map((it, idx) => (
        <div key={it.id} className="flex items-center gap-3" onMouseMove={(e) => it.tip && tt.show(e, it.tip)}>
          <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-400">{idx + 1}</span>
          <div className="w-40 shrink-0 truncate text-xs">
            <span className="font-medium text-slate-800">{it.label}</span>
            {it.sub && <div className="truncate text-[10px] text-slate-400">{it.sub}</div>}
          </div>
          <div className="flex h-3 flex-1 items-center">
            <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: color }} />
          </div>
          <span className="w-28 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-700">{it.valueLabel}</span>
        </div>
      ))}
      {tt.node}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ส่วนประกอบแกนของกราฟรายเดือน
// ---------------------------------------------------------------------------
const W = 720;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 26 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

/** ค่าสูงสุดของแกน ที่แบ่ง `steps` ช่องแล้วได้ตัวเลขกลม ๆ (1, 2, 2.5, 5 × 10^n) */
function niceMax(v: number, steps = 4) {
  if (v <= 0) return steps;
  const raw = v / steps;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  return step * steps;
}

function Axes({ max, min = 0, format }: { max: number; min?: number; format: (v: number) => string }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const y = (v: number) => PAD.t + PLOT_H - ((v - min) / (max - min)) * PLOT_H;
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={t === 0 ? 1 : 0.6} />
          <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="currentColor" className="text-slate-400 tabular-nums">
            {format(t)}
          </text>
        </g>
      ))}
      {THAI_MONTHS_SHORT.map((m, i) => (
        <text key={m} x={PAD.l + (PLOT_W / 12) * (i + 0.5)} y={H - 8} textAnchor="middle" fontSize={10} fill="currentColor" className="text-slate-400">
          {m}
        </text>
      ))}
    </g>
  );
}

function monthFromEvent(e: React.MouseEvent<SVGElement>) {
  const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
  const r = svg.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W;
  return Math.min(11, Math.max(0, Math.floor((x - PAD.l) / (PLOT_W / 12))));
}

// ---------------------------------------------------------------------------
// 3) คอลัมน์รายเดือน (กลุ่ม ≤ 3 ชุดข้อมูล หน่วยเดียวกัน)
// ---------------------------------------------------------------------------
export function MonthlyColumns({
  series,
  format = fmtCompact,
  tipFormat = fmtNumber,
  highlightMonth,
}: {
  series: { key: string; label: string; color: string; values: (number | null)[] }[];
  format?: (v: number) => string;
  tipFormat?: (v: number) => string;
  highlightMonth?: number; // 1-12
}) {
  const tt = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values.map((v) => v ?? 0))));
  const groupW = PLOT_W / 12;
  const barW = Math.min(18, (groupW - 10) / series.length - 2);
  const y = (v: number) => PAD.t + PLOT_H - (v / max) * PLOT_H;

  return (
    <div ref={tt.ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        <Axes max={max} format={format} />
        {Array.from({ length: 12 }, (_, i) => {
          const gx = PAD.l + groupW * i;
          const total = series.length * barW + (series.length - 1) * 2;
          return (
            <g key={i}>
              {(hover === i || highlightMonth === i + 1) && (
                <rect x={gx + 2} y={PAD.t} width={groupW - 4} height={PLOT_H} rx={4} fill="var(--viz-grid)" opacity={hover === i ? 0.6 : 0.35} />
              )}
              {series.map((s, si) => {
                const v = s.values[i];
                if (v == null || v <= 0) return null;
                const x = gx + (groupW - total) / 2 + si * (barW + 2);
                const h = Math.max(1, PLOT_H - (y(v) - PAD.t));
                const r = Math.min(4, barW / 2, h);
                const top = y(v);
                // มุมโค้งเฉพาะด้านบน (ปลายข้อมูล) ฐานติดแกน
                const d = `M${x},${top + r} a${r},${r} 0 0 1 ${r},-${r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${PAD.t + PLOT_H} H${x} Z`;
                return <path key={s.key} d={d} fill={s.color} />;
              })}
            </g>
          );
        })}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          onMouseMove={(e) => {
            const m = monthFromEvent(e);
            setHover(m);
            tt.show(
              e,
              <div>
                <div className="mb-1 font-semibold text-slate-900">{THAI_MONTHS_SHORT[m]}</div>
                {series.map((s) => (
                  <TipRow key={s.key} color={s.color} label={s.label} value={s.values[m] == null ? 'ไม่มีข้อมูล' : tipFormat(s.values[m] as number)} />
                ))}
              </div>
            );
          }}
          onMouseLeave={() => {
            setHover(null);
            tt.hide();
          }}
        />
      </svg>
      {tt.node}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4) เส้นแนวโน้มรายเดือน (ชุดข้อมูลเดียว)
// ---------------------------------------------------------------------------
export function MonthlyLine({
  label,
  values,
  color = VIZ.s1,
  format = (v: number) => `${v}`,
  minMax,
}: {
  label: string;
  values: (number | null)[];
  color?: string;
  format?: (v: number) => string;
  minMax?: number;
}) {
  const tt = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(minMax ?? 0, ...values.map((v) => v ?? 0)));
  const x = (i: number) => PAD.l + (PLOT_W / 12) * (i + 0.5);
  const y = (v: number) => PAD.t + PLOT_H - (v / max) * PLOT_H;
  // เส้นขาดช่วงตรงเดือนที่ไม่มีข้อมูล
  const segments: string[] = [];
  let cur = '';
  values.forEach((v, i) => {
    if (v == null) {
      if (cur) segments.push(cur);
      cur = '';
    } else cur += `${cur ? 'L' : 'M'}${x(i)},${y(v)} `;
  });
  if (cur) segments.push(cur);

  return (
    <div ref={tt.ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        <Axes max={max} format={format} />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + PLOT_H} stroke="var(--viz-axis)" strokeDasharray="3 3" />}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {values.map((v, i) =>
          v == null ? null : (
            <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill={color} stroke="var(--viz-surface)" strokeWidth={2} />
          )
        )}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          onMouseMove={(e) => {
            const m = monthFromEvent(e);
            setHover(m);
            tt.show(
              e,
              <div>
                <div className="mb-1 font-semibold text-slate-900">{THAI_MONTHS_SHORT[m]}</div>
                <TipRow color={color} label={label} value={values[m] == null ? 'ไม่มีข้อมูล' : format(values[m] as number)} />
              </div>
            );
          }}
          onMouseLeave={() => {
            setHover(null);
            tt.hide();
          }}
        />
      </svg>
      {tt.node}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5) คอลัมน์บวก/ลบรายเดือน — เช่น พนักงานเข้าใหม่ (ขึ้น) / ลาออก (ลง)
// ---------------------------------------------------------------------------
export function MonthlyDiverging({
  up,
  down,
  upLabel,
  downLabel,
  upColor = VIZ.s3,
  downColor = VIZ.s2,
  unit = 'คน',
}: {
  up: (number | null)[];
  down: (number | null)[];
  upLabel: string;
  downLabel: string;
  upColor?: string;
  downColor?: string;
  unit?: string;
}) {
  const tt = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(2, ...up.map((v) => v ?? 0), ...down.map((v) => v ?? 0)), 2);
  const mid = PAD.t + PLOT_H / 2;
  const half = PLOT_H / 2;
  const groupW = PLOT_W / 12;
  const barW = Math.min(20, groupW - 14);
  const ticks = [-max, -max / 2, 0, max / 2, max];
  const yv = (v: number) => mid - (v / max) * half;

  return (
    <div ref={tt.ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yv(t)} y2={yv(t)} stroke="var(--viz-grid)" strokeWidth={t === 0 ? 1.2 : 0.6} />
            <text x={PAD.l - 6} y={yv(t) + 3} textAnchor="end" fontSize={10} fill="currentColor" className="text-slate-400 tabular-nums">
              {Math.abs(Math.round(t))}
            </text>
          </g>
        ))}
        {THAI_MONTHS_SHORT.map((m, i) => (
          <text key={m} x={PAD.l + groupW * (i + 0.5)} y={H - 8} textAnchor="middle" fontSize={10} fill="currentColor" className="text-slate-400">
            {m}
          </text>
        ))}
        {Array.from({ length: 12 }, (_, i) => {
          const x = PAD.l + groupW * i + (groupW - barW) / 2;
          const u = up[i] ?? 0;
          const d = down[i] ?? 0;
          return (
            <g key={i}>
              {hover === i && <rect x={PAD.l + groupW * i + 2} y={PAD.t} width={groupW - 4} height={PLOT_H} rx={4} fill="var(--viz-grid)" opacity={0.6} />}
              {u > 0 && <rect x={x} y={yv(u)} width={barW} height={mid - yv(u) - 1} rx={3} fill={upColor} />}
              {d > 0 && <rect x={x} y={mid + 1} width={barW} height={yv(-d) - mid - 1} rx={3} fill={downColor} />}
            </g>
          );
        })}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          onMouseMove={(e) => {
            const m = monthFromEvent(e);
            setHover(m);
            tt.show(
              e,
              <div>
                <div className="mb-1 font-semibold text-slate-900">{THAI_MONTHS_SHORT[m]}</div>
                <TipRow color={upColor} label={upLabel} value={up[m] == null ? 'ไม่มีข้อมูล' : `${up[m]} ${unit}`} />
                <TipRow color={downColor} label={downLabel} value={down[m] == null ? 'ไม่มีข้อมูล' : `${down[m]} ${unit}`} />
              </div>
            );
          }}
          onMouseLeave={() => {
            setHover(null);
            tt.hide();
          }}
        />
      </svg>
      {tt.node}
    </div>
  );
}

/** กรอบการ์ดกราฟมาตรฐาน */
export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        {legend}
      </div>
      {children}
    </div>
  );
}
