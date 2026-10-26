'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ปุ่มมาตรฐานของระบบ — แก้หน้าตาปุ่มทั้งระบบที่ไฟล์นี้ไฟล์เดียว
 *  primary   ปุ่มหลัก (บันทึก / ยืนยัน / เพิ่ม)
 *  secondary ปุ่มรอง (ยกเลิก / ปิด)
 *  success   อนุมัติ / ยืนยันผลเชิงบวก (สีเขียว)
 *  danger    ลบ / ยืนยันการลบ / ปฏิเสธ
 *  soft-*    ปุ่มในแถว/การ์ด (แก้ไข / ลบ) พื้นอ่อน
 *  ghost     ปุ่มตัวอักษรอย่างเดียว
 */
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'soft-warning' | 'soft-danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary hover:bg-primary-hover text-white shadow-xs',
  secondary:
    'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
  'soft-warning': 'bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  'soft-danger': 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  ghost: 'text-primary dark:text-blue-300 hover:underline',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1',
  md: 'h-10 px-4 text-xs gap-1.5',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** ไอคอนหน้าข้อความ */
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center rounded-xl font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      VARIANT[variant]
    } ${variant === 'ghost' ? 'px-0 h-auto' : SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    {...rest}
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
    {children}
  </button>
);
