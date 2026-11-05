'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface HoverListItem {
  label: React.ReactNode;
  /** ข้อความเสริมชิดขวา เช่น วงเงิน */
  hint?: React.ReactNode;
}

/**
 * ข้อความที่ชี้เมาส์ (หรือ focus ด้วยคีย์บอร์ด) แล้วแสดงรายการชื่อในกล่องลอย
 * วาดผ่าน portal จึงไม่ถูกตัดขอบโดยตารางที่ scroll ได้
 *
 *   <HoverList title="ประเภทพนักงาน (3)" items={[{ label: 'พนักงานประจำ' }]}>3 ประเภทพนักงาน</HoverList>
 */
export function HoverList({
  title,
  items,
  children,
  className = '',
}: {
  title: React.ReactNode;
  items: HoverListItem[];
  children: React.ReactNode;
  className?: string;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el || items.length === 0) return;
    const r = el.getBoundingClientRect();
    const estHeight = Math.min(48 + items.length * 26, 280);
    const above = r.bottom + 8 + estHeight > window.innerHeight && r.top - 8 - estHeight > 0;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 268));
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }, [items.length]);
  const hide = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [pos, hide]);

  if (items.length === 0) return <span className={className}>{children}</span>;

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`cursor-help border-b border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary dark:hover:text-blue-300 focus:outline-none focus-visible:border-primary transition-colors ${className}`}
      >
        {children}
      </span>
      {pos &&
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
            className="pointer-events-none z-[100] w-64 max-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
              {title}
            </div>
            <ul className="py-1">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-1 text-xs text-slate-700 dark:text-slate-200">
                  <span className="truncate">{it.label}</span>
                  {it.hint != null && <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{it.hint}</span>}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}

export default HoverList;
