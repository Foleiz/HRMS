'use client';

import React from 'react';

/** ปุ่มเลือกทีละหนึ่ง (เช่น รายได้ / รายหัก) */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:cursor-not-allowed ${
            value === o.value ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
