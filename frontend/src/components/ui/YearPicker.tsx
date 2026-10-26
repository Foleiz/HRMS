'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_SIZE = 12;

/**
 * ปุ่มเลือกปี (พ.ศ.) แบบตาราง 4×3 — หน้าตาเดียวกับตัวเลือกปีใน ThaiDatePicker
 *   <YearPicker value={2026} onChange={(y) => ...} />   // value/onChange เป็น ค.ศ.
 */
export const YearPicker: React.FC<{
  /** ปี ค.ศ. */
  value: number;
  onChange: (year: number) => void;
  /** ข้อความหน้าปีบนปุ่ม เช่น "ปี" */
  prefix?: string;
  className?: string;
  buttonClassName?: string;
  title?: string;
  disabled?: boolean;
}> = ({ value, onChange, prefix = 'ปี', className = '', buttonClassName = '', title, disabled }) => {
  const [open, setOpen] = useState(false);
  const [gridStart, setGridStart] = useState(value - 5);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 280;
      setMenuStyle({
        position: 'fixed',
        zIndex: 99999,
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
      });
    }
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) setGridStart(value - 5);
          setOpen((o) => !o);
        }}
        className={`w-full h-8 px-2.5 text-xs rounded-lg bg-white dark:bg-slate-800 border flex items-center justify-between gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          open
            ? 'border-primary dark:border-blue-500 ring-2 ring-primary/10 dark:ring-blue-500/20'
            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
        } ${buttonClassName}`}
      >
        <span className="truncate">
          {prefix ? `${prefix} ` : ''}
          {value + 543}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setGridStart((y) => y - GRID_SIZE)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              aria-label="ช่วงปีก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {gridStart + 543} – {gridStart + GRID_SIZE - 1 + 543}
            </span>
            <button
              type="button"
              onClick={() => setGridStart((y) => y + GRID_SIZE)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              aria-label="ช่วงปีถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: GRID_SIZE }, (_, i) => gridStart + i).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  y === value
                    ? 'bg-primary dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {y + 543}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
