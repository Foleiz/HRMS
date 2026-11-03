'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ComboOption {
  value: string;
  /** ข้อความเสริมด้านขวา เช่น รหัสไปรษณีย์ */
  hint?: string;
}

interface ComboInputProps {
  value: string;
  /** พิมพ์เอง (ค่าไม่จำเป็นต้องอยู่ในรายการ) */
  onChange: (text: string) => void;
  /** เลือกจากรายการ */
  onSelect: (option: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** ข้อความเมื่อไม่มีรายการให้เลือก */
  emptyText?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}

const MAX_VISIBLE = 80;

/** ช่องกรอกที่พิมพ์เองได้ และมีรายการแนะนำให้เลือก (กรองตามที่พิมพ์) */
export function ComboInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  className = '',
  disabled,
  emptyText,
  inputMode,
  maxLength,
}: ComboInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // null = ยังไม่ได้พิมพ์กรอง → แสดงทั้งหมด
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = (query ?? '').trim().replace(/\s+/g, '');
    const list = q ? options.filter((o) => o.value.replace(/\s+/g, '').includes(q) || (o.hint || '').startsWith(q)) : options;
    return list.slice(0, MAX_VISIBLE);
  }, [options, query]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (o: ComboOption) => {
    onSelect(o);
    setOpen(false);
    setQuery(null);
  };

  const showList = open && !disabled && (filtered.length > 0 || !!emptyText);

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery(null);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!showList || filtered.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(filtered[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={`${className} pr-8`}
      />
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      {showList && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1 text-xs"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">{emptyText}</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={`${o.value}-${o.hint || ''}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer ${
                  i === active ? 'bg-slate-100 dark:bg-slate-700' : ''
                } ${o.value === value ? 'font-semibold text-primary dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
              >
                <span className="truncate">{o.value}</span>
                {o.hint && <span className="shrink-0 font-mono text-slate-400">{o.hint}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
