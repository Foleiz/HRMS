'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone toast trigger for use outside of React components if needed
let globalShowToast: ((toast: Omit<ToastItem, 'id'>) => void) | null = null;

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    globalShowToast?.({ type: 'success', message, title, duration });
  },
  error: (message: string, title?: string, duration?: number) => {
    globalShowToast?.({ type: 'error', message, title, duration });
  },
  warning: (message: string, title?: string, duration?: number) => {
    globalShowToast?.({ type: 'warning', message, title, duration });
  },
  info: (message: string, title?: string, duration?: number) => {
    globalShowToast?.({ type: 'info', message, title, duration });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, title, duration = 4500 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, message, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  // Bind global trigger
  globalShowToast = showToast;

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ type: 'success', message, title, duration });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ type: 'error', message, title, duration });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ type: 'warning', message, title, duration });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ type: 'info', message, title, duration });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// -------------------------------------------------------------
// Toast Container & Item Component (Matching User Screenshot)
// -------------------------------------------------------------
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  // Style configurations matching the reference screenshot
  const typeStyles = {
    // Exact vibrant Royal Blue as shown in user screenshot
    success: {
      bg: 'bg-[#0052CC] hover:bg-[#0047B3]',
      border: 'border-[#0047B3]/30',
      icon: (
        <svg
          className="w-6 h-6 text-white shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 5-5" />
        </svg>
      ),
      progressColor: 'bg-white/40',
    },
    // Vibrant Rose for error alerts
    error: {
      bg: 'bg-[#DC2626] hover:bg-[#B91C1C]',
      border: 'border-[#B91C1C]/30',
      icon: (
        <svg
          className="w-6 h-6 text-white shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      progressColor: 'bg-white/40',
    },
    // Vibrant Amber for warnings
    warning: {
      bg: 'bg-[#D97706] hover:bg-[#B45309]',
      border: 'border-[#B45309]/30',
      icon: (
        <svg
          className="w-6 h-6 text-white shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      progressColor: 'bg-white/40',
    },
    // Deep Enterprise Navy for general info
    info: {
      bg: 'bg-[#0052CC] hover:bg-[#0047B3]',
      border: 'border-[#0047B3]/30',
      icon: (
        <svg
          className="w-6 h-6 text-white shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      progressColor: 'bg-white/40',
    },
  };

  const currentStyle = typeStyles[toast.type] || typeStyles.info;

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-lg px-4 py-3 text-white shadow-lg shadow-black/15 border ${currentStyle.bg} ${currentStyle.border} transition-all duration-200 transform animate-in slide-in-from-top-4 fade-in`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Outlined Circle Icon */}
        <div className="shrink-0">{currentStyle.icon}</div>

        {/* Center: Message Content */}
        <div className="flex-1 min-w-0 pr-1">
          {toast.title && (
            <p className="text-xs font-bold tracking-wide uppercase text-white/90 mb-0.5">
              {toast.title}
            </p>
          )}
          <p className="text-sm font-normal text-white leading-normal break-words">
            {toast.message}
          </p>
        </div>

        {/* Right: Dismiss 'X' Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 text-white/85 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Subtle Auto-dismiss Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${currentStyle.progressColor} animate-pulse`}
          style={{
            animation: `shrinkWidth ${toast.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
