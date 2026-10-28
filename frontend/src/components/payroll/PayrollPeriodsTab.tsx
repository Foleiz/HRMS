'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  Eye,
  Trash2,
  Search,
  Wallet,
  Users,
  Clock,
} from 'lucide-react';
import { PayrollOverview, PayrollPeriod } from '@/types/payroll';
import { THAI_MONTH_NAMES } from '@/services/payrollScheduleService';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui';
import { PayrollPeriodDetailModal } from './PayrollPeriodDetailModal';

interface PayrollPeriodsTabProps {
  periods: PayrollPeriod[];
  overview?: PayrollOverview | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth?: number;
  onMonthChange?: (month: number) => void;
  onCreatePeriod?: (year: number, month: number) => Promise<void>;
  onOpenPeriodInProcess: (periodId: number) => void;
  onDeletePeriod: (period: PayrollPeriod) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isCreating?: boolean;
  canAccessHrView: boolean;
  canViewProcess: boolean;
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
  onOpenPeriodInProcess,
  onDeletePeriod,
  onRefresh,
  isLoading,
  isCreating,
  canAccessHrView,
  canViewProcess,
  onNavigateToScheduleSettings,
}: PayrollPeriodsTabProps) {
  const [yearFilter, setYearFilter] = useState<string>(String(selectedYear));
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<PayrollPeriod | null>(null);

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
        const matchesSearch =
          !searchQuery ||
          p.periodName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.month && THAI_MONTH_NAMES[p.month - 1]?.includes(searchQuery));
        return matchesYear && matchesSearch;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [periods, yearFilter, searchQuery]);

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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Card: Title, Filters & Toolbar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Title & Counter */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/30 text-primary dark:text-blue-300 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  รอบเงินเดือน
                  {yearFilter !== 'ALL' ? ` ประจำปี พ.ศ. ${Number(yearFilter) + 543}` : ' ทั้งหมด'}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {filteredPeriods.length} รอบ
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                รายการรอบเงินเดือนในระบบ พร้อมสถานะการประมวลผลและการจ่ายเงิน
              </p>
            </div>
          </div>

          {/* Right: Search, Year Filter & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[160px] sm:min-w-[190px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหารอบเงินเดือน..."
                className="w-full pl-9 pr-3 h-9 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Year Selector */}
            <div className="w-36">
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

            {/* Refresh Button */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              title="รีเฟรชข้อมูล"
              className="!h-9"
            >
              <span className="hidden sm:inline">รีเฟรช</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards (Image 1) - ต่อจากแถบเครื่องมือ (Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ยอดเงินเดือนรวมเดือนนี้ (Solid Blue Panel) */}
        <div className="bg-blue-100/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/80 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">ยอดเงินเดือนรวมเดือนนี้</span>
              <div className="text-2xl font-bold text-blue-950 dark:text-white tracking-tight">
                {overview ? `฿${(overview.currentMonthTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/60 text-xs text-blue-700/80 dark:text-blue-300 font-medium">
            <span>{overview?.currentMonthPeriod || '-'}</span>
          </div>
        </div>

        {/* Card 2: พนักงานที่คำนวณแล้ว (Solid Emerald Panel) */}
        <div className="bg-emerald-100/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">พนักงานที่คำนวณแล้ว</span>
              <div className="text-2xl font-bold text-emerald-950 dark:text-white tracking-tight">
                {overview ? `${overview.calculatedEmployeesCount}/${overview.totalEmployeesCount}` : '-'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-700/80 dark:text-emerald-300">
            <span>ความคืบหน้า</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
              คิดเป็น {overview?.calculatedPercentage ?? 0}%
            </span>
          </div>
        </div>

        {/* Card 3: รอตรวจสอบ/อนุมัติ (Solid Amber Panel) */}
        <div className="bg-amber-100/60 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 p-5 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">รอตรวจสอบ/อนุมัติ</span>
              <div className="text-2xl font-bold text-amber-950 dark:text-white tracking-tight">
                {overview ? `${overview.pendingApprovalCount} คน` : '-'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-700/80 dark:text-amber-300 font-medium">
            <span>ต้องดำเนินการก่อนปิดรอบ</span>
          </div>
        </div>

        {/* Card 4: กำหนดปิดรอบถัดไป (Solid Purple Panel) */}
        <div className="bg-purple-100/60 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/80 p-5 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">กำหนดปิดรอบถัดไป</span>
              <div className="text-2xl font-bold text-purple-950 dark:text-white tracking-tight">
                {overview?.nextClosingDate || '-'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/60 text-xs flex items-center justify-between">
            <span className="text-purple-700/80 dark:text-purple-300 font-medium">
              สถานะกำหนดการ
              {(overview?.overdueOpenPeriodCount ?? 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-rose-600 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 shadow-2xs">
                  ค้าง {overview!.overdueOpenPeriodCount} รอบ
                </span>
              )}
            </span>
            <span className={`font-bold ${
              overview?.remainingDays != null && overview.remainingDays < 0
                ? 'text-rose-600 dark:text-rose-400'
                : overview?.remainingDays === 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-purple-700 dark:text-purple-300'
            }`}>
              {overview?.remainingDays != null
                ? overview.remainingDays < 0
                  ? `เลยกำหนด ${Math.abs(overview.remainingDays)} วัน`
                  : overview.remainingDays === 0
                  ? 'ครบกำหนดวันนี้'
                  : `เหลืออีก ${overview.remainingDays} วัน`
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
        {paginatedPeriods.length === 0 ? (
          <div className="py-16 text-center">
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
              รีเฟรชข้อมูล
            </Button>
          </div>
        ) : (
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
                {paginatedPeriods.map((p) => {
                  const isCurrentMonthPeriod =
                    p.year === currentRealYear && p.month === currentRealMonth;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                            {p.periodName}
                          </span>
                          {isCurrentMonthPeriod && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              ปัจจุบัน
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ปี {p.year + 543} / เดือน {p.month} ({THAI_MONTH_NAMES[p.month - 1] || ''})
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
                          {(p.status === 'DRAFT' || p.status === 'REVIEW') && canAccessHrView && (
                            <button
                              type="button"
                              onClick={() => onDeletePeriod(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
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
        )}

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
            />
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
    </div>
  );
}
