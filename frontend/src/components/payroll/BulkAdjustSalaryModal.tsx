'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  TrendingUp,
  Percent,
  Plus,
  ShieldCheck,
  Edit3,
  Trash2,
  Wand2,
  Search,
  Users,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalShell, Button } from '@/components/ui';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import { formatThaiDate } from '@/lib/thaiDate';
import {
  EmployeeSalaryOverview,
  BulkAdjustEmployeeSalaryPayload,
} from '@/types/payroll';

type AdjustMode = 'PERCENT' | 'FIXED_ADD' | 'STRUCTURE_MIN' | 'MANUAL';
type PickerFilter = 'ALL' | 'UNADJUSTED' | 'UNADJUSTED_THIS_YEAR' | 'NO_SALARY';

const toLocalIso = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatCurrencyInput = (raw: string) => {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '0';
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
};

const formatK = (val?: number | null) => {
  if (val == null) return '-';
  if (val >= 1000) {
    const k = val / 1000;
    return Number.isInteger(k) ? `฿${k}k` : `฿${k.toFixed(1)}k`;
  }
  return `฿${val.toLocaleString()}`;
};

const EMPTY_EMPLOYEES: EmployeeSalaryOverview[] = [];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees?: EmployeeSalaryOverview[];
  allEmployees?: EmployeeSalaryOverview[];
  onSubmit: (payload: BulkAdjustEmployeeSalaryPayload) => Promise<void>;
}

export const BulkAdjustSalaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employees = EMPTY_EMPLOYEES,
  allEmployees,
  onSubmit,
}) => {
  const sourceEmployees = allEmployees && allEmployees.length > 0 ? allEmployees : employees;

  const [step, setStep] = useState<'PICK' | 'ADJUST'>('ADJUST');
  const [pickedIds, setPickedIds] = useState<Set<number>>(new Set());
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerFilter, setPickerFilter] = useState<PickerFilter>('UNADJUSTED');
  const [pickerDept, setPickerDept] = useState<string>('');

  const [targetEmployees, setTargetEmployees] = useState<EmployeeSalaryOverview[]>([]);
  const [mode, setMode] = useState<AdjustMode>('PERCENT');
  const [percentValue, setPercentValue] = useState<string>('5');
  const [fixedAddValue, setFixedAddValue] = useState<string>('1000');
  const [roundToHundred, setRoundToHundred] = useState<boolean>(false);
  const [draftSalaries, setDraftSalaries] = useState<Record<number, string>>({});
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [showOnlyInvalid, setShowOnlyInvalid] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentRealYear = new Date().getFullYear();
  const currentThaiYear = currentRealYear + 543;

  const computeSalaryForMode = (
    emp: EmployeeSalaryOverview,
    selectedMode: AdjustMode,
    pctStr: string,
    addStr: string,
    round100: boolean
  ): string => {
    const base = emp.currentSalary || 0;
    const minSal =
      emp.salaryStructureMin != null && emp.salaryStructureMin > 0
        ? emp.salaryStructureMin
        : null;

    if (selectedMode === 'PERCENT') {
      const pct = parseFloat(pctStr);
      if (isNaN(pct)) return base > 0 ? String(base) : '';
      const startBase = base > 0 ? base : minSal ?? 0;
      if (startBase <= 0) return '';
      let calc = startBase * (1 + pct / 100);
      calc = round100 ? Math.round(calc / 100) * 100 : Math.round(calc * 100) / 100;
      return String(calc);
    }

    if (selectedMode === 'FIXED_ADD') {
      const add = parseFloat(addStr);
      if (isNaN(add)) return base > 0 ? String(base) : '';
      const startBase = base > 0 ? base : minSal ?? 0;
      const calc = Math.round((startBase + add) * 100) / 100;
      return calc > 0 ? String(calc) : '';
    }

    if (selectedMode === 'STRUCTURE_MIN') {
      if (minSal != null && (base <= 0 || base < minSal)) {
        return String(minSal);
      }
      return base > 0 ? String(base) : '';
    }

    return base > 0 ? String(base) : minSal != null ? String(minSal) : '';
  };

  const computeDefaultEffectiveDate = (empList: EmployeeSalaryOverview[]) => {
    const today = new Date();
    let defaultDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    for (const emp of empList) {
      const latest = emp.pendingEffectiveFrom || emp.currentEffectiveFrom;
      if (latest && latest >= toLocalIso(defaultDate)) {
        const [ly, lm] = latest.split('-').map(Number);
        if (ly && lm) {
          defaultDate = new Date(ly, lm, 1);
        }
      }
    }
    return toLocalIso(defaultDate);
  };

  useEffect(() => {
    if (!isOpen) return;

    const hasPreselected = employees.length > 0;
    setStep(hasPreselected ? 'ADJUST' : 'PICK');
    setPickedIds(new Set(employees.map((e) => e.employeeId)));
    setPickerSearch('');
    setPickerDept('');
    setPickerFilter('ALL');

    setTargetEmployees(employees);
    setMode('PERCENT');
    setPercentValue('5');
    setFixedAddValue('1000');
    setRoundToHundred(false);
    setShowOnlyInvalid(false);
    setError(null);
    setReason(`ปรับฐานเงินเดือนประจำปี ${currentThaiYear}`);
    setEffectiveFrom(computeDefaultEffectiveDate(hasPreselected ? employees : sourceEmployees));

    const initialDrafts: Record<number, string> = {};
    for (const emp of employees) {
      initialDrafts[emp.employeeId] = computeSalaryForMode(emp, 'PERCENT', '5', '1000', false);
    }
    setDraftSalaries(initialDrafts);
  }, [isOpen, employees]);

  const applyModeToAll = (
    selectedMode: AdjustMode,
    pctStr: string,
    addStr: string,
    round100: boolean,
    empList: EmployeeSalaryOverview[] = targetEmployees
  ) => {
    if (selectedMode === 'MANUAL') return;
    const nextDrafts: Record<number, string> = {};
    for (const emp of empList) {
      nextDrafts[emp.employeeId] = computeSalaryForMode(
        emp,
        selectedMode,
        pctStr,
        addStr,
        round100
      );
    }
    setDraftSalaries(nextDrafts);
  };

  const handleModeChange = (nextMode: AdjustMode) => {
    setMode(nextMode);
    setError(null);
    if (nextMode === 'STRUCTURE_MIN') {
      setReason('ปรับฐานเงินเดือนตามโครงสร้างเงินเดือนขั้นต่ำ');
    } else if (reason === 'ปรับฐานเงินเดือนตามโครงสร้างเงินเดือนขั้นต่ำ') {
      setReason(`ปรับฐานเงินเดือนประจำปี ${currentThaiYear}`);
    }
    if (nextMode !== 'MANUAL') {
      applyModeToAll(nextMode, percentValue, fixedAddValue, roundToHundred);
    }
  };

  // Picker helpers
  const getLatestAdjustedYear = (emp: EmployeeSalaryOverview): number | null => {
    if ((emp.salaryRecordCount ?? 0) <= 1) return null;
    if (emp.lastAdjustedYear != null) return emp.lastAdjustedYear;
    const dateStr = emp.pendingEffectiveFrom || emp.currentEffectiveFrom;
    if (!dateStr) return null;
    const parsed = Number(dateStr.slice(0, 4));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const departmentNames = useMemo(() => {
    const names = new Set<string>();
    sourceEmployees.forEach((e) => {
      if (e.departmentName) names.add(e.departmentName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'th'));
  }, [sourceEmployees]);

  const pickerCounts = useMemo(() => {
    let unadjusted = 0;
    let unadjustedThisYear = 0;
    let noSalary = 0;
    for (const emp of sourceEmployees) {
      const hasSalary = (emp.currentSalary || 0) > 0;
      const isAdjusted = (emp.salaryRecordCount ?? 0) > 1;
      const latestYear = getLatestAdjustedYear(emp);
      if (!hasSalary) noSalary++;
      if (hasSalary && !isAdjusted) unadjusted++;
      if (hasSalary && (!isAdjusted || latestYear !== currentRealYear)) unadjustedThisYear++;
    }
    return {
      all: sourceEmployees.length,
      unadjusted,
      unadjustedThisYear,
      noSalary,
    };
  }, [sourceEmployees, currentRealYear]);

  const filteredPickerEmployees = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return sourceEmployees.filter((emp) => {
      const hasSalary = (emp.currentSalary || 0) > 0;
      const isAdjusted = (emp.salaryRecordCount ?? 0) > 1;
      const latestYear = getLatestAdjustedYear(emp);

      if (pickerFilter === 'UNADJUSTED' && !(hasSalary && !isAdjusted)) return false;
      if (
        pickerFilter === 'UNADJUSTED_THIS_YEAR' &&
        !(hasSalary && (!isAdjusted || latestYear !== currentRealYear))
      )
        return false;
      if (pickerFilter === 'NO_SALARY' && hasSalary) return false;

      if (pickerDept && emp.departmentName !== pickerDept) return false;

      if (q) {
        const matchCode = emp.employeeCode?.toLowerCase().includes(q);
        const matchName = emp.employeeName?.toLowerCase().includes(q);
        const matchPos = emp.positionName?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPos) return false;
      }
      return true;
    });
  }, [sourceEmployees, pickerFilter, pickerDept, pickerSearch, currentRealYear]);

  const allPickerVisibleSelected =
    filteredPickerEmployees.length > 0 &&
    filteredPickerEmployees.every((e) => pickedIds.has(e.employeeId));

  const togglePickAllVisible = () => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (allPickerVisibleSelected) {
        filteredPickerEmployees.forEach((e) => next.delete(e.employeeId));
      } else {
        filteredPickerEmployees.forEach((e) => next.add(e.employeeId));
      }
      return next;
    });
  };

  const togglePickOne = (employeeId: number) => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const handleConfirmPickedEmployees = () => {
    const selectedList = sourceEmployees.filter((e) => pickedIds.has(e.employeeId));
    if (selectedList.length === 0) {
      setError('กรุณาเลือกพนักงานอย่างน้อย 1 คน');
      return;
    }
    setError(null);
    setTargetEmployees(selectedList);
    setEffectiveFrom(computeDefaultEffectiveDate(selectedList));

    setDraftSalaries((prev) => {
      const next: Record<number, string> = {};
      for (const emp of selectedList) {
        next[emp.employeeId] =
          prev[emp.employeeId] ||
          computeSalaryForMode(emp, mode, percentValue, fixedAddValue, roundToHundred);
      }
      return next;
    });
    setStep('ADJUST');
  };

  const rowEvaluations = useMemo(() => {
    return targetEmployees.map((emp) => {
      const raw = draftSalaries[emp.employeeId] ?? '';
      const newNum = parseFloat(raw);
      const currentNum = emp.currentSalary || 0;
      const minSal =
        emp.salaryStructureMin != null && emp.salaryStructureMin > 0
          ? emp.salaryStructureMin
          : null;
      const maxSal =
        emp.salaryStructureMax != null && emp.salaryStructureMax > 0
          ? emp.salaryStructureMax
          : null;

      const isInvalidAmount = isNaN(newNum) || newNum <= 0;
      const isBelowMin = !isInvalidAmount && minSal != null && newNum < minSal;
      const isAboveMax = !isInvalidAmount && maxSal != null && newNum > maxSal;
      const latestFrom = emp.pendingEffectiveFrom || emp.currentEffectiveFrom || null;
      const isDateConflict = Boolean(latestFrom && effectiveFrom && effectiveFrom <= latestFrom);

      const diff = !isInvalidAmount && currentNum > 0 ? newNum - currentNum : null;
      const diffPct = diff != null && currentNum > 0 ? (diff / currentNum) * 100 : null;

      const reasons: string[] = [];
      if (isInvalidAmount) reasons.push('ยังไม่ได้ระบุเงินเดือนใหม่ (> 0 บาท)');
      if (isBelowMin) reasons.push(`ต่ำกว่ากรอบขั้นต่ำ (฿${minSal?.toLocaleString()})`);
      if (isAboveMax) reasons.push(`เกินกรอบสูงสุด (฿${maxSal?.toLocaleString()})`);
      if (isDateConflict) reasons.push(`วันที่มีผลต้องหลัง ${formatThaiDate(latestFrom)}`);

      return {
        emp,
        raw,
        newNum,
        currentNum,
        minSal,
        maxSal,
        isInvalidAmount,
        isBelowMin,
        isAboveMax,
        isOutOfRange: isBelowMin || isAboveMax,
        latestFrom,
        isDateConflict,
        reasons,
        hasError: reasons.length > 0,
        diff,
        diffPct,
      };
    });
  }, [targetEmployees, draftSalaries, effectiveFrom]);

  const invalidRows = rowEvaluations.filter((r) => r.hasError);
  const invalidCount = invalidRows.length;
  const outOfRangeCount = rowEvaluations.filter((r) => r.isOutOfRange).length;
  const belowMinCount = rowEvaluations.filter((r) => r.isBelowMin).length;
  const aboveMaxCount = rowEvaluations.filter((r) => r.isAboveMax).length;
  const invalidAmountCount = rowEvaluations.filter((r) => r.isInvalidAmount).length;
  const dateConflictCount = rowEvaluations.filter((r) => r.isDateConflict).length;

  const invalidReasonSummary = useMemo(() => {
    const parts: string[] = [];
    if (aboveMaxCount > 0) parts.push(`เกินกรอบสูงสุด ${aboveMaxCount} คน`);
    if (belowMinCount > 0) parts.push(`ต่ำกว่ากรอบขั้นต่ำ ${belowMinCount} คน`);
    if (invalidAmountCount > 0) parts.push(`ยังไม่ระบุยอด ${invalidAmountCount} คน`);
    if (dateConflictCount > 0) parts.push(`วันที่มีผลซ้อน/ไม่มากกว่าเดิม ${dateConflictCount} คน`);
    return parts.join(', ');
  }, [aboveMaxCount, belowMinCount, invalidAmountCount, dateConflictCount]);

  const visibleEvaluations =
    showOnlyInvalid && invalidCount > 0 ? invalidRows : rowEvaluations;

  const handleFixConflictingEffectiveDate = () => {
    const conflictDates = invalidRows
      .filter((r) => r.isDateConflict && r.latestFrom)
      .map((r) => r.latestFrom!)
      .sort();
    const maxLatest = conflictDates[conflictDates.length - 1];
    if (!maxLatest) return;
    const [ly, lm, ld] = maxLatest.split('-').map(Number);
    if (ly && lm && ld) {
      const nextDay = new Date(ly, lm - 1, ld + 1);
      setEffectiveFrom(toLocalIso(nextDay));
      setError(null);
    }
  };

  const handleClampAllToRange = () => {
    const next = { ...draftSalaries };
    for (const r of rowEvaluations) {
      if (r.isBelowMin && r.minSal != null) {
        next[r.emp.employeeId] = String(r.minSal);
      } else if (r.isAboveMax && r.maxSal != null) {
        next[r.emp.employeeId] = String(r.maxSal);
      }
    }
    setDraftSalaries(next);
    setMode('MANUAL');
    setError(null);
  };

  const handleRemoveEmployee = (employeeId: number) => {
    setTargetEmployees((prev) => prev.filter((e) => e.employeeId !== employeeId));
    setPickedIds((prev) => {
      const next = new Set(prev);
      next.delete(employeeId);
      return next;
    });
    setDraftSalaries((prev) => {
      const next = { ...prev };
      delete next[employeeId];
      return next;
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetEmployees.length === 0) {
      setError('กรุณาเลือกพนักงานอย่างน้อย 1 คน');
      return;
    }

    if (!effectiveFrom) {
      setError('กรุณาระบุวันที่มีผลบังคับใช้');
      return;
    }

    const firstInvalid = rowEvaluations.find((r) => r.hasError);
    if (firstInvalid) {
      const label = `${firstInvalid.emp.employeeCode} ${firstInvalid.emp.employeeName}`;
      if (firstInvalid.isInvalidAmount) {
        setError(`กรุณากรอกเงินเดือนใหม่ที่ถูกต้อง (> 0 บาท) สำหรับ ${label}`);
      } else if (firstInvalid.isBelowMin) {
        setError(
          `เงินเดือนใหม่ของ ${label} ต่ำกว่าขั้นต่ำของตำแหน่ง (ขั้นต่ำ ฿${firstInvalid.minSal?.toLocaleString()})`
        );
      } else if (firstInvalid.isAboveMax) {
        setError(
          `เงินเดือนใหม่ของ ${label} สูงกว่าเพดานสูงสุดของตำแหน่ง (สูงสุด ฿${firstInvalid.maxSal?.toLocaleString()})`
        );
      } else if (firstInvalid.isDateConflict) {
        setError(
          `วันที่มีผลของ ${label} ต้องหลังวันที่ ${formatThaiDate(firstInvalid.latestFrom)} ซึ่งเป็นวันที่มีผลล่าสุด`
        );
      }
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        items: rowEvaluations.map((r) => ({
          employeeId: r.emp.employeeId,
          baseSalary: r.newNum,
        })),
        effectiveFrom,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'เกิดข้อผิดพลาดในการปรับฐานเงินเดือนแบบกลุ่ม'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      className="z-50 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      innerClassName="items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-5xl lg:max-w-6xl h-[90vh] max-h-[860px] min-h-[580px] my-auto flex flex-col animate-in zoom-in-95 duration-200">
        {/* ปุ่มกากบาทที่ด้านนอกมุมขวาบน คล้ายแบบรูปที่ 1 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700/60">
          <ModalHeader
            icon={TrendingUp}
            backPosition="bottom"
            onBack={
              step === 'ADJUST'
                ? () => {
                    setPickedIds(new Set(targetEmployees.map((e) => e.employeeId)));
                    setStep('PICK');
                    setError(null);
                  }
                : undefined
            }
            title={
              <div className="flex flex-col items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ปรับฐานเงินเดือน
                </span>
                {/* Stepper Status Indicator ด้านล่างของหัวข้อ */}
                <div className="flex items-center gap-2 font-normal">
                  {/* ขั้นตอนที่ 1: เลือกพนักงาน */}
                  <div
                    onClick={() => {
                      if (step === 'ADJUST') {
                        setPickedIds(new Set(targetEmployees.map((e) => e.employeeId)));
                        setStep('PICK');
                        setError(null);
                      }
                    }}
                    className={`flex items-center gap-1.5 select-none transition-colors ${
                      step === 'ADJUST' ? 'cursor-pointer hover:opacity-85' : ''
                    }`}
                    title={step === 'ADJUST' ? 'คลิกเพื่อกลับไปเลือกพนักงาน' : undefined}
                  >
                    {step === 'ADJUST' ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        1
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        step === 'PICK'
                          ? 'text-slate-900 dark:text-slate-100 font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      เลือกพนักงาน
                    </span>
                  </div>

                  {/* Connector Line */}
                  <div className="w-6 sm:w-8 h-px bg-slate-200 dark:bg-slate-700 shrink-0" />

                  {/* ขั้นตอนที่ 2: กำหนดการปรับ */}
                  <div className="flex items-center gap-1.5 select-none">
                    {step === 'ADJUST' ? (
                      <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        2
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        step === 'ADJUST'
                          ? 'text-primary dark:text-blue-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      กำหนดการปรับ
                    </span>
                  </div>
                </div>
              </div>
            }
          />

        {step === 'PICK' ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0 gap-3 overflow-hidden">
              {/* Filter Pills */}
              <div className="shrink-0 flex flex-wrap items-center gap-2">
                {[
                  { id: 'ALL' as PickerFilter, label: `ทั้งหมด (${pickerCounts.all})` },
                  {
                    id: 'UNADJUSTED' as PickerFilter,
                    label: `ยังไม่เคยถูกปรับฐานเงินเดือน (${pickerCounts.unadjusted})`,
                  },
                  {
                    id: 'UNADJUSTED_THIS_YEAR' as PickerFilter,
                    label: `ยังไม่ได้ปรับฐานเงินเดือนในปีนี้ (${pickerCounts.unadjustedThisYear})`,
                  },
                  {
                    id: 'NO_SALARY' as PickerFilter,
                    label: `ยังไม่ระบุฐานเงินเดือน (${pickerCounts.noSalary})`,
                  },
                ].map((tab) => {
                  const active = pickerFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPickerFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search & Department */}
              <div className="shrink-0 flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="ค้นหารหัส ชื่อ หรือตำแหน่ง..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-200"
                  />
                </div>
                <select
                  value={pickerDept}
                  onChange={(e) => setPickerDept(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-200"
                >
                  <option value="">ทุกแผนก</option>
                  {departmentNames.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="shrink-0 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Employee Picker Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                  <table className="w-full min-w-[780px] table-fixed text-left border-collapse text-xs">
                    <colgroup>
                      <col style={{ width: '44px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: 'auto' }} />
                      <col style={{ width: '160px' }} />
                      <col style={{ width: '160px' }} />
                      <col style={{ width: '180px' }} />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold select-none">
                      <tr>
                        <th className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={allPickerVisibleSelected}
                            onChange={togglePickAllVisible}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">รหัส</th>
                        <th className="py-2.5 px-3">ชื่อพนักงาน</th>
                        <th className="py-2.5 px-3">แผนก</th>
                        <th className="py-2.5 px-3 text-right">ฐานเงินเดือนปัจจุบัน</th>
                        <th className="py-2.5 px-3">สถานะการปรับ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredPickerEmployees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="h-[280px] text-center text-slate-400 dark:text-slate-500"
                          >
                            ไม่พบพนักงานตามเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      ) : (
                        filteredPickerEmployees.map((emp) => {
                          const checked = pickedIds.has(emp.employeeId);
                          const hasSalary = (emp.currentSalary || 0) > 0;
                          const isAdjusted = (emp.salaryRecordCount ?? 0) > 1;
                          const latestYear = getLatestAdjustedYear(emp);
                          return (
                            <tr
                              key={emp.employeeId}
                              onClick={() => togglePickOne(emp.employeeId)}
                              className={`cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-blue-50/60 dark:bg-blue-950/30'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePickOne(emp.employeeId)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                {emp.employeeCode}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {emp.employeeName}
                                </div>
                                {emp.positionName && (
                                  <div className="text-[11px] text-slate-400">
                                    {emp.positionName}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="text-slate-700 dark:text-slate-200">
                                  {emp.departmentName || '-'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {hasSalary
                                  ? `฿${emp.currentSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : 'ยังไม่ระบุ'}
                              </td>
                              <td className="py-2.5 px-3">
                                {!hasSalary ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                                    ยังไม่ระบุฐานเงินเดือน
                                  </span>
                                ) : isAdjusted ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                    {latestYear
                                      ? `ปรับแล้วในปี ${latestYear + 543}`
                                      : 'ปรับฐานเงินเดือนแล้ว'}
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    ยังไม่เคยถูกปรับฐานเงินเดือน
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer for Picker */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Users className="w-4 h-4 text-primary" />
                <span>
                  เลือกพนักงานแล้ว <b>{pickedIds.size} คน</b>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Button type="button" variant="secondary" onClick={onClose}>
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={pickedIds.size === 0}
                  onClick={handleConfirmPickedEmployees}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0 gap-3 overflow-y-auto">
              {/* Mode Selector & Quick Formula Controls */}
              <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-3">
                {/* Row 1: Segmented Mode Tabs */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    รูปแบบการปรับฐานเงินเดือน
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'PERCENT' as AdjustMode, label: 'ปรับขึ้นเป็น %', icon: Percent },
                      { id: 'FIXED_ADD' as AdjustMode, label: 'บวกเพิ่มเป็นบาท', icon: Plus },
                      {
                        id: 'STRUCTURE_MIN' as AdjustMode,
                        label: 'ปรับเข้ากรอบขั้นต่ำ',
                        icon: ShieldCheck,
                      },
                      { id: 'MANUAL' as AdjustMode, label: 'กำหนดเองรายคน', icon: Edit3 },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = mode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleModeChange(opt.id)}
                          className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: Aligned Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                  {mode === 'PERCENT' && (
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        อัตราที่ปรับเพิ่ม (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={percentValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPercentValue(v);
                            applyModeToAll('PERCENT', v, fixedAddValue, roundToHundred);
                          }}
                          className="w-full h-10 text-sm pl-3.5 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="เช่น 5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          %
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roundToHundred}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRoundToHundred(checked);
                            applyModeToAll('PERCENT', percentValue, fixedAddValue, checked);
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>ปัดเศษเป็นหลักร้อยบาท</span>
                      </label>
                    </div>
                  )}

                  {mode === 'FIXED_ADD' && (
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        จำนวนเงินที่บวกเพิ่ม (บาท/คน)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="100"
                          value={fixedAddValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFixedAddValue(v);
                            applyModeToAll('FIXED_ADD', percentValue, v, roundToHundred);
                          }}
                          className="w-full h-10 text-sm pl-3.5 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="เช่น 1000"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          ฿
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Effective From Date */}
                  <div className={mode === 'PERCENT' || mode === 'FIXED_ADD' ? 'md:col-span-4' : 'md:col-span-5'}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      วันที่มีผลบังคับใช้ร่วมกัน <span className="text-rose-500">*</span>
                    </label>
                    <ThaiDatePicker
                      value={effectiveFrom}
                      onChange={(v) => {
                        setEffectiveFrom(v);
                        setError(null);
                      }}
                      placeholder="เลือกวันที่มีผลบังคับใช้"
                      buttonClassName="!h-10 !rounded-xl !text-sm"
                    />
                  </div>

                  {/* Reason */}
                  <div className={mode === 'PERCENT' || mode === 'FIXED_ADD' ? 'md:col-span-5' : 'md:col-span-7'}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      เหตุผล / หมายเหตุการปรับ
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={`เช่น ปรับฐานเงินเดือนประจำปี ${currentThaiYear}`}
                      className="w-full h-10 text-sm px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {invalidCount > 0 && (
                <div className="shrink-0 p-3 sm:p-3.5 bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs text-rose-800 dark:text-rose-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>
                        ไม่ผ่านเงื่อนไข {invalidCount} คน ({invalidReasonSummary})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {invalidCount < targetEmployees.length && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowOnlyInvalid((prev) => !prev)}
                        >
                          {showOnlyInvalid
                            ? `แสดงทั้งหมด (${targetEmployees.length})`
                            : `กรองดูเฉพาะที่ไม่ผ่าน (${invalidCount})`}
                        </Button>
                      )}
                      {dateConflictCount > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleFixConflictingEffectiveDate}
                        >
                          เลื่อนวันที่มีผลให้ถัดจากวันเดิม
                        </Button>
                      )}
                      {outOfRangeCount > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleClampAllToRange}
                          icon={<Wand2 className="w-3.5 h-3.5" />}
                        >
                          ปรับให้อยู่ในกรอบอัตโนมัติ
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-20 overflow-y-auto pr-1">
                    <ul className="space-y-0.5 pl-5 list-disc text-[11px] text-rose-700 dark:text-rose-300">
                      {invalidRows.slice(0, 5).map((r) => (
                        <li key={r.emp.employeeId}>
                          <b>
                            {r.emp.employeeCode} {r.emp.employeeName}
                          </b>
                          : {r.reasons.join(' · ')}
                        </li>
                      ))}
                      {invalidRows.length > 5 && (
                        <li className="list-none font-semibold pt-0.5">
                          ...และอีก {invalidRows.length - 5} คน (กด &ldquo;กรองดูเฉพาะที่ไม่ผ่าน&rdquo; เพื่อตรวจสอบทั้งหมด)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Preview & Inline Edit Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1 min-h-[260px]">
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                  <table className="w-full min-w-[920px] table-fixed text-left border-collapse text-xs">
                    <colgroup>
                      <col style={{ width: '90px' }} />
                      <col style={{ width: 'auto' }} />
                      <col style={{ width: '220px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '175px' }} />
                      <col style={{ width: '45px' }} />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold select-none">
                      <tr>
                        <th className="py-2.5 px-3">รหัส</th>
                        <th className="py-2.5 px-3">ชื่อพนักงาน</th>
                        <th className="py-2.5 px-3">ตำแหน่งในกรอบอ้างอิง</th>
                        <th className="py-2.5 px-3 text-right">ฐานปัจจุบัน</th>
                        <th className="py-2.5 px-3 text-right">เงินเดือนใหม่</th>
                        <th className="py-2.5 px-3 text-right">ส่วนต่าง</th>
                        <th className="py-2.5 px-2 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {visibleEvaluations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-slate-400 dark:text-slate-500"
                          >
                            ไม่มีรายการพนักงานที่เลือก
                          </td>
                        </tr>
                      ) : (
                        visibleEvaluations.map((row) => {
                          const { emp } = row;
                          return (
                            <tr
                              key={emp.employeeId}
                              className={
                                row.hasError
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                              }
                            >
                              <td className="py-2.5 px-3 font-mono text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                {emp.employeeCode}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {emp.employeeName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {emp.positionName || '-'}
                                </div>
                                {row.isDateConflict && (
                                  <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                                    วันที่มีผลต้องหลัง {formatThaiDate(row.latestFrom)}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {row.minSal != null && row.maxSal != null ? (
                                  <div className="flex flex-col gap-1 w-full max-w-[200px] py-1">
                                    <div className="relative flex items-center h-5">
                                      {/* Midpoint notch marker */}
                                      <div
                                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-400 dark:bg-slate-500 rounded-full pointer-events-none z-0"
                                        title={`จุดกึ่งกลาง ฿${Math.round((row.minSal + row.maxSal) / 2).toLocaleString()}`}
                                      />
                                      <input
                                        type="range"
                                        min={row.minSal}
                                        max={row.maxSal}
                                        step={100}
                                        value={
                                          row.newNum > 0
                                            ? Math.min(row.maxSal, Math.max(row.minSal, row.newNum))
                                            : row.currentNum > 0
                                            ? Math.min(row.maxSal, Math.max(row.minSal, row.currentNum))
                                            : row.minSal
                                        }
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setDraftSalaries((prev) => ({
                                            ...prev,
                                            [emp.employeeId]: String(val),
                                          }));
                                          if (error) setError(null);
                                        }}
                                        className="salary-range-slider w-full h-1.5 appearance-none cursor-pointer focus:outline-none relative z-10"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono select-none px-0.5">
                                      <span>{formatK(row.minSal)}</span>
                                      <span>{formatK(row.maxSal)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap text-slate-600 dark:text-slate-300">
                                {row.currentNum > 0
                                  ? `฿${row.currentNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : 'ยังไม่ระบุ'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="relative">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatCurrencyInput(row.raw)}
                                    onChange={(e) => {
                                      const rawVal = e.target.value
                                        .replace(/[^0-9.]/g, '')
                                        .replace(/(\..*)\./g, '$1');
                                      setDraftSalaries((prev) => ({
                                        ...prev,
                                        [emp.employeeId]: rawVal,
                                      }));
                                      if (error) setError(null);
                                    }}
                                    placeholder="ระบุเงินเดือนใหม่"
                                    className={`w-full text-right text-xs pl-2.5 pr-6 py-1.5 rounded-lg font-mono font-semibold focus:outline-none ${
                                      row.isInvalidAmount || row.isOutOfRange
                                        ? 'border border-rose-400 bg-rose-50/40 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 focus:ring-2 focus:ring-rose-400'
                                        : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary'
                                    }`}
                                  />
                                  <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">
                                    ฿
                                  </span>
                                </div>
                                {row.isInvalidAmount && (
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                                    กรุณาระบุเงินเดือน (&gt; 0 บาท)
                                  </p>
                                )}
                                {row.isBelowMin && (
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                                    ต่ำกว่าขั้นต่ำ (฿{row.minSal?.toLocaleString()})
                                  </p>
                                )}
                                {row.isAboveMax && (
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                                    เกินเพดาน (฿{row.maxSal?.toLocaleString()})
                                  </p>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                                {row.diff != null && row.diff !== 0 ? (
                                  <span
                                    className={`font-semibold ${
                                      row.diff > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {row.diff > 0 ? '+' : '-'}฿{Math.abs(row.diff).toLocaleString()} (
                                    {row.diff > 0 ? '+' : '-'}
                                    {Math.abs(row.diffPct ?? 0).toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEmployee(emp.employeeId)}
                                  title="นำออกจากรายการนี้"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 shrink-0">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                ทั้งหมด <b>{targetEmployees.length} คน</b>
                {invalidCount > 0 && (
                  <span className="ml-2 text-rose-600 dark:text-rose-400 font-semibold">
                    · ไม่ผ่านเงื่อนไข {invalidCount} คน ({invalidReasonSummary})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Button type="button" variant="secondary" onClick={onClose}>
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={targetEmployees.length === 0 || invalidCount > 0}
                >
                  ยืนยันปรับเงินเดือน ({targetEmployees.length} คน)
                </Button>
              </div>
            </div>
          </form>
        )}
        </div>
      </div>
    </ModalShell>
  );
};
