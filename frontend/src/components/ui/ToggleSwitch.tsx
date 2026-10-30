'use client';

import React from 'react';

/**
 * สวิตช์เปิด/ปิด มาตรฐานของระบบ (สีกรม bg-primary เมื่อเปิด)
 * ใช้กับ "เปิดใช้งาน" และตัวเลือกเปิด/ปิดอื่นๆ ให้หน้าตาเหมือนกันทั้งระบบ
 */
export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}> = ({ checked, onChange, disabled = false, title, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    title={title}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange(!checked);
    }}
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

/** แถว "เปิดใช้งาน" มาตรฐาน: ข้อความซ้าย สวิตช์ขวา */
export const ActiveToggleRow: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  title?: string;
  /** เส้นคั่นด้านบน */
  divider?: boolean;
}> = ({ checked, onChange, label = 'เปิดใช้งาน', hint, disabled, title, divider = false }) => (
  <div
    className={`flex items-center justify-between gap-3 pt-2 pb-1 ${
      divider ? 'border-t border-slate-100 dark:border-slate-700/60' : ''
    }`}
    title={title}
  >
    <div className="min-w-0">
      <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">{label}</span>
      {hint && <span className="block text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} title={title} ariaLabel={label} />
  </div>
);
