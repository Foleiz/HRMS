'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/**
 * หน้าต่าง popup มาตรฐาน: หัว (ชื่อ + ปุ่มปิด) / เนื้อหาเลื่อนได้ / ปุ่มด้านล่างติดขอบ
 * ใช้คู่กับ <ModalFooter> สำหรับปุ่ม ยกเลิก / บันทึก
 */
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** ห่อเนื้อหาด้วย form (ปุ่ม submit ใน footer ทำงานได้) */
  onSubmit?: (e: React.FormEvent) => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, subtitle, size = 'md', onSubmit, footer, children }) => {
  if (!isOpen) return null;
  const body = (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">{children}</div>
      {footer && (
        <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60">{footer}</div>
      )}
    </>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${SIZES[size]} max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700/60 animate-in zoom-in-95 duration-200`}
      >
        <div className="relative px-6 pt-6 pb-4 text-center shrink-0 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div>}
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>
  );
};

/** แถบปุ่ม ยกเลิก / บันทึก มาตรฐาน */
export const ModalFooter: React.FC<{
  onCancel: () => void;
  cancelText?: string;
  submitText?: string;
  loading?: boolean;
  loadingText?: string;
  /** true = ปุ่มยืนยันเป็น type="submit" (ใช้กับ Modal ที่มี onSubmit) */
  submit?: boolean;
  onConfirm?: () => void;
  danger?: boolean;
}> = ({ onCancel, cancelText = 'ยกเลิก', submitText = 'บันทึก', loading, loadingText = 'กำลังบันทึก...', submit = true, onConfirm, danger }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Button variant="secondary" fullWidth onClick={onCancel}>
        {cancelText}
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        fullWidth
        type={submit ? 'submit' : 'button'}
        onClick={submit ? undefined : onConfirm}
        loading={loading}
      >
        {loading ? loadingText : submitText}
      </Button>
    </div>
  );
};
