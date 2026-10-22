'use client';

import React from 'react';

/** สถานะแบบจุด + ข้อความ (ใช้งาน / ไม่ได้ใช้งาน ฯลฯ) */
export type StatusTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info';

const DOT: Record<StatusTone, string> = {
  success: 'bg-emerald-500',
  neutral: 'bg-slate-300',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
};
const TEXT: Record<StatusTone, string> = {
  success: 'text-slate-800 dark:text-slate-200',
  neutral: 'text-slate-400',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  info: 'text-blue-700 dark:text-blue-300',
};

export const StatusBadge: React.FC<{ tone?: StatusTone; children: React.ReactNode }> = ({ tone = 'success', children }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT[tone]}`}>
    <span className={`w-2 h-2 rounded-full ${DOT[tone]}`} />
    <span>{children}</span>
  </span>
);

/** สถานะ ACTIVE / INACTIVE มาตรฐาน */
export const ActiveStatus: React.FC<{ active: boolean; activeText?: string; inactiveText?: string }> = ({
  active,
  activeText = 'ใช้งาน',
  inactiveText = 'ไม่ได้ใช้งาน',
}) => <StatusBadge tone={active ? 'success' : 'neutral'}>{active ? activeText : inactiveText}</StatusBadge>;
