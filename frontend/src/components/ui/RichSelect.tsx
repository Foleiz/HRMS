'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type RichSelectTone = 'good' | 'warn' | 'bad' | 'muted';

export interface RichSelectOption<V extends string | number = string | number> {
  value: V;
  label: string;
  /** บรรทัดเล็กใต้ชื่อ เช่น เงื่อนไขสั้นๆ */
  description?: string;
  /** ข้อความชิดขวา เช่น "เหลือ 8 วัน" — แสดงในปุ่มด้วยเมื่อถูกเลือก */
  meta?: string;
  metaTone?: RichSelectTone;
  /** เลือกไม่ได้ — ไปอยู่กลุ่มล่าง พร้อมเหตุผล */
  disabled?: boolean;
  disabledReason?: string;
}

interface RichSelectProps<V extends string | number> {
  id?: string;
  value: V | '' | null | undefined;
  onChange: (value: V) => void;
  options: RichSelectOption<V>[];
  placeholder?: string;
  /** หัวกลุ่ม — แสดงเมื่อมีทั้งตัวเลือกที่ใช้ได้และใช้ไม่ได้ */
  enabledGroupLabel?: string;
  disabledGroupLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
  emptyText?: string;
  /** ทิศที่เปิดรายการ — auto: เปิดขึ้นบนเมื่อพื้นที่ด้านล่างไม่พอ (เช่นติดแถบปุ่มล่างของฟอร์ม) */
  placement?: 'auto' | 'bottom' | 'top';
}

const TONE: Record<RichSelectTone, string> = {
  good: 'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-rose-700 dark:text-rose-400',
  muted: 'text-slate-500 dark:text-slate-400',
};

/**
 * Dropdown แบบมีข้อมูลประกอบต่อตัวเลือก (ข้อความชิดขวา + คำอธิบาย) และแยกกลุ่ม "ใช้ได้ / ใช้ไม่ได้"
 * ใช้กับฟอร์มยื่นเอกสาร เช่น ประเภทการลา (วันคงเหลือ), สวัสดิการ (วงเงินคงเหลือ)
 * คีย์บอร์ด: ↑ ↓ เลือก, Enter/Space ยืนยัน, Esc ปิด
 */
export function RichSelect<V extends string | number>({
  id,
  value,
  onChange,
  options,
  placeholder = 'เลือก',
  enabledGroupLabel = 'ใช้ได้',
  disabledGroupLabel = 'ใช้ไม่ได้',
  invalid,
  disabled,
  emptyText = 'ไม่มีตัวเลือก',
  placement = 'auto',
  ...rest
}: RichSelectProps<V>) {
  const autoId = useId();
  const buttonId = id ?? `rs-${autoId}`;
  const listId = `${buttonId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ตัวเลือกที่เลือกอยู่ (แม้ถูกปิดใช้) ยังให้อยู่กลุ่มบน — เช่นแก้แบบร่างที่สิทธิ์หมดไปแล้ว
  const enabled = useMemo(() => options.filter((o) => !o.disabled || o.value === value), [options, value]);
  const blocked = useMemo(() => options.filter((o) => o.disabled && o.value !== value), [options, value]);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openMenu = () => {
    if (disabled) return;
    const idx = enabled.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    if (placement === 'top') setOpenUp(true);
    else if (placement === 'bottom') setOpenUp(false);
    else {
      const r = rootRef.current?.getBoundingClientRect();
      if (r) {
        const wanted = Math.min(320, 52 * (options.length + 1));
        const below = window.innerHeight - r.bottom - 96; // เผื่อแถบปุ่มติดขอบล่าง
        const above = r.top - 16;
        setOpenUp(below < wanted && above > below);
      }
    }
    setOpen(true);
  };

  const choose = (o: RichSelectOption<V>) => {
    if (o.disabled && o.value !== value) return;
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(enabled.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = enabled[active];
      if (o) choose(o);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const renderOption = (o: RichSelectOption<V>, idx: number | null) => {
    const isSel = o.value === value;
    const isActive = idx !== null && idx === active;
    const isBlocked = idx === null;
    return (
      <li
        key={String(o.value)}
        id={`${listId}-${String(o.value)}`}
        role="option"
        aria-selected={isSel}
        aria-disabled={isBlocked || undefined}
        data-idx={idx ?? undefined}
        onMouseEnter={() => idx !== null && setActive(idx)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => !isBlocked && choose(o)}
        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg ${
          isBlocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${isActive ? 'bg-slate-100 dark:bg-slate-700/60' : ''} ${isSel ? 'bg-blue-50/80 dark:bg-blue-900/30' : ''}`}
      >
        <span className="min-w-0 flex items-start gap-2">
          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isSel ? 'text-[#0B2046] dark:text-blue-300' : 'invisible'}`} aria-hidden="true" />
          <span className="min-w-0">
            <span className={`block text-sm ${isSel ? 'font-semibold text-[#0B2046] dark:text-blue-200' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
              {o.label}
            </span>
            {(isBlocked ? o.disabledReason || o.description : o.description) && (
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBlocked ? o.disabledReason || o.description : o.description}
              </span>
            )}
          </span>
        </span>
        {o.meta && (
          <span className={`text-xs font-semibold whitespace-nowrap ${isBlocked ? TONE.muted : TONE[o.metaTone ?? 'muted']}`}>{o.meta}</span>
        )}
      </li>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-activedescendant={open && enabled[active] ? `${listId}-${String(enabled[active].value)}` : undefined}
        aria-describedby={rest['aria-describedby']}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`w-full h-11 px-3.5 flex items-center justify-between gap-3 rounded-xl border bg-white dark:bg-slate-900 text-sm text-left transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          invalid
            ? 'border-rose-500 dark:border-rose-500'
            : open
              ? 'border-[#0B2046] ring-2 ring-[#0B2046]/15 dark:border-blue-500'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
        }`}
      >
        <span className={`truncate ${selected ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-2.5 shrink-0">
          {selected?.meta && <span className={`text-xs ${TONE[selected.metaTone ?? 'muted']}`}>{selected.meta}</span>}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={buttonId}
          className={`absolute z-40 w-full max-h-80 overflow-y-auto ${openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-1.5`}
        >
          {enabled.length === 0 && blocked.length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{emptyText}</li>
          )}
          {enabled.length > 0 && blocked.length > 0 && (
            <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {enabledGroupLabel}
            </li>
          )}
          {enabled.map((o, i) => renderOption(o, i))}
          {blocked.length > 0 && (
            <>
              <li role="presentation" className="mt-1 border-t border-slate-100 dark:border-slate-700 px-3 pt-2.5 pb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {disabledGroupLabel}
              </li>
              {blocked.map((o) => renderOption(o, null))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

export default RichSelect;
