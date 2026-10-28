'use client';

import React, { useCallback, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

/**
 * state สำหรับเรียงตารางด้วยการคลิกหัวคอลัมน์ (แบบเดียวกับหน้าจัดการพนักงาน)
 * sortField = null คือการเรียงค่าเริ่มต้นของหน้า (เช่น รายการล่าสุดอยู่บนสุด)
 */
export function useTableSort<K extends string>(initialField: K | null = null, initialDirection: SortDirection = 'asc') {
  const [sortField, setSortField] = useState<K | null>(initialField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = useCallback(
    (field: K, firstDirection: SortDirection = 'asc') => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection(firstDirection);
      }
    },
    [sortField]
  );

  return { sortField, sortDirection, handleSort };
}

/** เปรียบเทียบค่าสำหรับ sort — ค่าว่างไปท้ายเสมอ, ข้อความเทียบแบบภาษาไทย */
export function compareSortValues(a: string | number | null | undefined, b: string | number | null | undefined, direction: SortDirection): number {
  const emptyA = a === null || a === undefined || a === '';
  const emptyB = b === null || b === undefined || b === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  const cmp =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), 'th', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? cmp : -cmp;
}

interface SortableThProps<K extends string> {
  label: React.ReactNode;
  field: K;
  sortField: K | null;
  sortDirection: SortDirection;
  onSort: (field: K, firstDirection?: SortDirection) => void;
  /** ทิศทางแรกเมื่อคลิกครั้งแรก (คอลัมน์วันที่ควรเป็น desc = ล่าสุดก่อน) */
  firstDirection?: SortDirection;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

/** หัวคอลัมน์ที่คลิกเพื่อเรียงลำดับได้ — ใช้คู่กับ table-standard */
export function SortableTh<K extends string>({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  firstDirection = 'asc',
  align = 'left',
  className = '',
}: SortableThProps<K>) {
  const active = sortField === field;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th
      onClick={() => onSort(field, firstDirection)}
      className={`cursor-pointer select-none hover:bg-[#122c5e] transition-colors whitespace-nowrap ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
      title="คลิกเพื่อเรียงลำดับ"
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className={`flex items-center gap-1 ${justify}`}>
        <span>{label}</span>
        {active ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-blue-300" />
          ) : (
            <ArrowDown className="w-3 h-3 text-blue-300" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-white/40" />
        )}
      </div>
    </th>
  );
}
