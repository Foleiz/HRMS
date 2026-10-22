'use client';

import React from 'react';

/** class ช่องกรอกมาตรฐาน — ใช้กับ input / textarea ที่ยังไม่ได้ย้ายมาใช้ component */
export const inputClass =
  'w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-primary transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400 ' +
  'disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-900';

/** หัวช่อง + ช่อง + คำอธิบาย/ข้อผิดพลาด */
export const FormField: React.FC<{
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, error, className = '', children }) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <span className="block text-[11px] text-rose-600 mt-1">{error}</span>
    ) : hint ? (
      <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>
    ) : null}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} className={`${inputClass} ${className}`} {...rest} />,
);
Input.displayName = 'Input';

/** แสดงตัวเลขพร้อมลูกน้ำ (ค่าที่เก็บยังเป็นตัวเลขล้วน) */
export const withCommas = (v: string) => {
  if (v === '' || v == null) return '';
  const [i, d] = String(v).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d !== undefined ? `.${d}` : '');
};
/** รับค่าที่พิมพ์ (อาจมีลูกน้ำ) → ตัวเลขล้วน ทศนิยมได้จุดเดียว */
export const cleanNumber = (v: string) => {
  const raw = v.replace(/[^\d.]/g, '');
  const dot = raw.indexOf('.');
  return dot < 0 ? raw : raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '');
};

/** ช่องตัวเลข: แสดงลูกน้ำ, มีสัญลักษณ์หน้า (เช่น ฿) และหน่วยท้าย (เช่น บาท / %) */
export const NumberInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    value: string;
    onChange: (value: string) => void;
    prefix?: string;
    suffix?: string;
  }
> = ({ value, onChange, prefix, suffix, className = '', placeholder, ...rest }) => (
  <div className="relative">
    {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{prefix}</span>}
    <input
      type="text"
      inputMode="decimal"
      value={withCommas(value)}
      placeholder={placeholder ? withCommas(placeholder) : undefined}
      onChange={(e) => onChange(cleanNumber(e.target.value))}
      className={`${inputClass} font-semibold ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''} ${className}`}
      {...rest}
    />
    {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">{suffix}</span>}
  </div>
);
