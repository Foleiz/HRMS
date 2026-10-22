'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarCheck2,
  CalendarPlus,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  ArrowRight,
  Sparkles,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  ListFilter,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { PayrollPeriod } from '@/types/payroll';
import {
  THAI_MONTH_NAMES,
  calculatePeriodDatesFromSettings,
} from '@/services/payrollScheduleService';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface PayrollPeriodsTabProps {
  periods: PayrollPeriod[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  onCreatePeriod: (year: number, month: number) => Promise<void>;
  onOpenPeriodInProcess: (periodId: number) => void;
  onDeletePeriod: (period: PayrollPeriod) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isCreating: boolean;
  canAccessHrView: boolean;
  canViewProcess: boolean;
  onNavigateToScheduleSettings?: () => void;
}

export default function PayrollPeriodsTab({
  periods,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  onCreatePeriod,
  onOpenPeriodInProcess,
  onDeletePeriod,
  onRefresh,
  isLoading,
  isCreating,
  canAccessHrView,
  canViewProcess,
  onNavigateToScheduleSettings,
}: PayrollPeriodsTabProps) {
  const [viewMode, setViewMode] = useState<'MONTHS' | 'TABLE'>('MONTHS');

  // Available years from periods or current year
  const availableYears = useMemo(() => {
    const years = new Set<number>([
      new Date().getFullYear(),
      selectedYear,
      ...periods.map((p) => p.year).filter(Boolean),
    ]);
    return Array.from(years).sort((a, b) => b - a);
  }, [periods, selectedYear]);

  // Current real-world month & year
  const today = new Date();
  const currentRealYear = today.getFullYear();
  const currentRealMonth = today.getMonth() + 1;

  // Selected period for the selected year and month
  const selectedPeriod = useMemo(() => {
    return periods.find((p) => p.year === selectedYear && p.month === selectedMonth);
  }, [periods, selectedYear, selectedMonth]);

  // Computed default dates from settings for this month
  const computedDates = useMemo(() => {
    return calculatePeriodDatesFromSettings(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Format date dd/mm/yyyy (พ.ศ.)
  const formatDateSlash = (iso?: string | null) => {
    if (!iso) return '-';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
  };

  // Helper for status badge style
  const renderStatusBadge = (period: PayrollPeriod) => {
    const status = period.status;
    let badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

    if (status === 'CLOSED') {
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    } else if (status === 'PAID') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    } else if (status === 'APPROVED') {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    } else if (status === 'SUBMITTED_TO_FINANCE' || status === 'FINANCE_VERIFIED') {
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
        {period.statusText || period.status}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Card: Year Selector & Toolbar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Title & Year Context */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#0B2046] dark:text-blue-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  รอบเงินเดือนประจำปี {selectedYear + 543}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {periods.filter((p) => p.year === selectedYear).length} จาก 12 เดือน
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                เลือกรอบเดือนเพื่อดูรายละเอียด หรือกดสร้างรอบเงินเดือนของงวดที่ต้องการได้ทันที
              </p>
            </div>
          </div>

          {/* Right: Year Filter, View Switcher & Refresh */}
          <div className="flex items-center gap-2">
            <div className="w-36">
              <CustomSelect
                value={String(selectedYear)}
                onChange={(e) => onYearChange(Number(e.target.value))}
                numbered={false}
                className="w-full text-xs font-bold"
                title="เลือกปี พ.ศ."
              >
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    ปี พ.ศ. {y + 543}
                  </option>
                ))}
              </CustomSelect>
            </div>

            {/* Toggle View: Months vs Table */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('MONTHS')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  viewMode === 'MONTHS'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title="มุมมองแบบ 12 เดือน"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">12 เดือน</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  viewMode === 'TABLE'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title="มุมมองตารางประวัติทั้งหมด"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ตารางประวัติ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* 12 Months Navigation Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const isSelected = selectedMonth === month;
              const periodForMonth = periods.find((p) => p.year === selectedYear && p.month === month);
              const isCurrentMonth = selectedYear === currentRealYear && month === currentRealMonth;

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    onMonthChange(month);
                    setViewMode('MONTHS');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-[#0B2046] border-[#0B2046] text-white shadow-sm ring-2 ring-[#0B2046]/20'
                      : periodForMonth
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                      {String(month).padStart(2, '0')}
                    </span>
                    {periodForMonth ? (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                        }`}
                        title="สร้างรอบเงินเดือนแล้ว"
                      />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    )}
                  </div>

                  <div className="mt-1">
                    <div className="text-xs font-bold truncate">
                      {THAI_MONTH_NAMES[i]}
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${
                      isSelected
                        ? 'text-white/80'
                        : periodForMonth
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-slate-400'
                    }`}>
                      {periodForMonth ? (periodForMonth.statusText || 'สร้างแล้ว') : 'ยังไม่มีรอบ'}
                    </div>
                  </div>

                  {isCurrentMonth && (
                    <span className={`absolute -top-1.5 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isSelected ? 'bg-amber-400 text-slate-900' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      เดือนนี้
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mode 1: 12-Month Detailed View for Selected Month */}
      {viewMode === 'MONTHS' && (
        <div className="space-y-4">
          {selectedPeriod ? (
            /* CASE A: Period Exists for this Month */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CalendarCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedPeriod.periodName}
                      </h3>
                      {renderStatusBadge(selectedPeriod)}
                      {selectedPeriod.year === currentRealYear && selectedPeriod.month === currentRealMonth && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          รอบปัจจุบัน
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      ปี พ.ศ. {selectedPeriod.year + 543} • เดือน {THAI_MONTH_NAMES[selectedPeriod.month - 1]}
                    </p>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                  {canViewProcess && (
                    <button
                      type="button"
                      onClick={() => onOpenPeriodInProcess(selectedPeriod.id)}
                      className="h-10 px-5 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>เปิดดูในหน้าประมวลผล</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  )}

                  {selectedPeriod.status !== 'CLOSED' && selectedPeriod.status !== 'PAID' && canAccessHrView && (
                    <button
                      type="button"
                      onClick={() => onDeletePeriod(selectedPeriod)}
                      className="h-10 px-3.5 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                      title="ลบรอบเงินเดือนนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบรอบ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Detail Metric Cards */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: ช่วงเวลาคำนวณ */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>ช่วงเวลาคำนวณเงินเดือน</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatDateSlash(selectedPeriod.startDate)} - {formatDateSlash(selectedPeriod.endDate)}
                  </div>
                </div>

                {/* Metric 2: กำหนดวันจ่ายเงิน */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>วันกำหนดจ่ายเงินเดือน</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    {formatDateSlash(selectedPeriod.paymentDate)}
                  </div>
                </div>

                {/* Metric 3: จำนวนพนักงานในรอบ */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>จำนวนพนักงานในรอบ</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {selectedPeriod.employeeCount != null ? `${selectedPeriod.employeeCount} คน` : '-'}
                  </div>
                </div>

                {/* Metric 4: ยอดสุทธิรวม */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Wallet className="w-3.5 h-3.5 text-amber-500" />
                    <span>ยอดจ่ายเงินเดือนสุทธิ</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {selectedPeriod.totalNetSalary != null
                      ? `฿${selectedPeriod.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </div>
                </div>
              </div>

              {/* Bottom Notice */}
              <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">วันตัดรอบเงินเบิกสวัสดิการ:</span>
                  <span className="font-mono">{formatDateSlash(selectedPeriod.claimCutoffDate || selectedPeriod.paymentDate)}</span>
                </div>
                {onNavigateToScheduleSettings && (
                  <button
                    type="button"
                    onClick={onNavigateToScheduleSettings}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    ปรับแต่งกฎกำหนดวันตัดรอบและวันจ่าย →
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* CASE B: No Period for this Month (Empty State with Instant Create) */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center shadow-xs space-y-6">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-[#0B2046] dark:text-blue-400 mx-auto flex items-center justify-center shadow-xs">
                  <CalendarPlus className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  ยังไม่มีรอบเงินเดือนประจำเดือน {THAI_MONTH_NAMES[selectedMonth - 1]} {selectedYear + 543}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  รอบของเดือนนี้ยังไม่ได้ถูกสร้างขึ้นในระบบ คุณสามารถกดสร้างรอบเงินเดือนได้ทันที ระบบจะนำช่วงเวลาคำนวณและวันจ่ายเงินที่ตั้งค่าไว้มาใช้ให้อัตโนมัติในคลิกเดียว
                </p>
              </div>

              {/* Preview Box of Pre-configured Dates */}
              <div className="max-w-lg mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>ข้อมูลวันที่ที่จะใช้สร้างรอบนี้ (ตามที่กำหนดไว้):</span>
                  </span>
                  {onNavigateToScheduleSettings && (
                    <button
                      type="button"
                      onClick={onNavigateToScheduleSettings}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      แก้ไขการตั้งค่า
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">ช่วงเวลาคำนวณ:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {formatDateSlash(computedDates.startDate)} - {formatDateSlash(computedDates.endDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">วันกำหนดจ่ายเงิน:</span>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                      {formatDateSlash(computedDates.paymentDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">วันตัดรอบสวัสดิการ:</span>
                    <div className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {formatDateSlash(computedDates.claimCutoffDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">ชื่อรอบ:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      {computedDates.periodName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Instant Create Button */}
              {canAccessHrView && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={() => onCreatePeriod(selectedYear, selectedMonth)}
                    className="h-11 px-8 bg-[#0B2046] hover:bg-[#112d5e] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    {isCreating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>
                      {isCreating
                        ? 'กำลังสร้างรอบเงินเดือน...'
                        : `สร้างรอบเงินเดือน ${THAI_MONTH_NAMES[selectedMonth - 1]} ${selectedYear + 543}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Table View of All Periods for Selected Year */}
      {viewMode === 'TABLE' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-standard w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">รอบเงินเดือน</th>
                  <th className="py-3 px-4">ช่วงเวลาคำนวณ</th>
                  <th className="py-3 px-4">กำหนดวันจ่าย</th>
                  <th className="py-3 px-4 text-center">จำนวนพนักงาน</th>
                  <th className="py-3 px-4 text-right">ยอดรวมสุทธิ</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                {periods
                  .filter((p) => p.year === selectedYear)
                  .sort((a, b) => b.month - a.month)
                  .map((p) => {
                    const isCurrent = p.month === selectedMonth;
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors ${
                          isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                              {p.periodName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ปี {p.year + 543} / เดือน {p.month}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateSlash(p.startDate)} - {formatDateSlash(p.endDate)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDateSlash(p.paymentDate)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold whitespace-nowrap">
                          {p.employeeCount != null ? `${p.employeeCount} คน` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {p.totalNetSalary != null
                            ? `฿${p.totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(p)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {canViewProcess && (
                              <button
                                type="button"
                                onClick={() => onOpenPeriodInProcess(p.id)}
                                className="px-2.5 py-1 bg-[#0B2046] hover:bg-[#112d5e] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="เปิดดูรอบนี้ในหน้าประมวลผล"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>เปิดดู</span>
                              </button>
                            )}
                            {p.status !== 'CLOSED' && p.status !== 'PAID' && canAccessHrView && (
                              <button
                                type="button"
                                onClick={() => onDeletePeriod(p)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="ลบรอบนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
