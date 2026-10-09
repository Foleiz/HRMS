'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';
import { Employee } from '@/types/employee';

interface EmployeeSelectProps {
  employees: Employee[];
  value: number | '';
  onChange: (employeeId: number | '') => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  emptyLabel?: string;
  excludeEmployeeIds?: number[];
  buttonClassName?: string;
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  employees,
  value,
  onChange,
  placeholder = 'เลือกพนักงาน หรือพิมพ์ค้นหา...',
  required = false,
  disabled = false,
  hasError = false,
  emptyLabel = 'ไม่ระบุ / คงเดิม',
  excludeEmployeeIds,
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ปิด Dropdown เมื่อคลิกนอกพื้นที่
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

  // โฟกัสช่องค้นหาเมื่อเปิด Dropdown
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // พนักงานที่ถูกเลือกปัจจุบัน
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === value);
  }, [employees, value]);

  // กรองรายการพนักงานที่ยังไม่ถูกเลือก (พนักงานที่ถูกเลือกอยู่ปัจจุบันจะยังคงแสดงได้)
  const availableEmployees = useMemo(() => {
    if (!excludeEmployeeIds || excludeEmployeeIds.length === 0) {
      return employees;
    }
    const excludeSet = new Set(excludeEmployeeIds);
    return employees.filter((emp) => {
      if (emp.id === value) return true;
      return !excludeSet.has(emp.id);
    });
  }, [employees, excludeEmployeeIds, value]);

  // กรองรายการพนักงานตามคำค้นหา (ชื่อ, นามสกุล, หรือรหัสพนักงาน)
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableEmployees;
    }
    const q = searchQuery.toLowerCase().trim();
    return availableEmployees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const code = (emp.employeeCode || '').toLowerCase();
      return (
        emp.firstName.toLowerCase().includes(q) ||
        emp.lastName.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        code.includes(q)
      );
    });
  }, [availableEmployees, searchQuery]);

  const handleSelect = (empId: number | '') => {
    onChange(empId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* กล่องเลือกหลัก (Trigger Box) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 bg-white dark:bg-slate-800 dark:bg-slate-800 border rounded-xl text-sm flex items-center justify-between text-left transition-all ${
          hasError
            ? 'border-rose-300 ring-2 ring-rose-500/20'
            : isOpen
            ? 'border-[#0B2046] ring-2 ring-blue-500/20'
            : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900 dark:bg-slate-900' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <span className={`truncate flex items-center gap-2 ${selectedEmployee ? 'text-slate-800 dark:text-slate-200 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400'}`}>
          {selectedEmployee ? (
            <>
              <span>
                {selectedEmployee.fullName || `${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
              </span>
              {selectedEmployee.employeeCode && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  ({selectedEmployee.employeeCode})
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-[#0B2046]' : ''
          }`}
        />
      </button>

      {/* เมนูค้นหาและรายการ Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* กล่องค้นหา (Search Input) */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่อ หรือรหัสพนักงาน..."
                className="w-full h-9 pl-9 pr-8 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 dark:text-slate-200 placeholder-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0B2046] dark:focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredEmployees.length > 0) {
                      handleSelect(filteredEmployees[0].id);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-400 p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* รายการพนักงาน (Scrollable List) */}
          <ul className="max-h-56 overflow-y-auto py-1 text-sm divide-y divide-slate-50 no-scrollbar">
            {!required && !searchQuery && (
              <li
                onClick={() => handleSelect('')}
                className="px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:bg-slate-900 cursor-pointer italic flex items-center gap-2"
              >
                <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                <span>{emptyLabel}</span>
              </li>
            )}
            {filteredEmployees.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                ไม่พบข้อมูลพนักงานที่ตรงกับ "{searchQuery}"
              </li>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === value;
                return (
                  <li
                    key={emp.id}
                    onClick={() => handleSelect(emp.id)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#0B2046]/10 dark:bg-[#0B2046]/30 text-[#0B2046] font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:bg-slate-900 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isSelected ? 'bg-[#0B2046] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">
                        {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                      </span>
                      {emp.employeeCode && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 font-normal shrink-0">
                          ({emp.employeeCode})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0B2046] shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
