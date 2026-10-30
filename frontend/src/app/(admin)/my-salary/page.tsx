'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { mySalaryService } from '@/services/mySalaryService';
import {
  MySalaryOverview,
  MySalaryDetail,
  MySalarySlipItem,
} from '@/types/mySalary';
import {
  Wallet,
  Search,
  Lock,
  Download,
  Loader2,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Button, StatusBadge, RowActions, RowActionButton, inputClass } from '@/components/ui';
import { TablePagination } from '@/components/ui/TablePagination';

export default function MySalaryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <MySalaryContent />
    </Suspense>
  );
}

function MySalaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { error, success } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<MySalaryOverview | null>(null);

  // View state: null = Overview, number = Detail view of specific payrollId
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<MySalaryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Breadcrumb sync
  useEffect(() => {
    if (selectedPayrollId && detailData) {
      setBreadcrumb({
        section: 'เงินเดือนของฉัน',
        page: `รายละเอียดเงินเดือน - ${detailData.periodMonthName}`,
      });
    } else {
      setBreadcrumb({
        section: 'เงินเดือนของฉัน',
        page: 'ภาพรวมเงินเดือน',
      });
    }
    return () => setBreadcrumb(null);
  }, [selectedPayrollId, detailData, setBreadcrumb]);

  // Fetch Overview data
  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const data = await mySalaryService.getOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load salary overview:', err);
      error(err.message || 'ไม่สามารถโหลดข้อมูลเงินเดือนได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchOverview();
    }
  }, [isAuthLoading]);

  // Load detail helper
  const loadDetail = async (payrollId: number) => {
    setSelectedPayrollId(payrollId);
    setIsLoadingDetail(true);
    try {
      const detail = await mySalaryService.getDetail(payrollId);
      setDetailData(detail);
    } catch (err: any) {
      console.error('Failed to load salary slip detail:', err);
      error(err.message || 'ไม่สามารถโหลดรายละเอียดสลิปได้');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Sync with URL query parameter (?id=...)
  const idFromQuery = searchParams.get('id');
  useEffect(() => {
    if (idFromQuery) {
      const pid = parseInt(idFromQuery, 10);
      if (!isNaN(pid) && pid !== selectedPayrollId) {
        loadDetail(pid);
      }
    } else if (selectedPayrollId !== null) {
      setSelectedPayrollId(null);
      setDetailData(null);
    }
  }, [idFromQuery]);

  // Handle navigate to detail
  const handleSelectSlip = (payrollId: number) => {
    router.push(`/my-salary?id=${payrollId}`);
  };

  const handleDownloadPdf = async (payrollId: number, monthName?: string, hint?: string) => {
    setDownloadingId(payrollId);
    try {
      const fileName = `Payslip_${monthName ? monthName.replace(/\s+/g, '_') : payrollId}.pdf`;
      await mySalaryService.downloadSlipPdf(payrollId, fileName);
      const hintText = hint || overview?.passwordHint || detailData?.passwordHint || 'เลขประจำตัวประชาชน 4 หลักสุดท้าย';
      success('ดาวน์โหลดสลิปเงินเดือน (PDF) สำเร็จ', `รหัสเปิดไฟล์คือ: ${hintText}`);
    } catch (err: any) {
      error('ไม่สามารถดาวน์โหลดสลิปเงินเดือนได้', err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setDownloadingId(null);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!overview?.history) return [];
    if (!searchTerm.trim()) return overview.history;
    const term = searchTerm.toLowerCase().trim();
    return overview.history.filter(
      (item) =>
        item.periodMonthName.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.paymentDateThai.toLowerCase().includes(term)
    );
  }, [overview?.history, searchTerm]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  // Format money helper
  const formatMoney = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0.00';
    return Number(val).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatMoneyInt = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Math.round(Number(val)).toLocaleString('th-TH');
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW 2: DETAIL BREAKDOWN
  // ─────────────────────────────────────────────────────────────
  if (selectedPayrollId) {
    if (isLoadingDetail) {
      return (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดรายละเอียดเงินเดือน...</p>
          </div>
        </div>
      );
    }

    // backend ส่ง status เป็นข้อความไทยที่คำนวณแล้ว ("โอนแล้ว"/"รอโอน")
    const isTransferred = detailData?.status === 'โอนแล้ว';

    return (
      <div className="space-y-6 font-sans animate-in fade-in duration-200">
        {/* ========================================================= */}
        {/* B1: TOP HEADER: เหลือชุดเดียว ชื่อพนักงาน · ตำแหน่ง · แผนก และปุ่มดาวน์โหลด */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {detailData?.employeeName} ({detailData?.employeeCode}) · {detailData?.positionName} · {detailData?.departmentName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download PDF Button */}
            <Button
              size="sm"
              onClick={() => handleDownloadPdf(selectedPayrollId, detailData?.periodMonthName, detailData?.passwordHint)}
              loading={downloadingId === selectedPayrollId}
              icon={downloadingId === selectedPayrollId ? undefined : <Download className="w-4 h-4 text-emerald-400" />}
            >
              {downloadingId === selectedPayrollId ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดสลิปเงินเดือน (PDF)'}
            </Button>

            {/* A3: Top Right Security Notice Pill with dynamic password hint */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium shadow-xs">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>รหัสเปิดไฟล์: {detailData?.passwordHint || overview?.passwordHint || 'เลขประจำตัวประชาชน 4 หลักสุดท้าย'}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN SLIP BREAKDOWN CARD                                  */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 shadow-sm space-y-6">
          {/* B7: Slip Header with Month Name & Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {detailData?.periodMonthName}
              </h2>
              <StatusBadge tone={isTransferred ? 'success' : detailData?.status === 'ไม่มียอดโอน' ? 'neutral' : 'warning'}>
                {detailData?.status || 'รอโอน'}
              </StatusBadge>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              วันที่จ่าย: <span className="font-medium text-slate-700 dark:text-slate-300">{detailData?.paymentDateThai || '-'}</span>
            </div>
          </div>

          {/* Earnings & Deductions 2 Columns Grid (B2, B3, B4, B8) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: รายได้ (Earnings) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-600 tracking-wide pb-1">
                รายได้
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {detailData?.earnings && detailData.earnings.length > 0 ? (
                  detailData.earnings.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                          {item.itemName}
                        </span>
                        {/* B2: เอาข้อความรองใต้ชื่อรายการออกทั้งหมด */}
                      </div>
                      {/* B4: ฟอนต์ปกติ tabular-nums */}
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums text-right shrink-0">
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-xs text-slate-400">ไม่มีรายการรายได้เพิ่มเติม</div>
                )}
              </div>

              {/* Total Earnings Bottom Line */}
              <div className="border-t-2 border-slate-800 dark:border-slate-200 pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">รวมรายได้</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatMoney(detailData?.totalGrossIncome)}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: รายหัก (Deductions) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-rose-600 tracking-wide pb-1">
                รายหัก
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {detailData?.deductions && detailData.deductions.length > 0 ? (
                  detailData.deductions.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                          {item.itemName}
                        </span>
                        {/* B2: เอาข้อความรองใต้ชื่อรายการออกทั้งหมด */}
                      </div>
                      {/* B3: ยอดฝั่งรายหักไม่ต้องมีเครื่องหมายลบ แสดงเป็นบวกเหมือน PDF, B4: tabular-nums */}
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 tabular-nums text-right shrink-0">
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-xs text-slate-400">ไม่มีรายการหัก</div>
                )}
              </div>

              {/* B3: ยอดรวมรายหักไม่ต้องมีเครื่องหมายลบ, B4: tabular-nums */}
              <div className="border-t-2 border-slate-800 dark:border-slate-200 pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">รวมรายการหัก</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatMoney(detailData?.totalDeductions)}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* NET PAYABLE BOX (B4: tabular-nums, B5: format xxx-xxx-NN-N) */}
          {/* ========================================================= */}
          <div className="bg-primary-soft/40 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                เงินเดือนสุทธิได้รับ
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
                  {formatMoney(detailData?.netPayableSalary)}
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">บาท</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span>โอนวันที่ </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {detailData?.paymentDateThai || '-'}
                </span>
              </div>
              {/* B5: ธนาคารและเลขบัญชี xxx-xxx-NN-N ด้วยฟอนต์ปกติ */}
              <div className="text-slate-500 dark:text-slate-400 text-xs tabular-nums">
                เลขบัญชี {detailData?.bankAccountMasked} ({detailData?.bankName})
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* B6: YTD SUMMARY BAR (3 Boxes: รายได้สะสม / ภาษีสะสม / ประกันสังคมสะสม) */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Box 1: รายได้สะสม */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                รายได้สะสมทั้งปี (YTD)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatMoney(detailData?.ytdGross)}
                </span>
                <span className="text-2xs text-slate-400">บาท</span>
              </div>
            </div>

            {/* Box 2: ภาษีสะสม */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                ภาษีสะสม (YTD Tax)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatMoney(detailData?.ytdTax)}
                </span>
                <span className="text-2xs text-slate-400">บาท</span>
              </div>
            </div>

            {/* Box 3: ประกันสังคมสะสม */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                ประกันสังคมสะสม (YTD SSO)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatMoney(detailData?.ytdSso)}
                </span>
                <span className="text-2xs text-slate-400">บาท</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: OVERVIEW & HISTORY
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 4 SUMMARY METRIC CARDS                                    */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm space-y-4 animate-pulse min-h-[140px]"
            >
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-8 w-36 bg-slate-200 dark:bg-slate-700 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: เงินเดือนสุทธิ (Net Pay) */}
          <div className="bg-blue-100 dark:bg-blue-950/60 rounded-2xl border border-blue-300 dark:border-blue-800 p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                เงินเดือนสุทธิ (Net Pay)
              </span>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-blue-900/60 shadow-xs flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-300">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-blue-950 dark:text-blue-100">
                  {formatMoneyInt(overview?.latestNetPay)}
                </span>
                <span className="text-xs font-semibold text-blue-700/80 dark:text-blue-300/80">บาท</span>
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-1 tabular-nums truncate">
                โอนเข้าบัญชี {overview?.bankAccountMasked || 'xxx-xxx-xxx-x'}
              </p>
            </div>
          </div>

          {/* Card 2: รายได้รวม */}
          <div className="bg-amber-100 dark:bg-amber-950/60 rounded-2xl border border-amber-300 dark:border-amber-800 p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                รายได้รวม
              </span>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-amber-900/60 shadow-xs flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-900 dark:text-amber-100 tracking-tight tabular-nums">
                  {formatMoneyInt(overview?.latestGrossIncome)}
                </span>
                <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-300/80">บาท</span>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1 truncate" title={overview?.grossSubtext}>
                {overview?.grossSubtext || 'เงินเดือน + ค่าตอบแทน'}
              </p>
            </div>
          </div>

          {/* Card 3: รายการหักรวม */}
          <div className="bg-rose-100 dark:bg-rose-950/60 rounded-2xl border border-rose-300 dark:border-rose-800 p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                รายการหักรวม
              </span>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-rose-900/60 shadow-xs flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-900 dark:text-rose-100 tracking-tight tabular-nums">
                  {formatMoneyInt(overview?.latestTotalDeductions)}
                </span>
                <span className="text-xs font-semibold text-rose-700/80 dark:text-rose-300/80">บาท</span>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-1 truncate" title={overview?.deductionSubtext}>
                {overview?.deductionSubtext || 'ภาษี ประกันสังคม'}
              </p>
            </div>
          </div>

          {/* Card 4: ยอดสะสมทั้งปี (YTD) */}
          <div className="bg-purple-100 dark:bg-purple-950/60 rounded-2xl border border-purple-300 dark:border-purple-800 p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                ยอดสะสมทั้งปี (YTD)
              </span>
              <div className="w-8 h-8 rounded-full bg-white dark:bg-purple-900/60 shadow-xs flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-purple-900 dark:text-purple-100 tracking-tight tabular-nums">
                  {formatMoneyInt(overview?.ytdTotalGross)}
                </span>
                <span className="text-xs font-semibold text-purple-700/80 dark:text-purple-300/80">บาท</span>
              </div>
              <p className="text-[11px] text-purple-700/80 dark:text-purple-400 mt-1 truncate">
                {overview?.ytdPeriodRange || 'ม.ค. - ปัจจุบัน * ใช้ยื่นภาษีปลายปี'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN SECTION: History Table (8 cols) + Visual Charts (4 cols) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: ประวัติสลิปเงินเดือน (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[580px]">
          <div className="space-y-5 flex-1">
            {/* Table Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ประวัติสลิปเงินเดือน
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  แสดงเฉพาะรายการของคุณย้อนหลัง 12 เดือน
                </p>
              </div>

              {/* Search Input Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหาเดือน / พ.ศ."
                  className={`${inputClass} sm:w-56 !py-1.5 pl-8`}
                />
              </div>
            </div>

            {/* Desktop View: Slips History Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 hidden md:block overflow-x-auto">
              <table className="table-standard w-full min-w-[700px] text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-700/30 whitespace-nowrap">
                    <th className="py-3 px-3.5 whitespace-nowrap">เดือน-ปี</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">รายได้รวม</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">รายการหักรวม</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">เงินเดือนสุทธิ</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">วันที่โอน</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">สถานะ</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((row) => (
                      <tr
                        key={row.payrollId}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors group cursor-pointer"
                        onClick={() => handleSelectSlip(row.payrollId)}
                      >
                        <td className="py-3.5 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.periodMonthName}
                        </td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatMoney(row.totalGrossIncome)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatMoney(row.totalDeductions)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatMoney(row.netPayableSalary)}
                        </td>
                        <td className="py-3.5 px-3.5 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.paymentDateThai}
                        </td>
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                          <StatusBadge tone={row.status === 'โอนแล้ว' ? 'success' : row.status === 'ไม่มียอดโอน' ? 'neutral' : 'warning'}>
                            {row.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                          <RowActions>
                            <RowActionButton
                              action="view"
                              onClick={() => handleSelectSlip(row.payrollId)}
                              title="ดูรายละเอียดสลิป"
                            />
                            <RowActionButton
                              action="download"
                              onClick={() => handleDownloadPdf(row.payrollId, row.periodMonthName)}
                              loading={downloadingId === row.payrollId}
                              title="ดาวน์โหลดสลิปเงินเดือน (PDF)"
                            />
                          </RowActions>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                        {searchTerm ? 'ไม่พบข้อมูลสลิปที่ค้นหา' : 'ยังไม่มีประวัติสลิปเงินเดือน'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((row) => (
                  <div
                    key={row.payrollId}
                    className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => handleSelectSlip(row.payrollId)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                          {row.periodMonthName}
                        </span>
                        <span className="text-2xs text-slate-400 block mt-0.5">
                          โอนเมื่อ: {row.paymentDateThai}
                        </span>
                      </div>
                      <StatusBadge tone={row.status === 'โอนแล้ว' ? 'success' : row.status === 'ไม่มียอดโอน' ? 'neutral' : 'warning'}>
                        {row.status}
                      </StatusBadge>
                    </div>

                    <div className="bg-slate-50/80 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">เงินเดือนสุทธิ</span>
                        <span className="text-base font-extrabold text-primary tabular-nums">
                          {formatMoney(row.netPayableSalary)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-2xs pt-1 border-t border-slate-200/60 dark:border-slate-600">
                        <div>
                          <span className="text-slate-400 block">รายได้รวม</span>
                          <span className="tabular-nums text-slate-700 dark:text-slate-300 font-semibold">{formatMoney(row.totalGrossIncome)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">รายการหัก</span>
                          <span className="tabular-nums text-rose-600 dark:text-rose-400 font-semibold">{formatMoney(row.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSelectSlip(row.payrollId)}
                      >
                        ดูรายละเอียด
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadPdf(row.payrollId, row.periodMonthName)}
                        loading={downloadingId === row.payrollId}
                        icon={downloadingId === row.payrollId ? undefined : <Download className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        ดาวน์โหลด PDF
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {searchTerm ? 'ไม่พบข้อมูลสลิปที่ค้นหา' : 'ยังไม่มีประวัติสลิปเงินเดือน'}
                </div>
              )}
            </div>
          </div>

          {/* Pagination & Page Size Selector */}
          <div className="mt-6 border-t border-slate-100 dark:border-slate-700">
            <TablePagination
              total={filteredHistory.length}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: 2 Visual Charts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Chart: Pie / Donut Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieChartIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              สัดส่วนเงินเดือนงวดล่าสุด
            </h3>

            {/* SVG Donut Chart — สัดส่วนจากข้อมูลจริงของงวดล่าสุด (เดิมวาดค่าคงที่) */}
            {(() => {
              const C = 2 * Math.PI * 30;
              const parts = [
                { v: overview?.chartData?.baseSalaryAmount || 0, color: '#10B981' },
                { v: (overview?.chartData?.overtimeAmount || 0) + (overview?.chartData?.allowanceAmount || 0), color: '#F59E0B' },
                { v: overview?.chartData?.deductionsAmount || 0, color: '#3B82F6' },
              ];
              const total = parts.reduce((sum, x) => sum + Math.max(0, x.v), 0);
              if (total <= 0) {
                return (
                  <div className="h-36 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    ไม่มีข้อมูลงวดล่าสุด
                  </div>
                );
              }
              let offset = 0;
              return (
                <div className="relative flex items-center justify-center py-2">
                  <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90" role="img" aria-label="สัดส่วนเงินเดือนงวดล่าสุด">
                    <circle cx="50" cy="50" r="38" fill="#F8FAFC" />
                    {parts.map((x, i) => {
                      const len = (Math.max(0, x.v) / total) * C;
                      const el = (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="30"
                          fill="transparent"
                          stroke={x.color}
                          strokeWidth="20"
                          strokeDasharray={`${len} ${C}`}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += len;
                      return el;
                    })}
                  </svg>
                </div>
              );
            })()}

            {/* Chart Legend */}
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>เงินเดือนพื้นฐาน</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatMoney(overview?.chartData?.baseSalaryAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span>ค่าล่วงเวลา / เบี้ยขยัน</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatMoney(
                    (overview?.chartData?.overtimeAmount || 0) +
                      (overview?.chartData?.allowanceAmount || 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span>รายการหักรวม</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatMoney(overview?.chartData?.deductionsAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Chart: Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              แนวโน้มเงินเดือนสุทธิ
            </h3>

            {/* Custom Simple Bar Chart */}
            <div className="h-36 flex items-end justify-center gap-4 pt-4 px-2 border-b border-slate-200 dark:border-slate-700">
              {overview?.chartData?.monthlyTrends && overview.chartData.monthlyTrends.length > 0 ? (
                overview.chartData.monthlyTrends.map((t, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 max-w-[60px]">
                    <div className="w-full flex items-end justify-center gap-1 h-28">
                      {/* Gross Bar (Green) */}
                      <div
                        style={{
                          height: `${Math.min(100, Math.max(20, (t.grossIncome / 35000) * 100))}%`,
                        }}
                        title={`รายได้: ${formatMoney(t.grossIncome)}`}
                        className="w-3.5 bg-[#10B981] rounded-t transition-all hover:opacity-80"
                      />
                      {/* Net Bar (Blue) */}
                      <div
                        style={{
                          height: `${Math.min(100, Math.max(20, (t.netPay / 35000) * 100))}%`,
                        }}
                        title={`สุทธิ: ${formatMoney(t.netPay)}`}
                        className="w-3.5 bg-[#3B82F6] rounded-t transition-all hover:opacity-80"
                      />
                      {/* Deductions Bar (Yellow) */}
                      <div
                        style={{
                          height: `${Math.min(100, Math.max(8, (t.deductions / 5000) * 40))}%`,
                        }}
                        title={`หัก: ${formatMoney(t.deductions)}`}
                        className="w-3.5 bg-[#F59E0B] rounded-t transition-all hover:opacity-80"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {t.monthLabel}
                    </span>
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  ไม่มีข้อมูลแนวโน้ม
                </div>
              )}
            </div>

            {/* Legend for Bar Chart */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#10B981]" /> รายได้รวม
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#3B82F6]" /> สุทธิ
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#F59E0B]" /> รายการหัก
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
