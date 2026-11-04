'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface ThaiTimePickerProps {
  value: string; // Format "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  align?: 'left' | 'right' | 'auto';
  showQuickMinutes?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const QUICK_MINUTES = ['00', '15', '30', '45'];

const ITEM_HEIGHT = 36; // ความสูงต่อแถว (px)
const VISIBLE_ROWS = 5; // เห็น 5 แถว: 2 บน · 1 ที่เลือก · 2 ล่าง
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS; // 180px
const PADDING = ITEM_HEIGHT * 2; // เว้นบน-ล่าง 2 แถว ให้แถวแรก/สุดท้ายมาอยู่กลางได้

interface WheelColumnProps {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  isOpen: boolean;
  ariaLabel?: string;
}

function WheelColumn({ items, selected, onSelect, isOpen, ariaLabel }: WheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.indexOf(selected)));

  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Dragging state
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const hasMovedRef = useRef(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeIndex when selected changes from outside
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx !== -1 && idx !== activeIndexRef.current && !isDraggingRef.current) {
      activeIndexRef.current = idx;
      setActiveIndex(idx);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: idx * ITEM_HEIGHT,
          behavior: 'smooth',
        });
      }
    }
  }, [selected, items]);

  // Initial scroll to position on open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const idx = Math.max(0, items.indexOf(selected));
      scrollRef.current.scrollTop = idx * ITEM_HEIGHT;
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    }
  }, [isOpen, selected, items]);

  // Snap to nearest index and fire onSelect
  const snapToNearest = useCallback(
    (currentScrollTop: number, smooth = true) => {
      const targetIdx = Math.max(0, Math.min(items.length - 1, Math.round(currentScrollTop / ITEM_HEIGHT)));
      activeIndexRef.current = targetIdx;
      setActiveIndex(targetIdx);
      const targetVal = items[targetIdx];
      onSelect(targetVal);

      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: targetIdx * ITEM_HEIGHT,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [items, onSelect]
  );

  // Step exactly 1 notch per mouse wheel turn (+1 / -1)
  const lastWheelTimeRef = useRef(0);
  const isWheelingRef = useRef(false);
  const wheelResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      // Throttle rapid scroll events so each notch moves exactly 1 step
      if (now - lastWheelTimeRef.current < 45) return;
      lastWheelTimeRef.current = now;

      isWheelingRef.current = true;
      if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);
      wheelResetTimerRef.current = setTimeout(() => {
        isWheelingRef.current = false;
      }, 150);

      const direction = e.deltaY > 0 ? 1 : -1;
      const currentIdx = activeIndexRef.current;
      const nextIdx = Math.max(0, Math.min(items.length - 1, currentIdx + direction));

      if (nextIdx !== currentIdx) {
        activeIndexRef.current = nextIdx;
        setActiveIndex(nextIdx);
        onSelect(items[nextIdx]);
        el.scrollTo({
          top: nextIdx * ITEM_HEIGHT,
          behavior: 'smooth',
        });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [items, onSelect]);

  // Handle native drag or momentum scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || isWheelingRef.current) return;
    const scrollTop = e.currentTarget.scrollTop;
    const currentIdx = Math.max(0, Math.min(items.length - 1, Math.round(scrollTop / ITEM_HEIGHT)));
    setActiveIndex(currentIdx);

    // Debounce snap & select
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      snapToNearest(scrollTop, true);
    }, 120);
  };

  // Click & Drag-to-Scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startYRef.current = e.clientY;
    startScrollTopRef.current = scrollRef.current.scrollTop;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !scrollRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      if (Math.abs(deltaY) > 3) {
        hasMovedRef.current = true;
      }
      const newScrollTop = startScrollTopRef.current - deltaY;
      scrollRef.current.scrollTop = newScrollTop;

      const currentIdx = Math.max(0, Math.min(items.length - 1, Math.round(newScrollTop / ITEM_HEIGHT)));
      setActiveIndex(currentIdx);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (scrollRef.current && hasMovedRef.current) {
        snapToNearest(scrollRef.current.scrollTop, true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Direct Click on an item
  const handleItemClick = (index: number) => {
    if (hasMovedRef.current) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
    onSelect(items[index]);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }
  };

  // คีย์บอร์ด: ↑/↓ เลื่อนทีละ 1, PageUp/PageDown ทีละ 5, Home/End ไปต้น/ท้าย
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
    let next: number | null = null;
    if (e.key in step) next = activeIndexRef.current + step[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    handleItemClick(Math.max(0, Math.min(items.length - 1, next)));
  };

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="listbox"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      style={{
        height: `${CONTAINER_HEIGHT}px`,
        paddingTop: `${PADDING}px`,
        paddingBottom: `${PADDING}px`,
      }}
      className="overflow-y-auto scrollbar-none text-center cursor-grab active:cursor-grabbing select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {items.map((item, i) => {
        const isSelected = i === activeIndex;
        const distance = Math.abs(i - activeIndex);
        // ยิ่งไกลจากแถวที่เลือก ยิ่งจางและเล็กลง (ให้ความรู้สึกเป็นวงล้อ)
        const opacity = isSelected ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.28 : 0.12;
        const scale = isSelected ? 1 : distance === 1 ? 0.9 : 0.8;

        return (
          <div
            key={item}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleItemClick(i)}
            style={{ height: `${ITEM_HEIGHT}px`, opacity, transform: `scale(${scale})` }}
            className={`flex items-center justify-center tabular-nums transition-all duration-200 ease-out select-none ${
              isSelected
                ? 'text-xl font-bold text-primary dark:text-blue-300'
                : 'text-base font-medium text-slate-500 dark:text-slate-400 hover:opacity-80'
            }`}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

export default function ThaiTimePicker({
  value = '08:30',
  onChange,
  label,
  required,
  disabled,
  align = 'auto',
  showQuickMinutes = false, // ค่าเริ่มต้น: วงล้อ ชม./น. อย่างเดียว (รูปแบบมาตรฐานของระบบ)
}: ThaiTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>(
    align === 'right' ? 'right' : 'left'
  );

  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'left' || align === 'right') {
        setDropdownAlign(align);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.right + 160 > window.innerWidth || rect.left > window.innerWidth / 2) {
          setDropdownAlign('right');
        } else {
          setDropdownAlign('left');
        }
      }
    }
  }, [isOpen, align]);

  // Extract hour and minute from value
  const [valHour, valMinute] = (value && value.includes(':') ? value : '08:30').split(':');
  const [selectedHour, setSelectedHour] = useState(valHour || '08');
  const [selectedMinute, setSelectedMinute] = useState(valMinute || '30');

  // Input states for direct keyboard typing
  const [inputHour, setInputHour] = useState(valHour || '08');
  const [inputMinute, setInputMinute] = useState(valMinute || '30');

  const minuteInputRef = useRef<HTMLInputElement>(null);

  // ช่องที่ผู้ใช้กำลังพิมพ์อยู่ — ห้ามเขียนทับค่าในช่องนั้นจากค่าภายนอก
  const typingRef = useRef<'hour' | 'minute' | null>(null);

  useEffect(() => {
    if (valHour && valHour !== selectedHour) {
      setSelectedHour(valHour);
      if (typingRef.current !== 'hour') setInputHour(valHour);
    }
    if (valMinute && valMinute !== selectedMinute) {
      setSelectedMinute(valMinute);
      if (typingRef.current !== 'minute') setInputMinute(valMinute);
    }
  }, [valHour, valMinute, selectedHour, selectedMinute]);

  // Sync wheel selection with parent and input fields
  const handleHourSelect = (h: string) => {
    setSelectedHour(h);
    setInputHour(h);
    onChange(`${h}:${selectedMinute}`);
  };

  const handleMinuteSelect = (m: string) => {
    setSelectedMinute(m);
    setInputMinute(m);
    onChange(`${selectedHour}:${m}`);
  };

  // Keyboard Typing: Hour input handler
  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputHour(raw);

    if (raw.length === 0) return;
    const num = parseInt(raw, 10);
    // เลขตัวแรก 0–2 อาจเป็นหลักสิบ (เช่น 1 → 10–19) → รอเลขตัวที่ 2 ก่อน ยังไม่ส่งค่าออก
    if (raw.length === 1 && num <= 2) return;
    if (num < 0 || num > 23) return;
    const formatted = String(num).padStart(2, '0');
    setInputHour(formatted);
    setSelectedHour(formatted);
    onChange(`${formatted}:${selectedMinute}`);
    // ครบชั่วโมงแล้ว → ไปช่องนาที
    minuteInputRef.current?.focus();
    minuteInputRef.current?.select();
  };

  // อ่านจากช่องโดยตรง: ตอนย้ายโฟกัสอัตโนมัติ state inputHour ยังเป็นค่าเก่า (เคยทำให้ 13 กลายเป็น 01)
  const handleHourInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    typingRef.current = null;
    const num = parseInt(e.target.value.replace(/\D/g, ''), 10);
    const valid = isNaN(num) ? 8 : Math.max(0, Math.min(23, num));
    const formatted = String(valid).padStart(2, '0');
    setInputHour(formatted);
    setSelectedHour(formatted);
    onChange(`${formatted}:${selectedMinute}`);
  };

  // Keyboard Typing: Minute input handler
  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputMinute(raw);

    if (raw.length === 0) return;
    const num = parseInt(raw, 10);
    // เลขตัวแรก 0–5 อาจเป็นหลักสิบ → รอเลขตัวที่ 2 (หรือ blur)
    if (raw.length === 1 && num <= 5) return;
    if (num < 0 || num > 59) return;
    const formatted = String(num).padStart(2, '0');
    setInputMinute(formatted);
    setSelectedMinute(formatted);
    onChange(`${selectedHour}:${formatted}`);
  };

  // อ่านจากช่องโดยตรง: ตอนย้ายโฟกัสอัตโนมัติ state inputMinute ยังเป็นค่าเก่า (เคยทำให้ 13 กลายเป็น 01)
  const handleMinuteInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    typingRef.current = null;
    const num = parseInt(e.target.value.replace(/\D/g, ''), 10);
    const valid = isNaN(num) ? 0 : Math.max(0, Math.min(59, num));
    const formatted = String(valid).padStart(2, '0');
    setInputMinute(formatted);
    setSelectedMinute(formatted);
    onChange(`${selectedHour}:${formatted}`);
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Label Header */}
      {label && (
        <div className="mb-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        </div>
      )}

      {/* Trigger Box with Direct Keyboard Typing + Dropdown Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`group w-full h-10 flex items-center justify-between px-3 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all duration-150 cursor-pointer ${
          isOpen
            ? 'border-primary ring-4 ring-primary/10 shadow-sm'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Left: Clock Icon + Typing Inputs */}
        <div className="flex items-center gap-1">
          <Clock className={`w-4 h-4 shrink-0 mr-1 transition-colors ${isOpen ? 'text-primary dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />

          {/* Hour Direct Typing Input */}
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={inputHour}
            onChange={handleHourInputChange}
            onBlur={handleHourInputBlur}
            onFocus={(e) => { typingRef.current = 'hour'; e.target.select(); }}
            onClick={(e) => e.stopPropagation()}
            title="พิมพ์ชั่วโมง (00-23)"
            className="w-7 text-center font-semibold tabular-nums text-slate-900 dark:text-slate-100 bg-transparent rounded-md py-0.5 text-sm focus:outline-none focus:bg-primary/10 dark:focus:bg-blue-500/20 transition-colors cursor-text"
          />

          <span className="font-semibold text-slate-400 dark:text-slate-500 select-none">:</span>

          {/* Minute Direct Typing Input */}
          <input
            ref={minuteInputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={inputMinute}
            onChange={handleMinuteInputChange}
            onBlur={handleMinuteInputBlur}
            onFocus={(e) => { typingRef.current = 'minute'; e.target.select(); }}
            onClick={(e) => e.stopPropagation()}
            title="พิมพ์นาที (00-59)"
            className="w-7 text-center font-semibold tabular-nums text-slate-900 dark:text-slate-100 bg-transparent rounded-md py-0.5 text-sm focus:outline-none focus:bg-primary/10 dark:focus:bg-blue-500/20 transition-colors cursor-text"
          />

          <span className="font-medium text-slate-500 dark:text-slate-400 text-xs select-none ml-1">น.</span>
        </div>

        {/* Right: Chevron Arrow */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </div>

      {/* Dropdown Wheel / Drum Picker with Smooth Animations */}
      {isOpen && (
        <div
          className={`absolute ${
            dropdownAlign === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-slate-200/80 dark:ring-slate-700 z-50 p-3 animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-150 select-none dark:text-slate-100`}
        >
          {/* เวลาที่เลือก (เด้งเบาๆ ทุกครั้งที่เปลี่ยน) */}
          <div className="flex items-baseline justify-center gap-1.5 pb-2">
            <span
              key={`${selectedHour}:${selectedMinute}`}
              className="text-2xl font-bold tabular-nums tracking-wide text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            >
              {selectedHour}:{selectedMinute}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">น.</span>
          </div>

          {/* Column Titles: ชม. และ น. */}
          <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1">
            <div>ชั่วโมง</div>
            <div>นาที</div>
          </div>

          {/* Wheel Frame Area */}
          <div className="relative rounded-xl overflow-hidden">
            {/* แถบแถวที่เลือก */}
            <div
              style={{ top: `${PADDING}px`, height: `${ITEM_HEIGHT}px` }}
              className="absolute left-0 right-0 bg-primary/[0.07] dark:bg-blue-500/15 rounded-lg pointer-events-none z-0"
            />
            <div
              style={{ top: `${PADDING + ITEM_HEIGHT / 2 - 10}px` }}
              className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-primary/60 dark:text-blue-300/60 pointer-events-none z-0"
            >
              :
            </div>

            {/* ไล่จางบน-ล่าง */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white dark:from-slate-800 to-transparent z-20" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-slate-800 to-transparent z-20" />

            {/* The 2 Scrollable & Draggable Wheel Columns */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <WheelColumn
                items={HOURS}
                selected={selectedHour}
                onSelect={handleHourSelect}
                isOpen={isOpen}
                ariaLabel="เลือกชั่วโมง"
              />
              <WheelColumn
                items={MINUTES}
                selected={selectedMinute}
                onSelect={handleMinuteSelect}
                isOpen={isOpen}
                ariaLabel="เลือกนาที"
              />
            </div>
          </div>

          {/* Quick Minute Selection Presets with Live Time Badge */}
          {showQuickMinutes && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-400">ปุ่มลัดนาที:</span>
                <span className="text-[10px] font-mono font-bold text-primary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {selectedHour}:{selectedMinute} น.
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {QUICK_MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold transition-all duration-150 ${
                      selectedMinute === m
                        ? 'bg-primary text-white shadow-xs scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    } dark:bg-slate-700 dark:text-slate-300`}
                  >
                    :{m} น.
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ปุ่มยืนยัน */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full h-9 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            ตกลง
          </button>
        </div>
      )}
    </div>
  );
}
