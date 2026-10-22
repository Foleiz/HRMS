'use client';

import React from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';

/**
 * ปุ่มไอคอนในคอลัมน์ "จัดการ" ของตาราง (แก้ไข / ลบ / ดู) — หน้าตาเดียวกันทั้งระบบ
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
} as const;

export const RowActionButton: React.FC<{
  action: keyof typeof STYLE;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}> = ({ action, onClick, title, disabled }) => {
  const { icon: Icon, title: defaultTitle, cls } = STYLE[action];
  return (
    <button
      type="button"
      title={title ?? defaultTitle}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${cls}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

export const RowActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-flex items-center gap-1">{children}</div>
);
