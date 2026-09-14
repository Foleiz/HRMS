'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle2, HelpCircle, Info, Trash2, Sparkles, Loader2 } from 'lucide-react';

export type ConfirmType = 'question' | 'warning' | 'danger' | 'success' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  isLoading?: boolean;
  singleButton?: boolean; // When true, behaves like an alert dialog (only OK button)
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
  isLoading = false,
  singleButton = false,
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
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          bg: 'bg-rose-100',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          bg: 'bg-amber-100',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          bg: 'bg-emerald-100',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          bg: 'bg-blue-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'question':
      default:
        return {
          icon: <Sparkles className="w-6 h-6 text-blue-600" />,
          bg: 'bg-blue-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const config = getIconConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 animate-in zoom-in-95 duration-200">
        {/* Close icon button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon Badge */}
          <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center mb-4 shadow-sm`}>
            {config.icon}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug px-2">
            {title}
          </h3>

          {/* Message (supports multiline / paragraphs) */}
          <div className="text-sm text-gray-500 mb-6 leading-relaxed whitespace-pre-line px-2">
            {message}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            {!singleButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
                singleButton ? 'w-full bg-slate-900 hover:bg-slate-800 text-white' : config.confirmBtn
              }`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
