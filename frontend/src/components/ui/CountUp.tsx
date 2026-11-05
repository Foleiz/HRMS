'use client';

import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * ตัวเลขที่นับขึ้นจากค่าเดิมไปค่าใหม่ (ครั้งแรกนับจาก 0)
 * ผู้ใช้ที่ตั้งเครื่องให้ลดการเคลื่อนไหว จะเห็นค่าสุดท้ายทันที
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const ms = prefersReducedMotion() ? 0 : duration;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = ms <= 0 ? 1 : Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = from + (target - from) * eased;
      fromRef.current = current;
      setValue(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const decimalsOf = (n: number) => {
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(2, s.length - i - 1);
};

/**
 * แสดงตัวเลขแบบนับขึ้น
 *
 *   <CountUp value={1234} />                 → 1,234
 *   <CountUp value={5846.5} suffix=" วัน" /> → 5,846.5 วัน
 */
export function CountUp({
  value,
  duration,
  format,
  suffix,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  suffix?: React.ReactNode;
}) {
  const v = useCountUp(value, duration);
  const digits = decimalsOf(value);
  const text = format
    ? format(v)
    : v.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (
    <span className="tabular-nums">
      {text}
      {suffix}
    </span>
  );
}

export default CountUp;
