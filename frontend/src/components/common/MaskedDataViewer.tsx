'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MaskedDataViewerProps {
  value?: string | null;
  type?: 'citizenId' | 'bankAccount';
  className?: string;
  mono?: boolean;
}

/**
 * Format masked string according to PDPA standards:
 * - citizenId: 1-2345-xxxxx-xx-9
 * - bankAccount: xxx-x-x1234-x or xxx-xxxx123-x
 */
export const formatMaskedValue = (val?: string | null, type: 'citizenId' | 'bankAccount' = 'citizenId'): string => {
  if (!val) return '-';
  const clean = val.trim();
  const digits = clean.replace(/\D/g, '');

  if (type === 'citizenId') {
    if (digits.length === 13) {
      return `${digits[0]}-${digits.substring(1, 5)}-xxxxx-xx-${digits[12]}`;
    }
    return clean;
  }

  if (type === 'bankAccount') {
    if (digits.length >= 10) {
      const last4 = digits.slice(-4);
      return `xxx-x-x${last4}-x`;
    }
    if (digits.length > 4) {
      return `xxx-xxxx${digits.slice(-4)}`;
    }
    return clean;
  }

  return clean;
};

/**
 * Reusable PDPA Masked Data Viewer component with Eye toggle to reveal sensitive information.
 */
export const MaskedDataViewer: React.FC<MaskedDataViewerProps> = ({
  value,
  type = 'citizenId',
  className = '',
  mono = true,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  if (!value) {
    return <span className={`text-slate-400 ${className}`}>-</span>;
  }

  const maskedDisplay = formatMaskedValue(value, type);
  const displayValue = isRevealed ? value : maskedDisplay;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`${mono ? 'font-mono' : ''} select-all`}>
        {displayValue}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsRevealed(!isRevealed);
        }}
        title={isRevealed ? 'ซ่อนข้อมูล' : 'แสดงข้อมูลเต็ม'}
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
      >
        {isRevealed ? (
          <EyeOff className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </button>
    </span>
  );
};
