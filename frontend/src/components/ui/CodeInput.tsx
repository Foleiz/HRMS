'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { codeService, CodeType } from '@/services/codeService';

interface CodeInputProps {
  /** ประเภทรหัส — ใช้ขอรหัสแนะนำจาก /api/codes/next */
  type: CodeType;
  value: string;
  /** ควรใช้ functional setState ฝั่งผู้เรียก เพราะรหัสแนะนำมาแบบ async */
  onChange: (value: string) => void;
  mode: 'create' | 'edit';
  label: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** เปลี่ยนค่านี้เพื่อขอรหัสแนะนำใหม่ (เช่น ตอนเปิดฟอร์มซ้ำโดยไม่ unmount) */
  resetKey?: unknown;
  labelClassName?: string;
  inputClassName?: string;
  error?: string | null;
  /** รูปแบบรหัส (เช่น DIV, 3) + รหัสที่มีอยู่แล้วในหน้า → แสดงรหัสแนะนำทันทีโดยไม่ต้องรอ API */
  prefix?: string;
  digits?: number;
  existingCodes?: (string | null | undefined)[];
}

/** รหัสถัดไปจากรายการที่มีอยู่ (รูปแบบเดียวกับ CodeGenerator ฝั่ง backend) */
export function nextCodeFrom(existing: (string | null | undefined)[], prefix: string, digits: number): string {
  const re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[-_]?(\\d+)$', 'i');
  let max = 0;
  for (const c of existing) {
    const m = (c || '').trim().match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return prefix + String(max + 1).padStart(digits, '0');
}

const DEFAULT_LABEL = 'block text-xs font-semibold text-slate-700 dark:text-slate-300';
const DEFAULT_INPUT =
  'w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-blue-500/20 dark:focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed';

/**
 * ช่องรหัสแบบ "ระบบแนะนำ แก้ได้"
 * - ตอนเพิ่ม: ดึงรหัสถัดไปมาใส่ให้ พิมพ์แก้ได้ กดปุ่ม ✨ เพื่อขอรหัสแนะนำใหม่
 * - ตอนแก้ไข: ล็อก (รหัสเปลี่ยนไม่ได้หลังบันทึก)
 */
export function CodeInput({
  type,
  value,
  onChange,
  mode,
  label,
  required = false,
  placeholder,
  maxLength = 50,
  resetKey,
  labelClassName = DEFAULT_LABEL,
  inputClassName = DEFAULT_INPUT,
  error,
  prefix,
  digits = 3,
  existingCodes,
}: CodeInputProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = mode === 'edit';
  // ผู้ใช้พิมพ์เองแล้ว → รหัสจาก API ที่มาทีหลังจะไม่ทับ
  const touchedRef = useRef(false);

  const localSuggestion = () => (prefix && existingCodes ? nextCodeFrom(existingCodes, prefix, digits) : '');

  const suggest = async (force: boolean) => {
    const local = localSuggestion();
    if (local && (force || !touchedRef.current)) onChange(local);
    setLoading(!local);
    try {
      const next = await codeService.getNext(type);
      if (next && (force || !touchedRef.current)) onChange(next);
    } catch {
      // ขอจาก API ไม่ได้ → ใช้รหัสที่คำนวณในหน้า (ถ้ามี) หรือปล่อยว่างให้ระบบสร้างตอนบันทึก
    } finally {
      setLoading(false);
    }
  };

  // เปิดฟอร์มเพิ่ม → ใส่รหัสแนะนำทันที
  // (setTimeout 0: ให้ทำหลัง effect ของฟอร์มแม่ที่ล้างค่าเดิม ไม่อย่างนั้นรหัสจะถูกล้างทิ้ง)
  useEffect(() => {
    touchedRef.current = false;
    if (isEdit) return;
    const t = setTimeout(() => suggest(false), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, resetKey]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={labelClassName}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {!isEdit && (
          <button
            type="button"
            onClick={() => {
              touchedRef.current = false;
              suggest(true);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer disabled:opacity-50"
            title="ขอรหัสที่ระบบแนะนำ"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            รหัสแนะนำ
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          required={required}
          disabled={isEdit}
          maxLength={maxLength}
          value={value}
          onChange={(e) => {
            touchedRef.current = true;
            onChange(e.target.value.toUpperCase().replace(/\s+/g, ''));
          }}
          placeholder={placeholder ?? (loading ? 'กำลังสร้างรหัส...' : 'ระบบจะสร้างให้อัตโนมัติ')}
          className={`${inputClassName} ${isEdit ? 'pr-8' : ''}`}
        />
        {isEdit && <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>
      {error ? (
        <p className="text-[11px] text-rose-500 mt-1">{error}</p>
      ) : (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          {isEdit ? 'รหัสเปลี่ยนไม่ได้หลังบันทึก' : 'ระบบแนะนำรหัสให้ พิมพ์แก้เป็นรหัสของคุณเองได้'}
        </p>
      )}
    </div>
  );
}
