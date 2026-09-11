'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { NATIONALITIES } from '@/constants/nationalities';

interface NationalitySelectProps {
  value?: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const NationalitySelect: React.FC<NationalitySelectProps> = ({
  value,
  onChange,
  hasError = false,
  className = '',
  placeholder = 'พิมพ์เพื่อค้นหาสัญชาติ เช่น ไทย, ญี่ปุ่น, ลาว, english...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ปิด Dropdown เมื่อคลิกนอกพื้นที่คอมโพเนนต์
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // กรองรายการสัญชาติตามคำค้นหา (ค้นหาได้ทั้งภาษาไทยและอังกฤษ)
  const filteredNationalities = useMemo(() => {
    if (!searchQuery.trim()) {
      return NATIONALITIES;
    }
    const q = searchQuery.toLowerCase().trim();
    return NATIONALITIES.filter((n) => n.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNationalities.length > 0) {
        handleSelect(filteredNationalities[0].name);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div
        className={`relative flex items-center w-full rounded-lg transition-all text-xs ${
          hasError
            ? 'border-2 border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-slate-900'
            : isOpen
            ? 'border-[#0B2046] ring-2 ring-[#0B2046]/20 bg-white text-slate-800'
            : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'} ${className}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none shrink-0" />

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchQuery : (value || '')}
          placeholder={isOpen ? (value ? `เลือกอยู่: ${value}` : placeholder) : placeholder}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery('');
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 pr-14 py-2 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />

        {/* Action Icons: Clear & Chevron */}
        <div className="absolute right-2 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="ล้างสัญชาติที่เลือก"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                  inputRef.current?.focus();
                }
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 transition-transform cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Options Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header Info */}
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 text-[11px] text-slate-500 flex justify-between items-center">
            <span>พบทั้งหมด {filteredNationalities.length} สัญชาติ</span>
            {searchQuery ? (
              <span className="text-[#0B2046] font-medium truncate max-w-[150px]">
                ค้นหา: &quot;{searchQuery}&quot;
              </span>
            ) : (
              <span className="text-slate-400">พิมพ์เพื่อค้นหา</span>
            )}
          </div>

          {/* Nationalities List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 text-xs">
            {filteredNationalities.length === 0 ? (
              <div className="py-6 px-4 text-center text-slate-400">
                <Search className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">ไม่พบสัญชาติที่ตรงกับ &quot;{searchQuery}&quot;</p>
                <p className="text-[11px] text-slate-400 mt-1">ลองพิมพ์ชื่อประเทศ เช่น ไทย, ญี่ปุ่น, อังกฤษ หรือ english</p>
              </div>
            ) : (
              filteredNationalities.map((item) => {
                const isSelected = item.name === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.name)}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-[#0B2046] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0B2046] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
