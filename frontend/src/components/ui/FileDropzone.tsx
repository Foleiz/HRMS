'use client';

import React, { useId, useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface FileDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  /** นามสกุลที่รับ เช่น ['.pdf', '.jpg', '.jpeg', '.png'] */
  accept?: string[];
  maxSizeMB?: number;
  /** เน้นสีเตือนเมื่อจำเป็นต้องแนบแต่ยังไม่ได้แนบ */
  required?: boolean;
  /** ปิดใช้งาน — แสดงพื้นเทา กดหรือลากวางไม่ได้ พร้อมข้อความบอกเหตุผล */
  disabled?: boolean;
  disabledText?: string;
  className?: string;
  'aria-labelledby'?: string;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * กล่องแนบไฟล์ — ลากไฟล์มาวาง หรือคลิกเพื่อเลือก (ใช้ได้ทั้งเมาส์และคีย์บอร์ด)
 * ตรวจนามสกุลและขนาดก่อนรับไฟล์ แสดงชื่อไฟล์ + ปุ่มลบเมื่อแนบแล้ว
 */
export function FileDropzone({
  file,
  onChange,
  accept = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxSizeMB = 5,
  required,
  disabled,
  disabledText = 'ไม่ต้องแนบไฟล์',
  className = '',
  ...rest
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = accept.map((a) => a.replace('.', '').toUpperCase()).filter((v, i, arr) => arr.indexOf(v) === i && v !== 'JPEG').join(', ');

  const take = (f: File | null | undefined) => {
    if (!f) return;
    const ext = `.${f.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (accept.length > 0 && !accept.includes(ext)) {
      setError(`รองรับเฉพาะไฟล์ ${typeLabel}`);
      return;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`ไฟล์ใหญ่เกิน ${maxSizeMB} MB`);
      return;
    }
    setError(null);
    onChange(f);
  };

  if (disabled) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div
          aria-disabled="true"
          className="flex-1 min-h-[150px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 px-4 py-6 text-center cursor-not-allowed select-none"
        >
          <span className="w-12 h-12 rounded-xl bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <UploadCloud className="w-6 h-6" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{disabledText}</span>
        </div>
      </div>
    );
  }

  if (file) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
          <span className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0B2046] dark:text-blue-300 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.name}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{formatSize(file.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            aria-label={`ลบไฟล์ ${file.name}`}
            className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`flex-1 min-h-[150px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#0B2046]/20 ${
          dragging
            ? 'border-[#0B2046] bg-blue-50/70 dark:bg-blue-900/20'
            : required
              ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10'
              : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/60'
        }`}
      >
        <span className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
          <UploadCloud className="w-6 h-6" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {dragging ? (
            'ปล่อยไฟล์ที่นี่'
          ) : (
            <>
              ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-700 dark:text-blue-400">คลิกเพื่อเลือกไฟล์</span>
            </>
          )}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          รองรับ {typeLabel} (ขนาดไม่เกิน {maxSizeMB} MB)
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept.join(',')}
          aria-labelledby={rest['aria-labelledby']}
          onChange={(e) => take(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default FileDropzone;
