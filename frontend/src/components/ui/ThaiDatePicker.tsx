'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
const THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const YEAR_GRID_SIZE = 12;

// แปลง Date -> string 'YYYY-MM-DD'
export const toInputDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// แปลง string 'YYYY-MM-DD' -> Date
export const parseInputDate = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// แปลง 'YYYY-MM-DD' -> 'dd/mm/yyyy' (พ.ศ.) เสมอ
export const formatThaiDate = (s: string): string => {
  if (!s) return '';
  const d = parseInputDate(s);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
};

export interface ThaiDatePickerProps {
  /** วันที่ รูปแบบ 'YYYY-MM-DD' หรือ '' */
  value?: string;
  /** ฟังก์ชัน callback เมื่อเลือกหรือล้างวันที่ ส่งกลับ 'YYYY-MM-DD' หรือ '' */
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  min?: string;
  max?: string;
  id?: string;
  name?: string;
  required?: boolean;
  align?: 'left' | 'right';
  error?: boolean;
}

/**
 * คอมโพเนนต์ปฏิทินไทยมาตรฐาน (เลือกวันเดียว)
 * แสดงผลเป็น dd/mm/yyyy (พ.ศ.) และส่งค่า YYYY-MM-DD
 */
export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = 'w-full',
  disabled = false,
  minDate: propMinDate,
  maxDate: propMaxDate,
  min,
  max,
  id,
  name,
  required = false,
  align = 'left',
  error = false,
}) => {
  const minDate = min ?? propMinDate;
  const maxDate = max ?? propMaxDate;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseInputDate(value) || new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [yearGridStart, setYearGridStart] = useState(() => (parseInputDate(value) || new Date()).getFullYear() - 5);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setOpen(false);
    setMonthPickerOpen(false);
    setYearPickerOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggleOpen = () => {
    if (disabled) return;
    if (open) {
      closeAll();
      return;
    }
    const target = parseInputDate(value) || new Date();
    setViewDate(target);
    setYearGridStart(target.getFullYear() - 5);
    setMonthPickerOpen(false);
    setYearPickerOpen(false);
    setOpen(true);
  };

  const handleDayClick = (day: Date) => {
    const dayStr = toInputDate(day);
    if (minDate && dayStr < minDate) return;
    if (maxDate && dayStr > maxDate) return;
    onChange(dayStr);
    closeAll();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toInputDate(new Date());

  const borderClass = error
    ? 'border-2 border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-slate-900 dark:text-slate-100'
    : 'border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl ${borderClass} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-slate-800 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900' : 'cursor-pointer'
        } dark:text-slate-100`}
      >
        <span className={value ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-400 dark:text-slate-500'}>
          {value ? formatThaiDate(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
      </button>

      {/* Hidden input to support form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          readOnly
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {open && (
        <div
          className={`absolute z-50 mt-1.5 w-[310px] sm:w-[320px] bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/80 shadow-2xl p-3.5 sm:p-4 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header: เลื่อนเดือน + ตัวเลือกเดือน/ปี */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setYearPickerOpen(false);
                  setMonthPickerOpen((o) => !o);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold transition-colors ${
                  monthPickerOpen
                    ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046] dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {THAI_MONTHS_FULL[month]}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMonthPickerOpen(false);
                  setYearPickerOpen((o) => {
                    const next = !o;
                    if (next) setYearGridStart(viewDate.getFullYear() - 5);
                    return next;
                  });
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold transition-colors ${
                  yearPickerOpen
                    ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046] dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {year + 543}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${yearPickerOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month / Year Grid Overlays */}
          <div className="relative">
            <div className="grid grid-cols-7 mb-1">
              {THAI_WEEKDAYS.map((w) => (
                <div key={w} className="h-7 flex items-center justify-center text-[11px] font-medium text-gray-400 dark:text-slate-500">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((date, idx) => {
                if (!date) return <div key={idx} className="h-9" />;
                const dStr = toInputDate(date);
                const isToday = dStr === todayStr;
                const isSelected = dStr === value;
                const isDisabled = (!!minDate && dStr < minDate) || (!!maxDate && dStr > maxDate);

                let dayBtnClass = 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700';
                if (isDisabled) {
                  dayBtnClass = 'text-gray-300 dark:text-slate-600 cursor-not-allowed';
                } else if (isSelected) {
                  dayBtnClass = 'bg-[#0B2046] dark:bg-blue-600 text-white font-semibold shadow-sm';
                } else if (isToday) {
                  dayBtnClass = 'ring-1 ring-[#0B2046]/70 dark:ring-blue-400 text-[#0B2046] dark:text-blue-300 font-semibold';
                }

                return (
                  <div key={idx} className="h-9 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDayClick(date)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors cursor-pointer ${dayBtnClass}`}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            {monthPickerOpen && (
              <div className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/60 p-3">
                <div className="grid grid-cols-4 gap-2">
                  {THAI_MONTHS_SHORT.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setViewDate((d) => new Date(d.getFullYear(), i, 1));
                        setMonthPickerOpen(false);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        i === month
                          ? 'bg-[#0B2046] dark:bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {yearPickerOpen && (
              <div className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setYearGridStart((y) => y - YEAR_GRID_SIZE)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    {yearGridStart + 543} – {yearGridStart + YEAR_GRID_SIZE - 1 + 543}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYearGridStart((y) => y + YEAR_GRID_SIZE)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: YEAR_GRID_SIZE }, (_, i) => yearGridStart + i).map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewDate((d) => new Date(y, d.getMonth(), 1));
                        setYearPickerOpen(false);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        y === year
                          ? 'bg-[#0B2046] dark:bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {y + 543}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer: วันที่เลือก + ปุ่มล้าง */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/60">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {value ? `วันที่เลือก: ${formatThaiDate(value)}` : 'ยังไม่ได้เลือกวันที่'}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange('');
                closeAll();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export interface ThaiDateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate: string, endDate: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  min?: string;
  max?: string;
  align?: 'left' | 'right';
}

/**
 * คอมโพเนนต์ปฏิทินไทยสำหรับเลือกช่วงวันที่ (Range)
 * คลิกครั้งแรกเลือกวันเริ่ม คลิกครั้งสองเลือกวันสิ้นสุด แสดงผลเป็น dd/mm/yyyy – dd/mm/yyyy
 */
export const ThaiDateRangePicker: React.FC<ThaiDateRangePickerProps> = ({
  startDate = '',
  endDate = '',
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = 'w-full sm:w-[320px]',
  disabled = false,
  minDate: propMinDate,
  maxDate: propMaxDate,
  min,
  max,
  align = 'left',
}) => {
  const minDate = min ?? propMinDate;
  const maxDate = max ?? propMaxDate;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseInputDate(startDate) || new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [yearGridStart, setYearGridStart] = useState(() => (parseInputDate(startDate) || new Date()).getFullYear() - 5);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setOpen(false);
    setMonthPickerOpen(false);
    setYearPickerOpen(false);
    setHoverDate(null);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggleOpen = () => {
    if (disabled) return;
    if (open) {
      closeAll();
      return;
    }
    const target = parseInputDate(startDate) || parseInputDate(endDate) || new Date();
    setViewDate(target);
    setYearGridStart(target.getFullYear() - 5);
    setMonthPickerOpen(false);
    setYearPickerOpen(false);
    setHoverDate(null);
    setOpen(true);
  };

  const handleDayClick = (day: Date) => {
    const dayStr = toInputDate(day);
    if (minDate && dayStr < minDate) return;
    if (maxDate && dayStr > maxDate) return;
    setHoverDate(null);

    if (!startDate || (startDate && endDate)) {
      onChange(dayStr, '');
    } else if (dayStr < startDate) {
      onChange(dayStr, startDate);
      setOpen(false);
    } else {
      onChange(startDate, dayStr);
      setOpen(false);
    }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toInputDate(new Date());
  const isMidSelecting = !!startDate && !endDate;
  const hoverStr = hoverDate ? toInputDate(hoverDate) : null;
  const previewStart = isMidSelecting && hoverStr ? (hoverStr < startDate ? hoverStr : startDate) : null;
  const previewEnd = isMidSelecting && hoverStr ? (hoverStr < startDate ? startDate : hoverStr) : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-slate-800 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900' : 'cursor-pointer hover:border-gray-300 dark:hover:border-slate-600'
        } dark:text-slate-100`}
      >
        <span className={startDate || endDate ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-400 dark:text-slate-500'}>
          {startDate ? formatThaiDate(startDate) : placeholder}
          <span className="text-gray-300 dark:text-slate-600 mx-1.5">–</span>
          {endDate ? formatThaiDate(endDate) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 w-[310px] sm:w-[320px] bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/80 shadow-2xl p-3.5 sm:p-4 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setYearPickerOpen(false);
                  setMonthPickerOpen((o) => !o);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold transition-colors ${
                  monthPickerOpen
                    ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046] dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {THAI_MONTHS_FULL[month]}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMonthPickerOpen(false);
                  setYearPickerOpen((o) => {
                    const next = !o;
                    if (next) setYearGridStart(viewDate.getFullYear() - 5);
                    return next;
                  });
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold transition-colors ${
                  yearPickerOpen
                    ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046] dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {year + 543}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${yearPickerOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Grid */}
          <div className="relative">
            <div className="grid grid-cols-7 mb-1">
              {THAI_WEEKDAYS.map((w) => (
                <div key={w} className="h-7 flex items-center justify-center text-[11px] font-medium text-gray-400 dark:text-slate-500">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7" onMouseLeave={() => setHoverDate(null)}>
              {cells.map((date, idx) => {
                if (!date) return <div key={idx} className="h-9" />;
                const dStr = toInputDate(date);
                const isToday = dStr === todayStr;
                const isConfirmedStart = dStr === startDate;
                const isConfirmedEnd = !!endDate && dStr === endDate;
                const isPreviewHoverDay = isMidSelecting && hoverStr === dStr;

                const confirmedInBand = !!startDate && !!endDate && dStr >= startDate && dStr <= endDate;
                const previewInBand = !!previewStart && !!previewEnd && dStr >= previewStart && dStr <= previewEnd;
                const inBand = confirmedInBand || previewInBand;
                const bandStartValue = confirmedInBand ? startDate : previewStart;
                const bandEndValue = confirmedInBand ? endDate : previewEnd;
                const isBandEdgeStart = inBand && dStr === bandStartValue;
                const isBandEdgeEnd = inBand && dStr === bandEndValue;
                const isDisabled = (!!minDate && dStr < minDate) || (!!maxDate && dStr > maxDate);

                let dayBtnClass = 'text-gray-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700';
                if (isDisabled) {
                  dayBtnClass = 'text-gray-300 dark:text-slate-600 cursor-not-allowed';
                } else if (isConfirmedStart || isConfirmedEnd) {
                  dayBtnClass = 'bg-[#0B2046] dark:bg-blue-600 text-white font-semibold shadow-sm';
                } else if (isPreviewHoverDay) {
                  dayBtnClass = 'ring-2 ring-[#0B2046] dark:ring-blue-400 text-[#0B2046] dark:text-blue-300 font-semibold bg-white dark:bg-slate-900';
                } else if (isToday) {
                  dayBtnClass = 'ring-1 ring-[#0B2046]/70 dark:ring-blue-400 text-[#0B2046] dark:text-blue-300 font-semibold';
                }

                return (
                  <div
                    key={idx}
                    className={`h-9 flex items-center justify-center ${
                      inBand ? (confirmedInBand ? 'bg-[#0B2046]/10 dark:bg-blue-500/20' : 'bg-[#0B2046]/[0.06] dark:bg-blue-500/10') : ''
                    } ${isBandEdgeStart ? 'rounded-l-full' : ''} ${isBandEdgeEnd ? 'rounded-r-full' : ''}`}
                  >
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDayClick(date)}
                      onMouseEnter={() => {
                        if (isMidSelecting) setHoverDate(date);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors cursor-pointer ${dayBtnClass}`}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            {monthPickerOpen && (
              <div className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/60 p-3">
                <div className="grid grid-cols-4 gap-2">
                  {THAI_MONTHS_SHORT.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setViewDate((d) => new Date(d.getFullYear(), i, 1));
                        setMonthPickerOpen(false);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        i === month
                          ? 'bg-[#0B2046] dark:bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {yearPickerOpen && (
              <div className="absolute top-0 left-0 right-0 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setYearGridStart((y) => y - YEAR_GRID_SIZE)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    {yearGridStart + 543} – {yearGridStart + YEAR_GRID_SIZE - 1 + 543}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYearGridStart((y) => y + YEAR_GRID_SIZE)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: YEAR_GRID_SIZE }, (_, i) => yearGridStart + i).map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewDate((d) => new Date(y, d.getMonth(), 1));
                        setYearPickerOpen(false);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        y === year
                          ? 'bg-[#0B2046] dark:bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {y + 543}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/60">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {startDate ? `เริ่ม: ${formatThaiDate(startDate)}` : 'ยังไม่ได้เลือกวันที่'}
            </span>
            <button
              type="button"
              onClick={() => {
                setHoverDate(null);
                onChange('', '');
                closeAll();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
