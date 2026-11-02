'use client';

import React from 'react';
import { X } from 'lucide-react';

/**
 * หัวหน้าต่างมาตรฐานของระบบ — ไอคอนในกล่อง + หัวข้ออยู่กึ่งกลาง + ปุ่มปิดมุมขวา
 *
 *   <ModalHeader icon={Megaphone} title="สร้างข่าวสารและประกาศใหม่" onClose={close} />
 */
export interface ModalHeaderProps {
  title: React.ReactNode;
  icon?: React.ElementType;
  /** ข้อมูลประกอบบรรทัดรอง (ใช้เฉพาะข้อมูลที่เปลี่ยนตามรายการ เช่น ชื่อพนักงาน / เลขที่ชุดข้อมูล) */
  subtitle?: React.ReactNode;
  onClose?: () => void;
  /** ปุ่มเพิ่มเติมก่อนปุ่มปิด (มุมขวา) */
  actions?: React.ReactNode;
  className?: string;
}

export function ModalHeader({ title, icon: Icon, subtitle, onClose, actions, className = '' }: ModalHeaderProps) {
  return (
    <div
      className={`relative px-14 py-4 text-center border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shrink-0 ${className}`}
    >
      <div className="flex items-center justify-center gap-2.5 min-w-0">
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-blue-400/10 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug min-w-0">{title}</h3>
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{subtitle}</div>}
      {(actions || onClose) && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {actions}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ModalHeader;
