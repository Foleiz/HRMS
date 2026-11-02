'use client';

import { ModalShell } from './ModalShell';
import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, Info, Trash2, Loader2 } from 'lucide-react';

export type ConfirmType = 'question' | 'warning' | 'danger' | 'success' | 'info' | 'error';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  icon?: React.ReactNode;
  isLoading?: boolean;
  singleButton?: boolean; // When true, behaves like an alert dialog (only OK button)
  zIndexClassName?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'question',
  icon,
  isLoading = false,
  singleButton = false,
  zIndexClassName = 'z-50',
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    } else {
      onClose();
    }
  };

  const getIconConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50',
          confirmBtn: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs',
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-primary dark:text-blue-400" />,
          bg: 'bg-primary-soft dark:bg-primary/20 border border-blue-100 dark:border-blue-900/40',
          confirmBtn: 'bg-primary hover:bg-primary-hover active:bg-[#081a3e] text-white shadow-xs',
        };
      case 'question':
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-primary dark:text-blue-400" />,
          bg: 'bg-primary-soft dark:bg-primary/20 border border-blue-100 dark:border-blue-900/40',
          confirmBtn: 'bg-primary hover:bg-primary-hover active:bg-[#081a3e] text-white shadow-xs',
        };
    }
  };

  const config = getIconConfig();

  return (
    <ModalShell className={`${zIndexClassName} bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150`}>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 p-6 sm:p-7 animate-in zoom-in-95 duration-200">
        {/* Close icon button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon Badge */}
          <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center mb-4 shadow-2xs`}>
            {icon || config.icon}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug px-2">
            {title}
          </h3>

          {/* Message (supports multiline / paragraphs) */}
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed whitespace-pre-line px-2">
            {message}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            {!singleButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed border border-slate-200 dark:border-slate-600"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                singleButton ? `w-full ${config.confirmBtn}` : config.confirmBtn
              }`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
