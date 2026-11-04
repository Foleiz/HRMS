'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { buildColorMap, leaveColorVars } from '@/lib/leaveColors';
import type { Shift } from '@/types/shift';

/**
 * ตัวเลือกกะการทำงานแบบมีป้ายสีของกะ (รูปแบบเดียวกับหน้ามอบหมายกะ)
 *
 *   <ShiftSelect shifts={shifts} value={shiftId} onChange={setShiftId} noneLabel="ไม่มีกะ" />
 */
export function ShiftSelect({
  shifts,
  value,
  onChange,
  noneLabel,
  placeholder = '-- กรุณาเลือกกะการทำงาน --',
}: {
  shifts: Shift[];
  value?: number;
  onChange: (shiftId: number | undefined) => void;
  /** ระบุ = มีตัวเลือก "ไม่มีกะ" ด้านบนสุด */
  noneLabel?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const colorMap = useMemo(() => buildColorMap(shifts), [shifts]);
  const colorOf = (id: number) => colorMap.get(id) ?? '#475569';
  const selected = shifts.find((s) => s.id === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chip = (s: Shift) => (
    <span
      className="leave-chip px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
      style={leaveColorVars(colorOf(s.id)) as React.CSSProperties}
    >
      {s.shiftName}
    </span>
  );
  const timeText = (s: Shift) => (
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
      ({s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)} น.{s.isCrossDay ? ' · กะข้ามวัน' : ''})
    </span>
  );

  const pick = (id: number | undefined) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-slate-800 border rounded-xl transition-all cursor-pointer ${
          open
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {chip(selected)}
            {timeText(selected)}
          </div>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">{noneLabel ?? placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden py-1 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {noneLabel && (
              <button
                type="button"
                role="option"
                aria-selected={!selected}
                onClick={() => pick(undefined)}
                className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs ${
                  !selected ? 'bg-blue-50/70 dark:bg-blue-900/30 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'
                } text-slate-600 dark:text-slate-300`}
              >
                <span>{noneLabel}</span>
                {!selected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
              </button>
            )}
            {shifts.map((s) => {
              const isSelected = s.id === value;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(s.id)}
                  className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/70 dark:bg-blue-900/30 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {chip(s)}
                    {timeText(s)}
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftSelect;
