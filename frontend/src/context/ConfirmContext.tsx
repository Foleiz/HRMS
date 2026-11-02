'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmModal, ConfirmType } from '@/components/ui/ConfirmModal';

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  text?: string;
  html?: string;
  confirmText?: string;
  confirmButtonText?: string;
  cancelText?: string;
  cancelButtonText?: string;
  type?: ConfirmType;
  icon?: 'warning' | 'info' | 'question' | 'success' | 'error' | 'danger';
  singleButton?: boolean;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (title: string, message?: string, type?: ConfirmType) => Promise<void>;
  close: () => void;
  isOpen: boolean;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

let globalConfirm: ((options: ConfirmDialogOptions) => Promise<boolean>) | null = null;
let globalClose: (() => void) | null = null;
let globalIsOpen = false;

/**
 * Global Helper ฟังก์ชัน สำหรับเรียกใช้งานกล่องยืนยัน Confirm ทั่วทั้งระบบ โดยไม่ต้องผูกกับ state ใน component
 */
export async function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
  if (globalConfirm) {
    return globalConfirm(options);
  }
  return window.confirm(options.message || options.text || options.title);
}

export async function confirmDelete(options: {
  title?: string;
  text?: string;
  html?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}): Promise<boolean> {
  return confirmAction({
    title: options.title || 'ยืนยันการลบข้อมูล?',
    text: options.text,
    html: options.html,
    confirmButtonText: options.confirmButtonText || 'ลบข้อมูล',
    cancelButtonText: options.cancelButtonText || 'ยกเลิก',
    type: 'danger',
    isDestructive: true,
  });
}

export async function showSuccess(title: string, text?: string): Promise<void> {
  await confirmAction({
    title,
    text,
    type: 'success',
    singleButton: true,
    confirmButtonText: 'ตกลง',
  });
}

export async function showError(title: string, text?: string): Promise<void> {
  await confirmAction({
    title,
    text,
    type: 'error',
    singleButton: true,
    confirmButtonText: 'ตกลง',
  });
}

export async function showAlert(title: string, message?: string, type: ConfirmType = 'info'): Promise<void> {
  await confirmAction({
    title,
    message,
    type,
    singleButton: true,
    confirmButtonText: 'รับทราบ',
  });
}

export function isConfirmVisible(): boolean {
  return globalIsOpen;
}

export function closeConfirmDialog(): void {
  globalClose?.();
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfirmDialogOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    globalIsOpen = false;
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setTimeout(() => setConfig(null), 200);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfig(options);
      setIsOpen(true);
      globalIsOpen = true;
    });
  }, []);

  const alert = useCallback(
    async (title: string, message?: string, type: ConfirmType = 'info'): Promise<void> => {
      await confirm({
        title,
        message,
        type,
        singleButton: true,
        confirmButtonText: 'ตกลง',
      });
    },
    [confirm]
  );

  globalConfirm = confirm;
  globalClose = close;

  const handleConfirm = () => {
    setIsOpen(false);
    globalIsOpen = false;
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setTimeout(() => setConfig(null), 200);
  };

  const handleCancel = () => {
    close();
  };

  // Convert icon or destructive flag to ConfirmType
  let resolvedType: ConfirmType = 'question';
  if (config?.isDestructive || config?.type === 'danger') {
    resolvedType = 'danger';
  } else if (config?.type === 'error' || config?.icon === 'error') {
    resolvedType = 'error';
  } else if (config?.type === 'warning' || config?.icon === 'warning') {
    resolvedType = 'warning';
  } else if (config?.type === 'success' || config?.icon === 'success') {
    resolvedType = 'success';
  } else if (config?.type === 'info' || config?.icon === 'info') {
    resolvedType = 'info';
  } else if (config?.type) {
    resolvedType = config.type;
  }

  return (
    <ConfirmContext.Provider value={{ confirm, alert, close, isOpen }}>
      {children}
      {config && (
        <ConfirmModal
          isOpen={isOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          title={config.title}
          message={config.message || config.text || (config.html ? config.html.replace(/<[^>]*>/g, '') : '')}
          confirmText={config.confirmButtonText || config.confirmText || (resolvedType === 'danger' ? 'ลบข้อมูล' : 'ยืนยัน')}
          cancelText={config.cancelButtonText || config.cancelText || 'ยกเลิก'}
          type={resolvedType}
          singleButton={config.singleButton}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
