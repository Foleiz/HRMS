'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * แถบแท็บมาตรฐานของระบบ — เส้นใต้หนา 3px เลื่อนไปยังแท็บที่เลือกแบบนุ่มนวล
 *
 *   <TabBar items={[{ key: 'a', label: 'แท็บ A' }, …]} activeKey={tab} onChange={setTab} />
 *   <TabBar items={[{ key: '/employees', label: 'พนักงาน', href: '/employees' }, …]} activeKey={pathname} memoryKey="employees-nav" />
 *
 * - แท็บที่มี href เป็นลิงก์ (เปลี่ยนหน้า) / ไม่มี href เป็นปุ่ม (เรียก onChange)
 * - memoryKey: แถบที่อยู่คนละหน้า (เปลี่ยนหน้าแล้ว component ถูกสร้างใหม่) จำตำแหน่งเดิมไว้
 *   เพื่อให้เส้นเลื่อนจากแท็บเดิมไปแท็บใหม่ได้ แทนที่จะโผล่ขึ้นมาเฉย ๆ
 * - วาง TabBar ชิดขอบล่างของกล่องที่มีเส้นขอบล่าง (border-b) เส้นใต้จะทับเส้นขอบพอดี
 */
export interface TabBarItem<K extends string = string> {
  key: K;
  label: React.ReactNode;
  /** ลิงก์ไปหน้าอื่น (ไม่ใส่ = ปุ่มสลับแท็บในหน้าเดียวกัน) */
  href?: string;
  /** ตัวเลข/ป้ายต่อท้ายชื่อแท็บ */
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** เรียกเพิ่มเติมเมื่อกด (เช่น ลิงก์ที่ต้องบันทึกสถานะก่อนเปลี่ยนหน้า) */
  onClick?: () => void;
}

interface TabBarProps<K extends string> {
  items: TabBarItem<K>[];
  activeKey: K | null | undefined;
  onChange?: (key: K) => void;
  memoryKey?: string;
  /** class ของแถบ (ระยะห่างระหว่างแท็บ ขนาดตัวอักษร ฯลฯ) */
  className?: string;
  /** class เพิ่มของแต่ละแท็บ (เช่น ระยะบน-ล่าง) */
  itemClassName?: string;
  'aria-label'?: string;
}

type Indicator = { left: number; width: number };

/** ตำแหน่งเส้นใต้ล่าสุดของแต่ละแถบ (ใช้ข้ามหน้า) */
const lastIndicator = new Map<string, Indicator>();

export function TabBar<K extends string>({
  items,
  activeKey,
  onChange,
  memoryKey,
  className = 'gap-6 text-[13px]',
  itemClassName = 'py-3',
  'aria-label': ariaLabel,
}: TabBarProps<K>) {
  const barRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(() =>
    memoryKey ? lastIndicator.get(memoryKey) ?? null : null
  );
  const hadMemoryRef = useRef(!!(memoryKey && lastIndicator.has(memoryKey)));

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let frame = 0;
    const measure = () => {
      const el = bar.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(String(activeKey ?? ''))}"]`);
      const next = el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
      if (next && memoryKey) lastIndicator.set(memoryKey, next);
      setIndicator(next);
    };
    if (hadMemoryRef.current) {
      // มาจากหน้าอื่น: แสดงที่ตำแหน่งเดิมก่อน 1 เฟรม แล้วค่อยเลื่อนไปแท็บใหม่
      hadMemoryRef.current = false;
      frame = requestAnimationFrame(measure);
    } else {
      measure();
    }
    document.fonts?.ready.then(measure).catch(() => undefined);
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [activeKey, items.length, memoryKey]);

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-center overflow-x-auto no-scrollbar font-medium ${className}`}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const cls = `inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors duration-200 ${itemClassName} ${
          active
            ? 'text-primary dark:text-white font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        } ${item.disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`;
        const content = (
          <>
            {item.icon}
            {item.label}
            {item.badge}
          </>
        );
        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={active}
            data-tab-key={item.key}
            onClick={item.onClick}
            className={cls}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-tab-key={item.key}
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onChange?.(item.key);
            }}
            className={cls}
          >
            {content}
          </button>
        );
      })}
      {indicator && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-primary dark:bg-white transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
    </div>
  );
}

export default TabBar;
