'use client';

import React from 'react';
import { X } from 'lucide-react';

/**
 * หัวหน้าต่างมาตรฐานของระบบ — ไอคอนในกล่อง + หัวข้อชิดซ้าย + ปุ่มปิดมุมขวา
 * (ต้นแบบ: หน้าต่าง "สร้างข่าวสารและประกาศใหม่")
 *
 *   <ModalHeader icon={Megaphone} title="สร้างข่าวสารและประกาศใหม่" onClose={close} />
 */
export interface ModalHeaderProps {
  title: React.ReactNode;
  icon?: React.ElementType;
  /** ข้อมูลประกอบบรรทัดรอง (ใช้เฉพาะข้อมูลที่เปลี่ยนตามรายการ เช่น ชื่อพนักงาน / เลขที่ชุดข้อมูล) */
  subtitle?: React.ReactNode;
  onClose?: () => void;
  /** ปุ่มเพิ่มเติมก่อนปุ่มปิด */
  actions?: React.ReactNode;
  className?: string;
}

export function ModalHeader({ title, icon: Icon, subtitle, onClose, actions, className = '' }: ModalHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shrink-0 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-blue-400/10 text-primary dark:text-blue-300 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{title}</h3>
          {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</div>}
        </div>
      </div>
      {(actions || onClose) && (
        <div className="flex items-center gap-2 shrink-0">
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
