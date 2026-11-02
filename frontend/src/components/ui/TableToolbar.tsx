'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export const searchInputClass =
  'w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 dark:text-slate-200 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ' +
  'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
  'dark:focus:ring-blue-500/20 dark:focus:border-blue-500 transition-all';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** helper สำหรับส่งค่า string ออกไปโดยตรง */
  onValueChange?: (value: string) => void;
  /** คลาสของ wrapper นอกสุด (ค่าเริ่มต้น: relative max-w-sm w-full shrink-0) */
  containerClassName?: string;
  /** แสดงปุ่มกากบาทล้างข้อความเมื่อมีค่า */
  clearable?: boolean;
}

/**
 * ช่องค้นหามาตรฐานกลางของระบบ (ทรงมน พื้นหลัง #F1F5F9 ไอคอนแว่นขยายด้านซ้าย)
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      placeholder = 'ค้นหา...',
      containerClassName = 'relative max-w-sm w-full shrink-0',
      className = '',
      clearable = false,
      ...rest
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    const handleClear = () => {
      onValueChange?.('');
      if (onChange) {
        const syntheticEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className={containerClassName}>
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`${searchInputClass} ${clearable && value ? 'pr-8' : ''} ${className}`}
          {...rest}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={handleClear}
            title="ล้างคำค้นหา"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

export interface TableToolbarProps {
  /** ค่าในช่องค้นหา (ถ้าส่งมา จะแสดง SearchInput ด้านซ้ายสุดโดยอัตโนมัติ) */
  searchValue?: string;
  /** callback เมื่อพิมพ์ค้นหา */
  onSearchChange?: (value: string) => void;
  /** ข้อความ placeholder ในช่องค้นหา */
  searchPlaceholder?: string;
  /** คลาสความกว้างของช่องค้นหา (ค่าเริ่มต้น: relative max-w-sm w-full shrink-0) */
  searchContainerClassName?: string;
  /** กรณีต้องการส่ง element ช่องค้นหาเข้ามาเอง */
  searchSlot?: React.ReactNode;
  /** ตัวกรองต่างๆ (Dropdown, DatePicker, Status Filter) — จะถูกจัดเรียงต่อจากช่องค้นหาทางด้านซ้ายเสมอ */
  filters?: React.ReactNode;
  /** ปุ่มคำสั่งด้านขวาสุด (เช่น สลับมุมมอง การ์ด/ตาราง, ยุบ/ขยาย, + เพิ่มข้อมูล, ส่งออกไฟล์) */
  actions?: React.ReactNode;
  /** คลาสเพิ่มเติมของแถว Toolbar นอกสุด */
  className?: string;
}

/**
 * โครงสร้างแถบเครื่องมือตารางมาตรฐานกลาง (TableToolbar)
 * บังคับลำดับทิศทางเดียวกันทั้งระบบ:
 * [ซ้ายสุด: ช่องค้นหา] -> [ถัดมา: ตัวกรอง Filters ต่างๆ] <------ เว้นระยะ ------> [ขวาสุด: ปุ่มสลับมุมมอง / ปุ่ม Action]
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'ค้นหา...',
  searchContainerClassName,
  searchSlot,
  filters,
  actions,
  className = '',
}) => {
  const hasSearch = searchSlot !== undefined || searchValue !== undefined;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      {/* ฝั่งซ้าย: ช่องค้นหาต้องขึ้นก่อนเสมอ แล้วตามด้วยตัวกรอง (Filters) */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto flex-1">
        {searchSlot !== undefined ? (
          searchSlot
        ) : hasSearch ? (
          <SearchInput
            value={searchValue ?? ''}
            onValueChange={onSearchChange}
            placeholder={searchPlaceholder}
            containerClassName={searchContainerClassName}
          />
        ) : null}

        {filters}
      </div>

      {/* ฝั่งขวา: ปุ่มสลับมุมมอง / ปุ่มเพิ่มข้อมูล / ปุ่มดำเนินการ */}
      {actions && (
        <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
