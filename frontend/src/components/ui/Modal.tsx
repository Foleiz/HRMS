'use client';

import React from 'react';
import { Button } from './Button';
import { ModalShell } from './ModalShell';
import { ModalHeader } from './ModalHeader';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/**
 * หน้าต่าง popup มาตรฐาน: หัว (ชื่อ + ปุ่มปิด) / เนื้อหาเลื่อนได้ / ปุ่มด้านล่างติดขอบ
 * ใช้คู่กับ <ModalFooter> สำหรับปุ่ม ยกเลิก / บันทึก
 */
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** ไอคอนหน้าหัวข้อ (lucide) */
  icon?: React.ElementType;
  subtitle?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** ห่อเนื้อหาด้วย form (ปุ่ม submit ใน footer ทำงานได้) */
  onSubmit?: (e: React.FormEvent) => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, icon, subtitle, size = 'md', onSubmit, footer, children }) => {
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
    // popup สูงไม่เกิน 100dvh - ขอบ — เนื้อหาเลื่อนภายใน หัว/ปุ่มไม่โดนขอบจอบัง
    <ModalShell>
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${SIZES[size]} max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700/60 animate-in zoom-in-95 duration-200`}
      >
        <ModalHeader icon={icon} title={title} subtitle={subtitle} onClose={onClose} />
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </ModalShell>
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
