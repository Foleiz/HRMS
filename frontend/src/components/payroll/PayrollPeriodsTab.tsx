'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  Eye,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { PayrollOverview, PayrollPeriod } from '@/types/payroll';
import { THAI_MONTH_NAMES, PAY_CYCLE_LABELS } from '@/services/payrollScheduleService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button, TableToolbar } from '@/components/ui';
import { PayrollPeriodDetailModal } from './PayrollPeriodDetailModal';
import CreatePayrollPeriodModal from './CreatePayrollPeriodModal';

interface PayrollPeriodsTabProps {
  periods: PayrollPeriod[];
  overview?: PayrollOverview | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth?: number;
  onMonthChange?: (month: number) => void;
  onCreatePeriod?: (year: number, month: number) => Promise<void>;
  onPeriodCreated?: (created: PayrollPeriod) => Promise<void> | void;
  onOpenPeriodInProcess: (periodId: number) => void;
  onDeletePeriod: (period: PayrollPeriod) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isCreating?: boolean;
  canAccessHrView: boolean;
  canViewProcess: boolean;
  canDeletePeriod?: boolean;
  onNavigateToScheduleSettings?: () => void;
}

export default function PayrollPeriodsTab({
  periods,
  overview,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  onCreatePeriod,
  onPeriodCreated,
  onOpenPeriodInProcess,
  onDeletePeriod,
  onRefresh,
  isLoading,
  isCreating,
  canAccessHrView,
  canViewProcess,
  canDeletePeriod = false,
  onNavigateToScheduleSettings,
}: PayrollPeriodsTabProps) {
  const [yearFilter, setYearFilter] = useState<string>(String(selectedYear));
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<PayrollPeriod | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const contractTypeOptions = useMemo(() => {
    const map = new Map<string, string>();
    let hasAllGroup = false;
    for (const p of periods) {
      if (p.employeeTypeId && p.employeeTypeName) {
        map.set(String(p.employeeTypeId), p.employeeTypeName);
      } else {
        hasAllGroup = true;
      }
    }
    const opts = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    if (hasAllGroup) {
      opts.push({ value: 'LEGACY_ALL', label: 'รวมทุกสัญญา' });
    }
    return opts;
  }, [periods]);

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

  // Filtered periods
  const filteredPeriods = useMemo(() => {
    return periods
      .filter((p) => {
        const matchesYear = yearFilter === 'ALL' || p.year === Number(yearFilter);
        const matchesType =
          contractTypeFilter === 'ALL' ||
          (contractTypeFilter === 'LEGACY_ALL'
            ? !p.employeeTypeId
            : String(p.employeeTypeId) === contractTypeFilter);
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          p.periodName?.toLowerCase().includes(q) ||
          p.employeeTypeName?.toLowerCase().includes(q) ||
          (p.month && THAI_MONTH_NAMES[p.month - 1]?.includes(searchQuery));
        return matchesYear && matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return (b.periodSequence ?? 1) - (a.periodSequence ?? 1);
      });
  }, [periods, yearFilter, contractTypeFilter, searchQuery]);

  const totalCount = filteredPeriods.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedPeriods = filteredPeriods.slice(startIdx, startIdx + pageSize);

  const handleYearSelect = (val: string) => {
    setYearFilter(val);
    setPage(1);
    if (val !== 'ALL') {
      onYearChange(Number(val));
    }
  };

  // Summary metrics across filtered periods (by selected year / search)
  const summaryStats = useMemo(() => {
    const totalPeriodsCount = filteredPeriods.length;
    const completedPeriodsCount = filteredPeriods.filter(
      (p) => p.status === 'CLOSED' || p.status === 'PAID'
    ).length;
    const inProgressPeriods = filteredPeriods.filter(
      (p) => p.status !== 'CLOSED' && p.status !== 'PAID'
    );
    const inProgressPeriodsCount = inProgressPeriods.length;
    const completedPercent =
      totalPeriodsCount > 0
        ? Math.round((completedPeriodsCount / totalPeriodsCount) * 100)
        : 0;

    // Breakdown for in-progress periods
    const draftCount = inProgressPeriods.filter((p) => p.status === 'DRAFT').length;
    const waitingCount = inProgressPeriodsCount - draftCount;
    let inProgressSubtext = 'ปิดรอบครบทุกรายการแล้ว';
    if (totalPeriodsCount === 0) {
      inProgressSubtext = 'ยังไม่มีรอบเงินเดือน';
    } else if (inProgressPeriodsCount > 0) {
      const parts: string[] = [];
      if (draftCount > 0) parts.push(`ฉบับร่าง ${draftCount} รอบ`);
      if (waitingCount > 0) parts.push(`รออนุมัติ/การเงิน ${waitingCount} รอบ`);
      inProgressSubtext = parts.join(' · ');
    }

    return {
      totalPeriodsCount,
      completedPeriodsCount,
      completedPercent,
      inProgressPeriodsCount,
      inProgressSubtext,
    };
  }, [filteredPeriods]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: รอบเงินเดือนทั้งหมด (Solid Blue Panel) */}
        <div className="bg-blue-100/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/80 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-bold block truncate">
                รอบเงินเดือนทั้งหมด
              </span>
              <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 font-medium block truncate">
                {yearFilter === 'ALL'
                  ? 'รวมทุกปีในระบบ'
                  : `ประจำปี พ.ศ. ${Number(yearFilter) + 543}`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-blue-950 dark:text-white tracking-tight">
            {summaryStats.totalPeriodsCount} <span className="text-sm font-semibold text-blue-800/80 dark:text-blue-200/80">รอบ</span>
          </div>
        </div>

        {/* Card 2: ปิดรอบ / จ่ายสำเร็จแล้ว (Solid Emerald Panel) */}
        <div className="bg-emerald-100/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold block truncate">
                ปิดรอบ / จ่ายสำเร็จแล้ว
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-emerald-950 dark:text-white tracking-tight">
            {summaryStats.completedPeriodsCount} / {summaryStats.totalPeriodsCount} <span className="text-sm font-semibold text-emerald-800/80 dark:text-emerald-200/80">รอบ</span>
          </div>
        </div>

        {/* Card 3: รอบที่กำลังดำเนินการ (Solid Amber Panel) */}
        <div className="bg-amber-100/60 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs text-amber-700 dark:text-amber-300 font-bold block truncate">
                รอบที่กำลังดำเนินการ
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-amber-950 dark:text-white tracking-tight">
            {summaryStats.inProgressPeriodsCount} <span className="text-sm font-semibold text-amber-800/80 dark:text-amber-200/80">รอบ</span>
          </div>
        </div>
      </div>

      {/* Table Card (มาตรฐานระบบ: Toolbar อยู่บนหัวตาราง) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs p-5 space-y-4">
        {/* TableToolbar directly on top of table header */}
        <TableToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setPage(1);
          }}
          searchPlaceholder="ค้นหารอบเงินเดือน..."
          pageSizeControl={{
            pageSize,
            onPageSizeChange: (newSize: number) => {
              setPageSize(newSize);
              setPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100],
          }}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-40">
                <CustomSelect
                  value={yearFilter}
                  onChange={(e) => handleYearSelect(String(e.target.value))}
                  numbered={false}
                  className="w-full text-xs font-bold"
                  title="เลือกปี พ.ศ."
                >
                  <option value="ALL">ปีทั้งหมด</option>
                  {availableYears.map((y) => (
                    <option key={y} value={String(y)}>
                      ปี พ.ศ. {y + 543}
                    </option>
                  ))}
                </CustomSelect>
              </div>
              {contractTypeOptions.length > 0 && (
                <div className="w-full sm:w-48">
                  <CustomSelect
                    value={contractTypeFilter}
                    onChange={(e) => {
                      setContractTypeFilter(String(e.target.value));
                      setPage(1);
                    }}
                    numbered={false}
                    className="w-full text-xs font-bold"
                    title="กรองตามประเภทสัญญา"
                  >
                    <option value="ALL">ประเภทสัญญาทั้งหมด</option>
                    {contractTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CustomSelect>
                </div>
              )}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {filteredPeriods.length} รอบ
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
                title="รีเฟรช"
                className="!h-9"
              >
                <span className="hidden sm:inline">รีเฟรช</span>
              </Button>
              {canAccessHrView && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={isCreating}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="!h-9"
                >
                  สร้างรอบเงินเดือน
                </Button>
              )}
            </div>
          }
        />

        {/* Table or Empty State Container */}
        {paginatedPeriods.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              ไม่พบรอบเงินเดือนตามตัวกรอง
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              คุณสามารถเปลี่ยนตัวกรองปี หรือไปที่หน้าประมวลผลเงินเดือนเพื่อสร้างรอบใหม่
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              รีเฟรช
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-standard w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-primary text-white font-semibold">
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
                {paginatedPeriods.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                            {p.periodName}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                              {p.employeeTypeName || 'รวมทุกสัญญา'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {PAY_CYCLE_LABELS[p.payCycle || 'MONTHLY'] || p.payCycle || 'รายเดือน'}
                              {p.payCycle && p.payCycle !== 'MONTHLY' && p.periodSequence ? ` • งวดที่ ${p.periodSequence}` : ''}
                            </span>
                          </div>
                        </div>
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
                          ? `฿${p.totalNetSalary.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(p)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canViewProcess && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedDetailPeriod(p)}
                              icon={<Eye className="w-3.5 h-3.5" />}
                              title="เปิดดูรายละเอียดรอบเงินเดือน"
                            >
                              เปิดดู
                            </Button>
                          )}
                          {canDeletePeriod && (() => {
                            // แสดงถังขยะทุกรอบ แต่ลบได้เฉพาะรอบที่ยังไม่อนุมัติ (ร่าง / รอตรวจสอบ)
                            const deletable = p.status === 'DRAFT' || p.status === 'REVIEW';
                            return (
                              <span
                                className="inline-flex"
                                title={deletable ? 'ลบรอบนี้' : 'ลบไม่ได้ — รอบนี้อนุมัติหรือปิดรอบแล้ว'}
                              >
                                <button
                                  type="button"
                                  onClick={() => deletable && onDeletePeriod(p)}
                                  disabled={!deletable}
                                  aria-disabled={!deletable}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    deletable
                                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xs cursor-pointer'
                                      : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-100 cursor-not-allowed'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredPeriods.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 p-3">
              <TablePagination
                total={totalCount}
                page={safePage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize: number) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
                hidePageSizeSelector
              />
            </div>
          )}
        </div>
      )}
    </div>

      {/* Detail Modal (Popup) */}
      <PayrollPeriodDetailModal
        period={selectedDetailPeriod}
        isOpen={!!selectedDetailPeriod}
        onClose={() => setSelectedDetailPeriod(null)}
        onGoToProcess={(periodId) => {
          setSelectedDetailPeriod(null);
          onOpenPeriodInProcess(periodId);
        }}
        canViewProcess={canViewProcess}
      />

      {/* Create Payroll Period Modal (Per-Contract Type) */}
      <CreatePayrollPeriodModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        existingPeriods={periods}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
        onCreated={async (created) => {
          if (onPeriodCreated) {
            await onPeriodCreated(created);
          } else {
            onRefresh();
          }
        }}
      />
    </div>
  );
}
