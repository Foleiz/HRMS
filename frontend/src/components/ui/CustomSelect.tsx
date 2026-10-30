'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAnimatedMount } from '@/hooks/useAnimatedMount';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  /** ข้อความรองชิดขวาในรายการ เช่น "ยังไม่มีรอบ" — ใส่ผ่าน <option data-hint="..."> ก็ได้ */
  hint?: string;
}

export interface CustomSelectProps {
  value?: string | number;
  onChange?: (value: any, event?: any) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  /** ใส่เลขลำดับ "1. 2. 3." หน้าตัวเลือกอัตโนมัติ (ค่าเริ่มต้น true) — ปิดได้สำหรับตัวเลือกสั้น ๆ เช่น ช่วงเวลา */
  numbered?: boolean;
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

export function cleanOptionLabel(raw: string): string {
  let text = raw.trim();
  if (!text) return text;

  const hasThai = /[\u0e00-\u0e7f]/.test(text);
  if (hasThai) {
    // 1. ตัดรหัสภาษาอังกฤษนำหน้า เช่น "SH01 - กะเช้า", "L1 - ระดับ...", "ADMIN — ผู้ดูแลระบบ", "[KBANK] ธนาคาร..."
    text = text.replace(/^\[[A-Za-z0-9_.-]+\]\s*/, '');
    text = text.replace(/^[A-Za-z][A-Za-z0-9_.-]*\s*[-—]\s*(?=[\u0e00-\u0e7f])/, '');

    // 2. ตัดวงเล็บหรือวงเล็บเหลี่ยมที่มีเฉพาะภาษาอังกฤษ/รหัส (ไม่มีภาษาไทย) เช่น "(INC_HOUSING)", "(Monthly)", "(KBANK)"
    text = text.replace(/\s*[(\[][A-Za-z0-9_.,/&%+\s:-]*[A-Za-z][A-Za-z0-9_.,/&%+\s:-]*[)\]]/g, '');

    // 3. ตัดคำภาษาอังกฤษ/รหัสที่ต่อท้ายอยู่ในวงเล็บภาษาไทย เช่น "(ทดสอบดึงสด E2E)" -> "(ทดสอบดึงสด)"
    text = text.replace(/([\u0e00-\u0e7f])\s+[A-Za-z0-9_/-]+(?=\))/g, '$1');

    // 4. เก็บกวาดเครื่องหมายขีดคั่นที่อาจเหลือหลังตัดวงเล็บ เช่น "กะเช้า - 08:00 - 17:00 น."
    text = text.replace(/\s{2,}/g, ' ').trim();
  }

  return text;
}

function isPlaceholderOrDefaultOption(opt: SelectOption, idx: number, cleanedLabel: string): boolean {
  const valStr = String(opt.value ?? '');
  if (
    valStr === '' ||
    valStr === 'ALL' ||
    valStr === 'ทั้งหมด' ||
    opt.disabled === true ||
    valStr.startsWith('__')
  ) {
    return true;
  }
  if (/^(--|—|\+)/.test(cleanedLabel)) {
    return true;
  }
  if (
    idx === 0 &&
    (valStr === '0' ||
      /^(เลือก|ทุก|ทั้งหมด|ไม่ระบุ|ไม่มี|กำลังโหลด)/.test(cleanedLabel) ||
      /ทั้งหมด(\s*\(.*\))?$/.test(cleanedLabel))
  ) {
    return true;
  }
  return false;
}

function isNumericOrYearOption(cleanedLabel: string): boolean {
  // ตัวเลือกจำนวนรายการต่อหน้า เช่น "10", "20 รายการ / หน้า", "10 คน", "หน้า 1"
  if (/^\d+(\s*(รายการ|คน)(\s*\/\s*หน้า)?)?$/.test(cleanedLabel)) return true;
  if (/^หน้า\s*\d+$/.test(cleanedLabel)) return true;
  // ตัวเลือกปี พ.ศ./ค.ศ. เช่น "2569", "พ.ศ. 2569", "ปี 2569", "ปี พ.ศ. 2569", "โบนัสปี 2569"
  if (/^(พ\.ศ\.\s*|ปี\s*(พ\.ศ\.\s*)?|โบนัสปี\s*)?\d{4}(\s*\(.*\))?$/.test(cleanedLabel)) return true;
  return false;
}

// ตัวเลือกเดือนสำหรับตรวจจับและไม่ใส่เลขลำดับนำหน้า เช่น "ตุลาคม" ไม่แสดงเป็น "10. ตุลาคม"
const THAI_MONTH_NAMES_LIST = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_MONTH_SHORT_LIST = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  'ม.ค', 'ก.พ', 'มี.ค', 'เม.ย', 'พ.ค', 'มิ.ย',
  'ก.ค', 'ส.ค', 'ก.ย', 'ต.ค', 'พ.ย', 'ธ.ค',
];

const ENG_MONTH_LIST = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
];

export function getStrippedMonthLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  // 1. ตัดเลขลำดับนำหน้า เช่น "1.", "1. ", "01.", "1 - ", "1: ", "1 ", "เดือน 1 - ", "เดือน 01: "
  let s = trimmed.replace(/^(เดือน\s*)?\d{1,2}\s*([.\-:]\s*|\s+)/i, '');
  // 2. ตัดเลขในวงเล็บต่อท้าย เช่น " (1)", " (10)"
  s = s.replace(/\s*\(\d{1,2}\)$/, '').trim();
  // 3. ตัดคำว่า "เดือน" ข้างหน้าออก (ถ้ามี)
  const core = s.replace(/^เดือน\s*/, '').trim();

  if (THAI_MONTH_NAMES_LIST.includes(core)) {
    return core;
  }
  if (THAI_MONTH_SHORT_LIST.includes(core)) {
    return core;
  }
  const engIdx = ENG_MONTH_LIST.indexOf(core.toLowerCase());
  if (engIdx !== -1) {
    return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  }

  return null;
}

export function isMonthOption(cleanedLabel: string): boolean {
  return getStrippedMonthLabel(cleanedLabel) !== null;
}

export function cleanMonthLabel(cleanedLabel: string): string {
  return getStrippedMonthLabel(cleanedLabel) ?? cleanedLabel;
}

function formatSelectOptions(rawOptions: SelectOption[]): SelectOption[] {
  let seq = 0;
  return rawOptions.map((opt, idx) => {
    const cleaned = cleanOptionLabel(String(opt.label ?? ''));
    if (!cleaned || isPlaceholderOrDefaultOption(opt, idx, cleaned) || isNumericOrYearOption(cleaned)) {
      return { ...opt, label: cleaned };
    }

    // ตัวเลือกเดือน ให้แสดงเฉพาะชื่อเดือน โดยไม่ใส่เลขลำดับนำหน้า (เช่น "ตุลาคม", ไม่ใช่ "10. ตุลาคม")
    if (isMonthOption(cleaned)) {
      return { ...opt, label: cleanMonthLabel(cleaned) };
    }

    seq += 1;
    // หากมีตัวเลขลำดับนำหน้าอยู่แล้ว ให้ปรับรูปแบบเป็น "1. ..." โดยไม่ใส่ซ้ำ
    const strippedExistingNum = cleaned.replace(/^\d+\s*[.\-]\s*/, '');
    return {
      ...opt,
      label: `${seq}. ${strippedExistingNum}`,
    };
  });
}

function extractOptions(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!child || !React.isValidElement(child)) return;
    if (child.type === 'option') {
      const props = child.props as {
        value?: string | number;
        children?: React.ReactNode;
        disabled?: boolean;
        'data-hint'?: string;
      };
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
        hint: props['data-hint'] || undefined,
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
  numbered = true,
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
  const [openUpward, setOpenUpward] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const { shouldRender: shouldRenderMenu, isActive: isMenuActive } = useAnimatedMount(isOpen, 150);

  // Resolve options from prop or children
  const resolvedOptions: SelectOption[] = React.useMemo(() => {
    const raw = options && options.length > 0 ? options : children ? extractOptions(children) : [];
    if (!numbered) {
      return raw.map((opt) => {
        const cleaned = cleanOptionLabel(String(opt.label ?? ''));
        if (isMonthOption(cleaned)) {
          return { ...opt, label: cleanMonthLabel(cleaned) };
        }
        return { ...opt, label: cleaned };
      });
    }
    return formatSelectOptions(raw);
  }, [options, children, numbered]);

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
    const isUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
    setOpenUpward(isUp);

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999,
      minWidth: `${Math.max(rect.width, 140)}px`,
      maxWidth: 'calc(100vw - 16px)',
    };

    if (isUp) {
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
    if (!isOpen && !shouldRenderMenu) return;
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
        className={`w-full ${sizeClasses} bg-white dark:bg-slate-800 border border-[#0B2046] dark:border-blue-500 flex items-center justify-between gap-2 transition-all duration-200 text-left shadow-2xs ${
          isOpen
            ? 'border-[#0B2046] dark:border-blue-400 ring-4 ring-[#0B2046]/18 dark:ring-blue-500/30 bg-blue-50/40 dark:bg-slate-800/90 shadow-[0_0_0_3.5px_rgba(11,32,70,0.18)]'
            : 'hover:border-[#0B2046] hover:bg-slate-50/60 dark:hover:bg-slate-700/60 focus:outline-none focus:ring-4 focus:ring-[#0B2046]/15 focus:border-[#0B2046]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <span
          className={`truncate font-medium text-[#0B2046] dark:text-blue-100 ${
            selectedOption && selectedOption.value !== '' && selectedOption.value !== 'ALL'
              ? 'font-semibold'
              : 'font-medium'
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#0B2046] dark:text-blue-300 shrink-0 transition-transform duration-200 ease-in-out ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Floating Dropdown Menu (Portal-like Fixed View) */}
      {shouldRenderMenu && (
        <div
          ref={menuRef}
          style={menuStyle}
          className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-y-auto py-1 transition-all duration-150 ease-out ${
            openUpward ? 'origin-bottom' : 'origin-top'
          } ${
            isMenuActive
              ? 'opacity-100 scale-100 translate-y-0'
              : `opacity-0 scale-95 pointer-events-none ${openUpward ? 'translate-y-1' : '-translate-y-1'}`
          }`}
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
                {opt.hint && (
                  <span
                    className={`ml-auto pl-4 shrink-0 text-[11px] font-normal ${
                      isSelected ? 'text-primary/70 dark:text-blue-300/80' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {opt.hint}
                  </span>
                )}
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
