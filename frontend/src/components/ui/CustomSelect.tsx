'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'เลือกรายการ',
  className = '',
  disabled = false,
  size = 'md',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 40 + 16, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999,
      minWidth: `${Math.max(rect.width, 160)}px`,
    };

    if (openUpward) {
      style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`;
      style.maxHeight = `${Math.max(120, rect.top - 16)}px`;
    } else {
      style.top = `${Math.max(8, rect.bottom + 6)}px`;
      style.maxHeight = `${Math.max(120, window.innerHeight - rect.bottom - 16)}px`;
    }

    if (align === 'right') {
      style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    } else {
      style.left = `${Math.max(8, rect.left)}px`;
    }

    setMenuStyle(style);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, options.length, align]);

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-lg',
    md: 'h-9 px-3 text-xs rounded-xl',
    lg: 'h-10 px-3.5 text-sm rounded-xl',
  }[size];

  return (
    <div className={`relative inline-block ${className || 'min-w-[130px]'}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full ${sizeClasses} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 transition-all text-left shadow-2xs ${
          isOpen
            ? 'border-[#0B2046] dark:border-blue-500 ring-2 ring-[#0B2046]/10 dark:ring-blue-500/20'
            : 'hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : 'cursor-pointer'}`}
      >
        <span
          className={`truncate font-medium ${
            selectedOption && selectedOption.value !== '' && selectedOption.value !== 'ALL'
              ? 'text-slate-800 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0B2046] dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu (Portal-like Fixed View) */}
      {isOpen && (
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange(String(opt.value));
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-900/30 text-[#0B2046] dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium'
                } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[#0B2046] dark:text-blue-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
