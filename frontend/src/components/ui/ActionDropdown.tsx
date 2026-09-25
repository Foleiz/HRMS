'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

export interface ActionDropdownItem {
  id?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
  divider?: boolean;
}

export interface ActionDropdownProps {
  items?: ActionDropdownItem[];
  children?: React.ReactNode | ((close: () => void) => React.ReactNode);
  trigger?: React.ReactNode;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'right' | 'left';
  title?: string;
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  items,
  children,
  trigger,
  triggerClassName,
  menuClassName = 'w-48',
  align = 'right',
  title = 'การจัดการ',
  disabled = false,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setIsOpen = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange]
  );

  // Position calculation with automatic flip & boundary check
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip upwards if space below is tight (< 220px) and above has more room
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999, // Render above modals, tables, sticky headers
    };

    if (openUpward) {
      style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`;
      style.maxHeight = `${Math.max(120, rect.top - 16)}px`;
    } else {
      style.top = `${Math.max(8, rect.bottom + 6)}px`;
      style.maxHeight = `${Math.max(120, window.innerHeight - rect.bottom - 16)}px`;
    }

    if (align === 'left') {
      style.left = `${Math.max(8, rect.left)}px`;
    } else {
      style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    }

    setMenuStyle(style);
  }, [align]);

  // Recalculate position when opened or when resized
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
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
  }, [isOpen, updatePosition, setIsOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const defaultTriggerClasses = `p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center ${
    isOpen ? 'bg-slate-100 text-slate-700' : 'hover:bg-slate-100'
  }`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={disabled}
        onClick={handleToggle}
        className={triggerClassName || defaultTriggerClasses}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger || <MoreVertical className="w-4 h-4" />}
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className={`bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 overflow-y-auto ${menuClassName}`}
          onClick={(e) => e.stopPropagation()}
        >
          {typeof children === 'function' ? (
            children(closeMenu)
          ) : children ? (
            children
          ) : items && items.length > 0 ? (
            items.map((item, idx) => {
              if (item.divider) {
                return <div key={`div-${idx}`} className="my-1 border-t border-slate-100" />;
              }

              if (item.href) {
                return (
                  <Link
                    key={item.id || idx}
                    href={item.href}
                    onClick={(e) => {
                      closeMenu();
                      item.onClick?.(e);
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer font-medium ${
                      item.danger
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    } ${item.className || ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.id || idx}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    item.onClick?.(e);
                  }}
                  className={`w-full px-3.5 py-2 text-left flex items-center gap-2.5 transition-colors font-medium ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed hover:bg-transparent'
                      : 'cursor-pointer'
                  } ${
                    item.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  } ${item.className || ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
};

export default ActionDropdown;
