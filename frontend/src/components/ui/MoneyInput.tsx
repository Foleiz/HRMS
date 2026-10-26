'use client';

import React, { useState } from 'react';

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * ช่องกรอกจำนวนเงิน — ตอนไม่ได้แก้แสดงแบบมีลูกน้ำ + ทศนิยม 2 ตำแหน่ง (เช่น ฿53,250.00)
 * ตอนคลิกแก้จะเป็นตัวเลขล้วนให้พิมพ์ง่าย
 *   <MoneyInput value={amount} onChange={(n) => ...} />
 */
export const MoneyInput: React.FC<{
  value: number | null | undefined;
  onChange: (value: number) => void;
  /** สัญลักษณ์หน้าตัวเลข (ค่าเริ่มต้น ฿) — ใส่ '' เพื่อไม่แสดง */
  prefix?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
}> = ({ value, onChange, prefix = '฿', className = '', disabled, placeholder = '0.00', title }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const num = Number(value) || 0;
  const editing = draft !== null;

  return (
    <input
      type="text"
      inputMode="decimal"
      title={title}
      disabled={disabled}
      placeholder={placeholder}
      value={editing ? draft : value == null ? '' : `${prefix}${fmt(num)}`}
      onFocus={(e) => {
        setDraft(value == null || num === 0 ? '' : String(num));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        if ((raw.match(/\./g) || []).length > 1) return;
        setDraft(raw);
        onChange(raw === '' || raw === '.' ? 0 : parseFloat(raw));
      }}
      onBlur={() => setDraft(null)}
      className={`text-right tabular-nums ${className}`}
    />
  );
};
