'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, Sun, Moon } from 'lucide-react';

interface ThaiTimePickerProps {
  value: string; // Format "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const QUICK_MINUTES = ['00', '15', '30', '45'];

const ITEM_HEIGHT = 40; // Exact height of each item in pixels
const VISIBLE_ROWS = 5; // 5 visible rows: 2 above, 1 selected, 2 below
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS; // 200px
const PADDING = ITEM_HEIGHT * 2; // 80px (2 items of padding top and bottom)

interface WheelColumnProps {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  isOpen: boolean;
}

function WheelColumn({ items, selected, onSelect, isOpen }: WheelColumnProps) {
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

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      style={{
        height: `${CONTAINER_HEIGHT}px`,
        paddingTop: `${PADDING}px`,
        paddingBottom: `${PADDING}px`,
      }}
      className="overflow-y-auto scrollbar-none text-center cursor-grab active:cursor-grabbing select-none"
    >
      {items.map((item, i) => {
        const isSelected = i === activeIndex;
        const distance = Math.abs(i - activeIndex);

        return (
          <div
            key={item}
            onClick={() => handleItemClick(i)}
            style={{ height: `${ITEM_HEIGHT}px` }}
            className={`flex items-center justify-center font-mono transition-all duration-200 ease-out select-none ${
              isSelected
                ? 'text-2xl font-black text-slate-900 scale-110 tracking-wide'
                : distance === 1
                ? 'text-base font-semibold text-slate-400 opacity-60 scale-95'
                : 'text-xs font-medium text-slate-300 opacity-20 scale-85'
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
}: ThaiTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract hour and minute from value
  const [valHour, valMinute] = (value && value.includes(':') ? value : '08:30').split(':');
  const [selectedHour, setSelectedHour] = useState(valHour || '08');
  const [selectedMinute, setSelectedMinute] = useState(valMinute || '30');

  // Input states for direct keyboard typing
  const [inputHour, setInputHour] = useState(valHour || '08');
  const [inputMinute, setInputMinute] = useState(valMinute || '30');

  const minuteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (valHour && valHour !== selectedHour) {
      setSelectedHour(valHour);
      setInputHour(valHour);
    }
    if (valMinute && valMinute !== selectedMinute) {
      setSelectedMinute(valMinute);
      setInputMinute(valMinute);
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

    if (raw.length > 0) {
      const num = parseInt(raw, 10);
      if (num >= 0 && num <= 23) {
        const formatted = raw.length === 2 ? raw : String(num).padStart(2, '0');
        setSelectedHour(formatted);
        onChange(`${formatted}:${selectedMinute}`);

        // Auto-advance to minute input when 2 digits typed
        if (raw.length === 2) {
          minuteInputRef.current?.focus();
          minuteInputRef.current?.select();
        }
      }
    }
  };

  const handleHourInputBlur = () => {
    const num = parseInt(inputHour, 10);
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

    if (raw.length > 0) {
      const num = parseInt(raw, 10);
      if (num >= 0 && num <= 59) {
        const formatted = raw.length === 2 ? raw : String(num).padStart(2, '0');
        setSelectedMinute(formatted);
        onChange(`${selectedHour}:${formatted}`);
      }
    }
  };

  const handleMinuteInputBlur = () => {
    const num = parseInt(inputMinute, 10);
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
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeHourInt = parseInt(selectedHour, 10);
  const isNightShift = activeHourInt >= 18 || activeHourInt < 6;

  return (
    <div className="relative" ref={containerRef}>
      {/* Label and Day/Night Badge Header Line (Ample Space) */}
      <div className="flex items-center justify-between mb-1.5">
        {label ? (
          <label className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        ) : (
          <div />
        )}

        {/* Day / Night Badge placed cleanly in label row */}
        <span
          className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-md border transition-colors ${
            isNightShift
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isNightShift ? (
            <Moon className="w-3 h-3 text-purple-600 shrink-0" />
          ) : (
            <Sun className="w-3 h-3 text-amber-600 shrink-0" />
          )}
          <span className="whitespace-nowrap">{isNightShift ? 'กะกลางคืน' : 'กะกลางวัน'}</span>
        </span>
      </div>

      {/* Trigger Box with Direct Keyboard Typing + Dropdown Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs transition-all cursor-pointer ${
          isOpen ? 'ring-2 ring-[#0B2046]/20 border-[#0B2046] bg-white shadow-sm' : 'hover:bg-slate-100/80'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Left: Clock Icon + Typing Inputs */}
        <div className="flex items-center gap-2 font-mono">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Hour Direct Typing Input */}
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={inputHour}
            onChange={handleHourInputChange}
            onBlur={handleHourInputBlur}
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.stopPropagation()}
            title="พิมพ์ชั่วโมง (00-23)"
            className="w-8 text-center font-black font-mono text-slate-900 bg-white border border-slate-200/90 rounded-lg py-0.5 text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 focus:border-[#0B2046] transition-all cursor-text"
          />

          <span className="font-bold text-slate-400 select-none">:</span>

          {/* Minute Direct Typing Input */}
          <input
            ref={minuteInputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={inputMinute}
            onChange={handleMinuteInputChange}
            onBlur={handleMinuteInputBlur}
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.stopPropagation()}
            title="พิมพ์นาที (00-59)"
            className="w-8 text-center font-black font-mono text-slate-900 bg-white border border-slate-200/90 rounded-lg py-0.5 text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-[#0B2046]/30 focus:border-[#0B2046] transition-all cursor-text"
          />

          <span className="font-sans font-semibold text-slate-500 text-[11px] select-none">น.</span>
        </div>

        {/* Right: Chevron Arrow */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0B2046]' : ''
          }`}
        />
      </div>

      {/* Dropdown Wheel / Drum Picker with Smooth Animations */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-200 select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0B2046]" />
              <span>เลือกเวลา (ระบบ 24 ชม.)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#0B2046] hover:text-blue-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              เสร็จสิ้น
            </button>
          </div>

          {/* Column Titles: ชม. และ น. */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-600 mb-1.5">
            <div>ชม.</div>
            <div>น.</div>
          </div>

          {/* Wheel Frame Area */}
          <div className="relative bg-slate-50/80 rounded-2xl border border-slate-200/80 overflow-hidden shadow-inner">
            {/* Center Selection Highlight Box */}
            <div
              style={{ top: `${PADDING}px`, height: `${ITEM_HEIGHT}px` }}
              className="absolute left-2.5 right-2.5 bg-white rounded-xl shadow-md border border-slate-200/90 pointer-events-none z-0 transition-all duration-200"
            />

            {/* Top & Bottom Smooth Gradient Fade Masks */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-50/90 via-slate-50/60 to-transparent z-20" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50/90 via-slate-50/60 to-transparent z-20" />

            {/* The 2 Scrollable & Draggable Wheel Columns */}
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <WheelColumn
                items={HOURS}
                selected={selectedHour}
                onSelect={handleHourSelect}
                isOpen={isOpen}
              />
              <WheelColumn
                items={MINUTES}
                selected={selectedMinute}
                onSelect={handleMinuteSelect}
                isOpen={isOpen}
              />
            </div>
          </div>

          {/* Quick Minute Selection Presets */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[10px] font-semibold text-slate-400 mb-1.5">ปุ่มลัดนาทียอดนิยม:</div>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMinuteSelect(m)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-150 ${
                    selectedMinute === m
                      ? 'bg-[#0B2046] text-white shadow-sm scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-102'
                  }`}
                >
                  :{m} น.
                </button>
              ))}
            </div>
          </div>

          {/* Live Selection Result Footer */}
          <div className="mt-3 flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">เวลาที่เลือก:</span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {selectedHour}:{selectedMinute} น.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
