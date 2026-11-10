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
  TrendingUp,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Button, StatusBadge, RowActions, RowActionButton, inputClass, TableToolbar } from '@/components/ui';
import { TablePagination } from '@/components/ui/TablePagination';
import { TableEmpty } from '@/components/ui/TableState';
import { SalaryPinModal } from '@/components/payroll/SalaryPinModal';

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
  const [rightChartTab, setRightChartTab] = useState<'composition' | 'trend'>('composition');
  const otherIncomeAmount = Math.max(
    0,
    (overview?.latestGrossIncome || 0) -
      (overview?.chartData?.baseSalaryAmount || 0) -
      (overview?.chartData?.overtimeAmount || 0) -
      (overview?.chartData?.allowanceAmount || 0)
  );

  // View state: null = Overview, number = Detail view of specific payrollId
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<MySalaryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Security PIN state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isCheckingPin, setIsCheckingPin] = useState<boolean>(true);

  // Check PIN status on entry
  useEffect(() => {
    // Clear any previous session unlock so it asks for PIN on every visit/refresh
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('my_salary_unlocked');
    }

    const checkPin = async () => {
      try {
        const res = await mySalaryService.getPinStatus();
        setHasPin(res.hasPin);
      } catch (e) {
        console.error('Failed to get PIN status:', e);
      } finally {
        setIsCheckingPin(false);
      }
    };
    checkPin();
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    success('ยืนยันตัวตนสำเร็จ เข้าสู่ระบบเงินเดือนเรียบร้อย');
  };

  const handleLock = () => {
    setIsUnlocked(false);
  };

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
      <>
        {!isUnlocked && !isCheckingPin && (
          <SalaryPinModal
            hasPin={hasPin}
            onUnlocked={handleUnlock}
            onPinConfigured={() => setHasPin(true)}
          />
        )}
        <div className={`space-y-6 font-sans transition-all duration-300 ${!isUnlocked ? 'filter blur-md pointer-events-none select-none' : ''}`}>
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

            <Button
              size="sm"
              variant="secondary"
              onClick={handleLock}
              icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
              title="ล็อกหน้าจอเพื่อความปลอดภัย"
            >
              ล็อกหน้าจอ
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
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: OVERVIEW & HISTORY
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {!isUnlocked && !isCheckingPin && (
        <SalaryPinModal
          hasPin={hasPin}
          onUnlocked={handleUnlock}
          onPinConfigured={() => setHasPin(true)}
        />
      )}
      <div className={`space-y-6 font-sans transition-all duration-300 ${!isUnlocked ? 'filter blur-md pointer-events-none select-none' : ''}`}>

      {/* ========================================================= */}
      {/* MAIN SECTION: History Table (8 cols) + Visual Charts (4 cols) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: ประวัติสลิปเงินเดือน (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[580px]">
          <div className="space-y-5 flex-1">
            {/* Toolbar: ช่องค้นหาด้านซ้ายตามต้นแบบระบบ */}
            <TableToolbar
              searchValue={searchTerm}
              onSearchChange={(val: string) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              searchPlaceholder="ค้นหาเดือน / พ.ศ...."
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleLock}
                  icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
                  title="ล็อกหน้าจอเพื่อความปลอดภัย"
                >
                  ล็อกหน้าจอ
                </Button>
              }
            />

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
                    <TableEmpty colSpan={7} text={searchTerm ? 'ไม่พบข้อมูลสลิปที่ค้นหา' : 'ยังไม่มีประวัติสลิปเงินเดือน'} />
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

        {/* RIGHT COLUMN: 2 Visual Charts (ออกแบบใหม่ตรงหัวข้อเงินเดือนของฉัน) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: สัดส่วนเงินเดือนสุทธิ vs รายการหัก (Take-Home Pay Ratio) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4 text-emerald-500" />
                  สัดส่วนเงินเดือนสุทธิ
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  เงินโอนรับสุทธิเทียบกับยอดหัก (งวดล่าสุด)
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                {overview?.latestPeriodMonthName || '-'}
              </span>
            </div>

            {/* Donut Chart: Net Pay vs Deductions */}
            {(() => {
              const gross = overview?.latestGrossIncome || 0;
              const net = overview?.latestNetPay || 0;
              const deductions = overview?.latestTotalDeductions || Math.max(0, gross - net);

              if (gross <= 0) {
                return (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    ยังไม่มีข้อมูลเงินเดือนงวดล่าสุด
                  </div>
                );
              }

              const netPercent = gross > 0 ? (net / gross) * 100 : 0;
              const dedPercent = gross > 0 ? (deductions / gross) * 100 : 0;

              const radius = 38;
              const circumference = 2 * Math.PI * radius; // ~238.76
              const netDash = (netPercent / 100) * circumference;
              const dedDash = (dedPercent / 100) * circumference;

              return (
                <div className="space-y-4">
                  {/* Donut with Center Stat */}
                  <div className="relative flex items-center justify-center py-2">
                    <svg viewBox="0 0 100 100" className="w-40 h-40 -rotate-90">
                      {/* Background Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#F1F5F9"
                        className="dark:stroke-slate-700/60"
                        strokeWidth="14"
                      />
                      {/* Net Pay Arc (Emerald) */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="14"
                        strokeDasharray={`${netDash} ${circumference}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                      {/* Deductions Arc (Rose) */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke="#F43F5E"
                        strokeWidth="14"
                        strokeDasharray={`${dedDash} ${circumference}`}
                        strokeDashoffset={-netDash}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">รับสุทธิ</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                        {formatMoney(net)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                        {netPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Summary Breakdown List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/80 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-slate-700/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium">รายได้รวมทั้งหมด</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(gross)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
                        <span className="text-rose-700 dark:text-rose-300 font-medium">รายการหักรวม ({dedPercent.toFixed(1)}%)</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        -{formatMoney(deductions)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                        <span className="text-emerald-800 dark:text-emerald-300 font-bold">เงินเดือนสุทธิ (รับจริง)</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatMoney(net)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Card 2: โครงสร้างรายได้ & แนวโน้มเงินเดือน */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                {rightChartTab === 'composition' ? 'โครงสร้างรายได้ของฉัน' : 'แนวโน้มเงินเดือนรายงวด'}
              </h3>
              
              {/* Tab Switcher */}
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700/60 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setRightChartTab('composition')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                    rightChartTab === 'composition'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  โครงสร้าง
                </button>
                <button
                  type="button"
                  onClick={() => setRightChartTab('trend')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                    rightChartTab === 'trend'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  แนวโน้ม
                </button>
              </div>
            </div>

            {rightChartTab === 'composition' ? (
              // TAB A: โครงสร้างรายได้ (Earnings Composition)
              (() => {
                const base = overview?.chartData?.baseSalaryAmount || 0;
                const ot = (overview?.chartData?.overtimeAmount || 0) + (overview?.chartData?.allowanceAmount || 0);
                const other = otherIncomeAmount;
                const totalGross = base + ot + other || overview?.latestGrossIncome || 1;

                const basePct = Math.min(100, (base / totalGross) * 100);
                const otPct = Math.min(100, (ot / totalGross) * 100);
                const otherPct = Math.min(100, (other / totalGross) * 100);

                return (
                  <div className="space-y-4">
                    {/* Visual Segmented Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${basePct}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                          title={`เงินเดือนพื้นฐาน: ${basePct.toFixed(1)}%`}
                        />
                        <div
                          style={{ width: `${otPct}%` }}
                          className="bg-amber-500 h-full transition-all duration-500"
                          title={`OT / เบี้ยขยัน: ${otPct.toFixed(1)}%`}
                        />
                        <div
                          style={{ width: `${otherPct}%` }}
                          className="bg-purple-500 h-full transition-all duration-500"
                          title={`รายได้อื่น / พิเศษ: ${otherPct.toFixed(1)}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>เงินเดือนหลัก: {basePct.toFixed(1)}%</span>
                        <span>OT/เงินเพิ่ม: {(otPct + otherPct).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Breakdown Items List */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div>
                            <span className="block font-semibold text-slate-800 dark:text-slate-200">เงินเดือนประจำ / พื้นฐาน</span>
                            <span className="block text-[10px] text-slate-400">ฐานเงินเดือนตามสัญญาจ้าง</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {formatMoney(base)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {basePct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <div>
                            <span className="block font-semibold text-slate-800 dark:text-slate-200">ค่าล่วงเวลา (OT) & เบี้ยขยัน</span>
                            <span className="block text-[10px] text-slate-400">ทำงานล่วงเวลาและเบี้ยขยัน</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatMoney(ot)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {otPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <div>
                            <span className="block font-semibold text-slate-800 dark:text-slate-200">รายได้อื่น / โบนัส / พิเศษ</span>
                            <span className="block text-[10px] text-slate-400">เงินช่วยเหลือและรางวัล</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                            {formatMoney(other)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {otherPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              // TAB B: แนวโน้มเงินเดือน (Monthly Trend with Dynamic Scale)
              (() => {
                const trends = overview?.chartData?.monthlyTrends || [];
                if (trends.length === 0) {
                  return (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                      ไม่มีข้อมูลแนวโน้มรายงวด
                    </div>
                  );
                }

                const maxVal = Math.max(...trends.map((t) => Math.max(t.grossIncome, t.netPay)), 1000) * 1.15;
                const avgNet = trends.reduce((acc, t) => acc + t.netPay, 0) / trends.length;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>เปรียบเทียบ {trends.length} งวดล่าสุด</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        เฉลี่ย ฿{formatMoney(avgNet)}/งวด
                      </span>
                    </div>

                    {/* Bar Chart Container */}
                    <div className="h-36 flex items-end justify-center gap-3 pt-4 px-2 border-b border-slate-200 dark:border-slate-700">
                      {trends.map((t, idx) => {
                        const grossHeight = Math.min(100, Math.max(12, (t.grossIncome / maxVal) * 100));
                        const netHeight = Math.min(100, Math.max(10, (t.netPay / maxVal) * 100));
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 max-w-[65px] group">
                            <div className="w-full flex items-end justify-center gap-1.5 h-24">
                              {/* Gross Bar */}
                              <div
                                style={{ height: `${grossHeight}%` }}
                                title={`รายได้รวม: ฿${formatMoney(t.grossIncome)}`}
                                className="w-3.5 bg-slate-300 dark:bg-slate-600 rounded-t transition-all group-hover:bg-slate-400"
                              />
                              {/* Net Bar */}
                              <div
                                style={{ height: `${netHeight}%` }}
                                title={`รับสุทธิ: ฿${formatMoney(t.netPay)}`}
                                className="w-3.5 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600 shadow-xs"
                              />
                            </div>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                              {t.monthLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-600" /> รายได้รวม
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> เงินเดือนสุทธิ
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
