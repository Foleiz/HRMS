'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface LeaveDateRangePickerProps {
  /** วันที่เริ่มต้น รูปแบบ 'YYYY-MM-DD' หรือ '' ถ้ายังไม่ได้เลือก */
  startDate: string;
  /** วันที่สิ้นสุด รูปแบบ 'YYYY-MM-DD' หรือ '' ถ้ายังไม่ได้เลือก (โหมด single จะเท่ากับ startDate เสมอ) */
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  /** 'range' (ค่าเริ่มต้น) = เลือกช่วงวันที่ (คลิก 2 ครั้ง) สำหรับลาแบบเต็มวัน, 'single' = เลือกวันเดียวจบ สำหรับลาแบบครึ่งวัน */
  mode?: 'range' | 'single';
  className?: string;
}

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

// แปลง Date -> string 'YYYY-MM-DD' โดยใช้ค่าวัน/เดือน/ปีตามเวลาท้องถิ่น (ไม่ผ่าน UTC เพื่อกันปัญหาวันเลื่อน)
const toInputDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// แปลง string 'YYYY-MM-DD' -> Date ตามเวลาท้องถิ่น (ไม่ใช้ new Date(string) ตรงๆ เพราะจะตีความเป็น UTC แล้วอาจเพี้ยนวันได้)
const parseInputDate = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatThaiShort = (s: string): string => {
  const d = parseInputDate(s);
  if (!d) return '';
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

/**
 * ตัวเลือกช่วงวันที่แบบปฏิทินเดียว — คลิกครั้งแรกเลือกวันเริ่มต้น คลิกครั้งที่สองเลือกวันสิ้นสุด
 * ใช้แทน input[type=date] คู่เดิม สำหรับกรณีลาแบบ "เต็มวัน" (ช่วงวันที่)
 * รองรับ: ตัวเลือกเดือน/ปีแบบ dropdown grid, จุดเน้นวันที่ปัจจุบัน, และแสดงตัวอย่างช่วงแบบเรียลไทม์ตอนเลื่อนเมาส์เลือกวันสิ้นสุด
 */
export const LeaveDateRangePicker: React.FC<LeaveDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  mode = 'range',
  className = 'w-[320px] max-w-none',
}) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parseInputDate(startDate) || new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [yearGridStart, setYearGridStart] = useState(() => new Date().getFullYear() - 5);
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

  // เปิดปฏิทินให้โฟกัสที่เดือนของวันเริ่มต้นเสมอเมื่อเปิดใหม่ (ถ้ามีเลือกไว้แล้ว)
  const handleToggleOpen = () => {
    if (open) {
      closeAll();
      return;
    }
    const target = parseInputDate(startDate) || parseInputDate(endDate) || new Date();
    setViewDate(target);
    setMonthPickerOpen(false);
    setYearPickerOpen(false);
    setHoverDate(null);
    setOpen(true);
  };

  const toggleMonthPicker = () => {
    setYearPickerOpen(false);
    setMonthPickerOpen((o) => !o);
  };

  const toggleYearPicker = () => {
    setMonthPickerOpen(false);
    setYearPickerOpen((o) => {
      const next = !o;
      if (next) setYearGridStart(viewDate.getFullYear() - 5);
      return next;
    });
  };

  const handleDayClick = (day: Date) => {
    const dayStr = toInputDate(day);
    setHoverDate(null);
    if (mode === 'single') {
      // เลือกวันเดียวจบ (ใช้กับลาแบบครึ่งวัน) -> ตั้งค่าและปิดปฏิทินทันที
      onChange(dayStr, dayStr);
      setOpen(false);
      return;
    }
    if (!startDate || (startDate && endDate)) {
      // ยังไม่ได้เลือกอะไรเลย หรือเลือกครบคู่แล้ว -> เริ่มเลือกใหม่
      onChange(dayStr, '');
    } else if (dayStr < startDate) {
      // คลิกวันที่ก่อนวันเริ่มต้นเดิม -> สลับให้เป็นวันเริ่มต้นใหม่แทน
      onChange(dayStr, startDate);
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
  const isMidSelecting = mode === 'range' && !!startDate && !endDate;
  const hoverStr = hoverDate ? toInputDate(hoverDate) : null;
  // ช่วงตัวอย่างแบบเรียลไทม์ระหว่างวันเริ่มต้นกับตำแหน่งที่เลื่อนเมาส์ไปวาง (ยังไม่ยืนยัน)
  const previewStart = isMidSelecting && hoverStr ? (hoverStr < startDate ? hoverStr : startDate) : null;
  const previewEnd = isMidSelecting && hoverStr ? (hoverStr < startDate ? startDate : hoverStr) : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`${className} flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer`}
      >
        <span className={startDate || endDate ? 'text-gray-800' : 'text-gray-400'}>
          {mode === 'single' ? (
            startDate ? formatThaiShort(startDate) : 'dd/mm/yyyy'
          ) : (
            <>
              {startDate ? formatThaiShort(startDate) : 'dd/mm/yyyy'}
              <span className="text-gray-300 mx-1.5">–</span>
              {endDate ? formatThaiShort(endDate) : 'dd/mm/yyyy'}
            </>
          )}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-[320px] bg-white rounded-xl border border-gray-100 shadow-lg p-4">
          {/* ─── Header: ปุ่มเลื่อนเดือน + ตัวเลือกเดือน/ปีแบบ dropdown grid ─── */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMonthPicker}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold transition-colors ${
                  monthPickerOpen ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {THAI_MONTHS_FULL[month]}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={toggleYearPicker}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold transition-colors ${
                  yearPickerOpen ? 'border-[#0B2046] bg-[#0B2046]/5 text-[#0B2046]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {year + 543}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${yearPickerOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ─── พื้นที่ปฏิทิน (มี overlay ตัวเลือกเดือน/ปีซ้อนทับได้) ─── */}
          <div className="relative">
            <div className="grid grid-cols-7 mb-1">
              {THAI_WEEKDAYS.map((w) => (
                <div key={w} className="h-7 flex items-center justify-center text-[11px] font-medium text-gray-400">
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

                let dayBtnClass = 'text-gray-700 hover:bg-white/70';
                if (isConfirmedStart || isConfirmedEnd) {
                  dayBtnClass = 'bg-[#0B2046] text-white font-semibold shadow-sm';
                } else if (isPreviewHoverDay) {
                  dayBtnClass = 'ring-2 ring-[#0B2046] text-[#0B2046] font-semibold bg-white';
                } else if (isToday) {
                  dayBtnClass = 'ring-1 ring-[#0B2046]/60 text-[#0B2046] font-semibold';
                }

                return (
                  <div
                    key={idx}
                    className={`h-9 flex items-center justify-center ${
                      inBand ? (confirmedInBand ? 'bg-[#0B2046]/10' : 'bg-[#0B2046]/[0.06]') : ''
                    } ${isBandEdgeStart ? 'rounded-l-full' : ''} ${isBandEdgeEnd ? 'rounded-r-full' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(date)}
                      onMouseEnter={() => {
                        if (isMidSelecting) setHoverDate(date);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${dayBtnClass}`}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            {monthPickerOpen && (
              <div className="absolute top-0 left-0 right-0 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3">
                <div className="grid grid-cols-4 gap-2">
                  {THAI_MONTHS_SHORT.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setViewDate((d) => new Date(d.getFullYear(), i, 1));
                        setMonthPickerOpen(false);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        i === month ? 'bg-[#0B2046] text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {yearPickerOpen && (
              <div className="absolute top-0 left-0 right-0 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setYearGridStart((y) => y - YEAR_GRID_SIZE)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-gray-500">
                    {yearGridStart + 543} – {yearGridStart + YEAR_GRID_SIZE - 1 + 543}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYearGridStart((y) => y + YEAR_GRID_SIZE)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
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
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        y === year ? 'bg-[#0B2046] text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {y + 543}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Footer: วันเริ่มต้นที่เลือกไว้ + ปุ่มล้าง ─── */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {startDate
                ? mode === 'single'
                  ? `วันที่เลือก: ${formatThaiShort(startDate)}`
                  : `เริ่ม: ${formatThaiShort(startDate)}`
                : 'ยังไม่ได้เลือกวันที่'}
            </span>
            <button
              type="button"
              onClick={() => {
                setHoverDate(null);
                onChange('', '');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
