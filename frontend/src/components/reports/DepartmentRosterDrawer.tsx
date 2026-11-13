'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Search, Users, X } from 'lucide-react';
import { AvatarName, ModalShell } from '@/components/ui';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { formatThaiDate } from '@/lib/thaiDate';
import type { DepartmentEmployees } from '@/types/reports';
import {
  extractNameInitial,
  getEmployeeTypeBadgeClass,
  getGenderBadgeClass,
  getHeadcountPlanBadge,
  isHiredThisYear,
  matchesEmployeeQuery,
} from './departmentReportUtils';

interface DepartmentRosterDrawerProps {
  department: DepartmentEmployees | null;
  canViewEmployeeProfile?: boolean;
  onClose: () => void;
  onStepDepartment?: (delta: -1 | 1) => void;
  currentIndex?: number;
  totalDepartments?: number;
}

/** เนื้อหาภายใน Drawer แยก key ตามแผนก เพื่อรีเซ็ตช่องค้นหาอัตโนมัติโดยไม่ให้ Drawer กะพริบ */
function DrawerBody({
  department,
  canViewEmployeeProfile,
  onClose,
  onStepDepartment,
  currentIndex,
  totalDepartments,
}: {
  department: DepartmentEmployees;
  canViewEmployeeProfile?: boolean;
  onClose: () => void;
  onStepDepartment?: (delta: -1 | 1) => void;
  currentIndex?: number;
  totalDepartments?: number;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const currentYear = new Date().getFullYear();

  const typeOptions = useMemo(() => {
    const names = Array.from(new Set(department.employees.map((e) => e.employeeTypeName).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b, 'th'));
  }, [department.employees]);

  const filteredEmployees = useMemo(
    () =>
      department.employees.filter((e) => {
        if (typeFilter !== 'ALL' && e.employeeTypeName !== typeFilter) return false;
        return matchesEmployeeQuery(e, search);
      }),
    [department.employees, search, typeFilter]
  );

  const planBadge = getHeadcountPlanBadge(department.employeeCount, department.headcountPlan);
  const canStepPrev = typeof currentIndex === 'number' && currentIndex > 0;
  const canStepNext =
    typeof currentIndex === 'number' && typeof totalDepartments === 'number' && currentIndex < totalDepartments - 1;

  return (
    <>
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {department.departmentCode}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{department.divisionName}</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1.5">
            {department.departmentName}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="ปิด"
          aria-label="ปิดหน้าต่างรายชื่อ"
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Summary & Internal Filter */}
      <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-white">
            <Users className="w-3.5 h-3.5" />
            ทั้งหมด {department.employeeCount.toLocaleString('th-TH')} คน
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
            ชาย {department.maleCount}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800">
            หญิง {department.femaleCount}
          </span>
          {department.otherGenderCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              ไม่ระบุ {department.otherGenderCount}
            </span>
          )}
          {planBadge && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${planBadge.badgeClass}`} title={planBadge.title}>
              แผน {department.headcountPlan} ({planBadge.suffix})
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, ตำแหน่งในแผนกนี้..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {typeOptions.length > 1 && (
            <CustomSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              numbered={false}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 min-w-[140px]"
            >
              <option value="ALL">ทุกประเภท</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CustomSelect>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-2.5">
        {filteredEmployees.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">ไม่พบรายชื่อพนักงาน</div>
            <p className="text-xs text-slate-400 mt-1">
              {department.employees.length === 0 ? 'ยังไม่มีพนักงานสังกัดในแผนกนี้' : 'ลองเปลี่ยนคำค้นหาหรือประเภทพนักงาน'}
            </p>
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const hiredThisYear = isHiredThisYear(emp.startDate, currentYear);
            return (
              <div
                key={emp.employeeId}
                className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/70 hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AvatarName
                      id={emp.employeeId}
                      name={emp.employeeName}
                      initial={extractNameInitial(emp.employeeName)}
                      className="text-sm"
                    />
                    {hiredThisYear && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                        เข้าใหม่ปีนี้
                      </span>
                    )}
                    {canViewEmployeeProfile && (
                      <Link
                        href={`/employees/${emp.employeeId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline ml-auto sm:ml-0"
                        title="ดูข้อมูลพนักงาน"
                      >
                        โปรไฟล์
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 pl-9.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-slate-500 dark:text-slate-400">{emp.employeeCode}</span>
                    <span>·</span>
                    <span>{emp.positionName || '-'}</span>
                    {emp.levelName && emp.levelName !== '-' && (
                      <>
                        <span>·</span>
                        <span>{emp.levelName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 pl-9.5 sm:pl-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getEmployeeTypeBadgeClass(emp.employeeTypeName)}`}>
                    {emp.employeeTypeName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getGenderBadgeClass(emp.gender)}`}>
                    {emp.gender || '-'}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">เริ่ม {formatThaiDate(emp.startDate)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stepper */}
      {onStepDepartment && typeof totalDepartments === 'number' && totalDepartments > 1 && (
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!canStepPrev}
            onClick={() => onStepDepartment(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            แผนกก่อนหน้า
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            แผนกที่ {(currentIndex ?? 0) + 1} / {totalDepartments}
          </span>
          <button
            type="button"
            disabled={!canStepNext}
            onClick={() => onStepDepartment(1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
          >
            แผนกถัดไป
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

/** หน้าต่างสไลด์ด้านขวาแสดงรายชื่อพนักงานในแผนก (แทนการกางตารางซ้อนตารางยาวลงไปทั้งหน้า) */
export default function DepartmentRosterDrawer(props: DepartmentRosterDrawerProps) {
  const { department, onClose } = props;

  useEffect(() => {
    if (!department) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [department, onClose]);

  if (!department) return null;

  return (
    <ModalShell
      placement="right"
      onBackdropClick={onClose}
      className="z-50 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 min-h-screen h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-700/70 animate-in slide-in-from-right duration-300">
        <DrawerBody key={department.departmentId} {...props} department={department} />
      </div>
    </ModalShell>
  );
}
