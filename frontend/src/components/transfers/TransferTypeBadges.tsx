'use client';

import React from 'react';
import type { TransferTypeCode } from '@/types/transfer';

export const TRANSFER_TYPE_META: Record<TransferTypeCode, { label: string; cls: string }> = {
  DEPARTMENT_TRANSFER: {
    label: 'ย้ายแผนก',
    cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  PROMOTION: {
    label: 'เลื่อนตำแหน่ง',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  POSITION_CHANGE: {
    label: 'เปลี่ยนตำแหน่ง',
    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  DEMOTION: {
    label: 'ลดตำแหน่ง',
    cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  },
};

const ORDER: TransferTypeCode[] = ['DEPARTMENT_TRANSFER', 'PROMOTION', 'POSITION_CHANGE', 'DEMOTION'];

/** แปลงรหัสที่เก็บไว้ (รวมค่าแบบเดิม) เป็นรายการประเภท */
export function parseTransferTypes(stored?: string | null, list?: string[] | null): TransferTypeCode[] {
  const raw = list && list.length ? list : (stored || '').split(',');
  const out = new Set<TransferTypeCode>();
  raw.map((r) => r.trim().toUpperCase()).forEach((r) => {
    if (r === 'TRANSFER_AND_PROMOTION') {
      out.add('DEPARTMENT_TRANSFER');
      out.add('PROMOTION');
    } else if (r === 'PROMOTION_AND_SUPERVISOR') {
      out.add('PROMOTION');
    } else if ((ORDER as string[]).includes(r)) {
      out.add(r as TransferTypeCode);
    }
  });
  return ORDER.filter((c) => out.has(c));
}

/** จัดประเภทฝั่งหน้าจอ (ใช้แสดงตัวอย่างก่อนบันทึก — backend คำนวณซ้ำอีกครั้ง) */
export function classifyTransfer(args: {
  fromDepartmentId?: number | null;
  toDepartmentId?: number | null;
  fromPositionId?: number | null;
  toPositionId?: number | null;
  fromRank?: number | null;
  toRank?: number | null;
}): TransferTypeCode[] {
  const { fromDepartmentId, toDepartmentId, fromPositionId, toPositionId, fromRank, toRank } = args;
  const codes: TransferTypeCode[] = [];
  if ((fromDepartmentId ?? null) !== (toDepartmentId ?? null)) codes.push('DEPARTMENT_TRANSFER');
  if ((fromPositionId ?? null) !== (toPositionId ?? null)) {
    if (fromRank != null && toRank != null && toRank > fromRank) codes.push('PROMOTION');
    else if (fromRank != null && toRank != null && toRank < fromRank) codes.push('DEMOTION');
    else codes.push('POSITION_CHANGE');
  }
  return codes;
}

export function TransferTypeBadges({ types, size = 'sm' }: { types: TransferTypeCode[]; size?: 'sm' | 'md' }) {
  if (!types.length) return <span className="text-slate-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center rounded-full border font-semibold ${
            size === 'md' ? 'text-xs px-3 py-1' : 'text-[11px] px-2.5 py-0.5'
          } ${TRANSFER_TYPE_META[t].cls}`}
        >
          {TRANSFER_TYPE_META[t].label}
        </span>
      ))}
    </div>
  );
}
