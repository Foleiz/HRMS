'use client';

import React from 'react';
import { Check } from 'lucide-react';

/** ตัวเลือกแบบการ์ด (ติ๊ก + หัวข้อ + คำอธิบาย) */
export const OptionCheckCard: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, title, description, disabled }) => (
  <label
    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
    } ${
      checked
        ? 'border-primary bg-primary-soft dark:border-blue-400 dark:bg-blue-950/30'
        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/60'
    }`}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span
      className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${
        checked ? 'bg-primary border-primary dark:bg-blue-500 dark:border-blue-500' : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600'
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</span>
      {description && <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>}
    </span>
  </label>
);

export const TAX_OPTION_TEXT = {
  title: 'คิดเป็นเงินได้เพื่อภาษี',
  description: 'นำจำนวนนี้ไปรวมในฐานเงินได้ที่ต้องเสียภาษี',
};
export const SSO_OPTION_TEXT = {
  title: 'คิดเป็นค่าจ้างเพื่อประกันสังคม',
  description: 'นำไปรวมในฐานค่าจ้าง (ระบบคุมเพดานให้อัตโนมัติ)',
};
