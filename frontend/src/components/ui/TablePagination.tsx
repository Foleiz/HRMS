'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  totalLabel?: string;
}

/** แสดงเลขหน้าแบบย่อ เช่น 1 … 4 5 6 … 12 */
const getPageItems = (current: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const items: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push('…');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push('…');
  items.push(totalPages);
  return items;
};

/** ส่วนท้ายตาราง: เลือกจำนวนแถวต่อหน้า + เปลี่ยนหน้า */
export const TablePagination: React.FC<Props> = ({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className = '',
  totalLabel = 'รายการ',
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      {/* ซ้ายล่าง: เลือกจำนวนแถวต่อหน้า + สรุปจำนวนทั้งหมด */}
      <div className="flex items-center gap-2">
        <span>แสดง</span>
        <CustomSelect
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          numbered={false}
          size="sm"
          className="w-[68px] min-w-[64px]"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </CustomSelect>
        <span>แถวต่อหน้า</span>
        <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-1">
          (ทั้งหมด {total.toLocaleString()} {totalLabel})
        </span>
      </div>

      {/* ขวาล่าง: Pagination Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, current - 1))}
          disabled={current <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="หน้าก่อนหน้า"
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {getPageItems(current, totalPages).map((item, idx) =>
          item === '…' ? (
            <span key={`gap-${idx}`} className="w-7 text-center text-slate-400 dark:text-slate-500">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                item === current
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, current + 1))}
          disabled={current >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="หน้าถัดไป"
          aria-label="หน้าถัดไป"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
