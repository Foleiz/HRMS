'use client';

import React, { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';
import type { ManualScreenshot } from '@/types/manual';

interface ManualLightboxProps {
  screenshot: ManualScreenshot | null;
  onClose: () => void;
}

export const ManualLightbox: React.FC<ManualLightboxProps> = ({
  screenshot,
  onClose,
}) => {
  useEffect(() => {
    if (!screenshot) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenshot, onClose]);

  if (!screenshot) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150 print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={screenshot.alt}
    >
      <div
        className="relative max-w-6xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 min-w-0">
            <ZoomIn className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {screenshot.caption}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่างขยายรูป"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-auto p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshot.src}
            alt={screenshot.alt}
            className="max-w-full max-h-[78vh] w-auto h-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-md object-contain"
          />
        </div>
      </div>
    </div>
  );
};
