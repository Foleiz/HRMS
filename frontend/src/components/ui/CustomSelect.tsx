'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string | number;
  onChange?: (value: any, event?: any) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  name?: string;
  id?: string;
  title?: string;
  required?: boolean;
}

function extractOptions(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!child || !React.isValidElement(child)) return;
    if (child.type === 'option') {
      const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      const val = props.value !== undefined ? props.value : (props.children as any);
      let label = props.children;
      if (Array.isArray(label)) {
        label = label
          .map((c: any) => (typeof c === 'string' || typeof c === 'number' ? c : ''))
          .join('');
      } else if (typeof label !== 'string' && typeof label !== 'number') {
        label = String(label ?? '');
      }
      options.push({
        value: val,
        label: String(label).trim(),
        disabled: props.disabled,
      });
    } else if ((child.props as any)?.children) {
      options.push(...extractOptions((child.props as any).children));
    }
  });
  return options;
}

function createDualValue(optValue: string | number, name?: string) {
  const strVal = String(optValue);
  const eventObj = new String(strVal) as any;
  eventObj.target = { value: strVal, name: name || '' };
  eventObj.currentTarget = eventObj.target;
  eventObj.value = strVal;
  return eventObj;
}

function filterContainerClasses(className: string): string {
  if (!className) return '';
  const tokens = className.split(/\s+/).filter(Boolean);
  const containerTokens: string[] = [];

  for (const token of tokens) {
    if (
      /^p[xytblr]?-/.test(token) ||
      /^border/.test(token) ||
      /^dark:border/.test(token) ||
      /^bg-/.test(token) ||
      /^dark:bg-/.test(token) ||
      /^ring/.test(token) ||
      /^dark:ring/.test(token) ||
      /^focus:/.test(token) ||
      /^dark:focus:/.test(token) ||
      /^hover:/.test(token) ||
      /^dark:hover:/.test(token) ||
      /^text-(slate|gray|zinc|neutral|black|white)/.test(token) ||
      /^dark:text-/.test(token) ||
      /^rounded/.test(token) ||
      token === 'appearance-none' ||
      token === 'cursor-pointer' ||
      token === 'outline-none' ||
      token === 'shadow-sm' ||
      token === 'shadow' ||
      token === 'shadow-2xs' ||
      token === 'font-medium' ||
      token === 'font-semibold' ||
      token === 'font-bold'
    ) {
      continue;
    }
    containerTokens.push(token);
  }
  return containerTokens.join(' ');
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  children,
  placeholder = 'เลือกรายการ',
  className = '',
  buttonClassName = '',
  disabled = false,
  size,
  align = 'left',
  name,
  id,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Resolve options from prop or children
  const resolvedOptions: SelectOption[] = React.useMemo(() => {
    if (options && options.length > 0) return options;
    if (children) return extractOptions(children);
    return [];
  }, [options, children]);

  const selectedOption = resolvedOptions.find((opt) => String(opt.value) === String(value));

  // Auto-detect size if not specified explicitly
  const effectiveSize =
    size ||
    (className.includes('h-8') || className.includes('text-xs')
      ? 'sm'
      : className.includes('h-10') || className.includes('text-sm')
      ? 'lg'
      : 'md');

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(resolvedOptions.length * 40 + 16, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999,
      minWidth: `${Math.max(rect.width, 140)}px`,
      maxWidth: 'calc(100vw - 16px)',
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
  }, [isOpen, resolvedOptions.length, align]);

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-lg',
    md: 'h-9 px-3 text-xs rounded-xl',
    lg: 'h-10 px-3.5 text-sm rounded-xl',
  }[effectiveSize];

  const containerClasses = filterContainerClasses(className);
  const isFullWidth = containerClasses.includes('w-full') || className.includes('w-full');
  const hasCustomWidth =
    isFullWidth ||
    containerClasses.includes('w-') ||
    containerClasses.includes('min-w-') ||
    className.includes('min-w-');

  const defaultMinWidth = effectiveSize === 'sm' ? 'min-w-[85px]' : 'min-w-[120px]';

  return (
    <div
      className={`relative ${isFullWidth ? 'w-full block' : 'inline-block'} ${
        !hasCustomWidth ? defaultMinWidth : ''
      } ${containerClasses}`}
    >
      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full ${sizeClasses} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 transition-all text-left shadow-2xs ${
          isOpen
            ? 'border-[#0B2046] dark:border-blue-500 ring-2 ring-[#0B2046]/10 dark:ring-blue-500/20'
            : 'hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : 'cursor-pointer'} ${buttonClassName}`}
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
          {resolvedOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={`${String(opt.value)}-${idx}`}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (onChange) {
                    const dualVal = createDualValue(opt.value, name);
                    onChange(dualVal, dualVal);
                  }
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
