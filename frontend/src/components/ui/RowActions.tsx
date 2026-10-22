'use client';

import React from 'react';
import { Edit2, Trash2, Eye, Download, Loader2 } from 'lucide-react';

/**
 * ปุ่มไอคอนในคอลัมน์ "จัดการ" ของตาราง (แก้ไข / ลบ / ดู / ดาวน์โหลด) — หน้าตาเดียวกันทั้งระบบ
 *   <RowActions>
 *     <RowActionButton action="edit" onClick={...} />
 *     <RowActionButton action="delete" onClick={...} />
 *   </RowActions>
 */
const STYLE = {
  edit: {
    icon: Edit2,
    title: 'แก้ไข',
    cls: 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800',
  },
  delete: {
    icon: Trash2,
    title: 'ลบ',
    cls: 'text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30',
  },
  view: {
    icon: Eye,
    title: 'ดู',
    cls: 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-800',
  },
  download: {
    icon: Download,
    title: 'ดาวน์โหลด',
    cls: 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
} as const;

export const RowActionButton: React.FC<{
  action: keyof typeof STYLE;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  /** แสดงไอคอนหมุนและกดไม่ได้ระหว่างทำงาน (เช่น กำลังดาวน์โหลด) */
  loading?: boolean;
}> = ({ action, onClick, title, disabled, loading }) => {
  const { icon: Icon, title: defaultTitle, cls } = STYLE[action];
  return (
    <button
      type="button"
      title={title ?? defaultTitle}
      disabled={disabled || loading}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${cls}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    </button>
  );
};

export const RowActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-flex items-center gap-1">{children}</div>
);
