'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronLeft,
  Search,
  Eye,
  Lock,
  Download,
  Loader2,
  Calendar,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  PieChart as PieChartIcon,
} from 'lucide-react';

export default function MySalaryPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { error, success } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<MySalaryOverview | null>(null);

  // View state: null = Overview (Figma 1), number = Detail view of specific payrollId (Figma 2)
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<MySalaryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

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

  // Fetch Detail when selected
  const handleSelectSlip = async (payrollId: number) => {
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

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownloadPdf = async (payrollId: number, monthName?: string) => {
    setDownloadingId(payrollId);
    try {
      const fileName = `Payslip_${monthName ? monthName.replace(/\s+/g, '_') : payrollId}.pdf`;
      await mySalaryService.downloadSlipPdf(payrollId, fileName);
      success('ดาวน์โหลดสลิปเงินเดือน (PDF) สำเร็จ', 'รหัสผ่านเปิดไฟล์คือวันเดือนปีเกิดของคุณ (ววดดปปปป)');
    } catch (err: any) {
      error('ไม่สามารถดาวน์โหลดสลิปเงินเดือนได้', err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBackToOverview = () => {
    setSelectedPayrollId(null);
    setDetailData(null);
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

  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
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
  // VIEW 2: DETAIL BREAKDOWN (Figma 2 - media_1789984091794.png)
  // ─────────────────────────────────────────────────────────────
  if (selectedPayrollId) {
    if (isLoadingDetail) {
      return (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B2046] mx-auto" />
            <p className="text-xs text-slate-500 font-medium">กำลังโหลดรายละเอียดเงินเดือน...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 font-sans animate-in fade-in duration-200">
        {/* ========================================================= */}
        {/* TOP HEADER: Back Button + Title + Actions & Security Notice*/}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToOverview}
              title="ย้อนกลับไปหน้าภาพรวม"
              className="w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#081836] text-white flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                รายละเอียดเงินเดือน – {detailData?.periodMonthName || 'สิงหาคม 2569'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {detailData?.employeeName} ({detailData?.employeeCode}) · {detailData?.positionName} · {detailData?.departmentName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download PDF Button */}
            <button
              onClick={() => handleDownloadPdf(selectedPayrollId, detailData?.periodMonthName)}
              disabled={downloadingId === selectedPayrollId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloadingId === selectedPayrollId ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-emerald-400" />
              )}
              <span>{downloadingId === selectedPayrollId ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดสลิปเงินเดือน (PDF)'}</span>
            </button>

            {/* Top Right Security Notice Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium shadow-xs">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>รหัสเปิดไฟล์: วันเกิด (ววดดปปปป)</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN SLIP BREAKDOWN CARD (Matching Figma 2 Exactly)      */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
          {/* Earnings & Deductions 2 Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* LEFT COLUMN: รายได้ (Earnings) */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-emerald-600 tracking-wide pb-1">
                รายได้
              </h2>

              <div className="divide-y divide-slate-100">
                {detailData?.earnings && detailData.earnings.length > 0 ? (
                  detailData.earnings.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-medium text-slate-800 block">
                          {item.itemName}
                        </span>
                        {item.subDescription && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {item.subDescription}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-900 font-mono text-right shrink-0">
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-xs text-slate-400">ไม่มีรายการรายได้เพิ่มเติม</div>
                )}
              </div>

              {/* Total Earnings Bottom Line */}
              <div className="border-t-2 border-slate-800 pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">รวมรายได้</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatMoney(detailData?.totalGrossIncome)}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: รายหัก (Deductions) */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-rose-600 tracking-wide pb-1">
                รายหัก
              </h2>

              <div className="divide-y divide-slate-100">
                {detailData?.deductions && detailData.deductions.length > 0 ? (
                  detailData.deductions.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-medium text-slate-800 block">
                          {item.itemName}
                        </span>
                        {item.subDescription && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {item.subDescription}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-rose-600 font-mono text-right shrink-0">
                        -{formatMoney(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-xs text-slate-400">ไม่มีรายการหัก</div>
                )}
              </div>

              {/* Total Deductions Bottom Line */}
              <div className="border-t-2 border-slate-800 pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">รวมรายการหัก</span>
                <span className="text-sm font-bold text-rose-600 font-mono">
                  -{formatMoney(detailData?.totalDeductions)}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BOTTOM SUMMARY BANNER (Light Cyan Card from Figma 2)      */}
          {/* ========================================================= */}
          <div className="bg-[#EBF5FB]/80 border border-sky-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-slate-600 block">
                เงินเดือนสุทธิได้รับ
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatMoney(detailData?.netPayableSalary)}
                </span>
                <span className="text-sm font-semibold text-slate-700">บาท</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 text-xs text-slate-600">
              <div>
                <span>โอนวันที่ </span>
                <span className="font-semibold text-slate-800">
                  {detailData?.paymentDateThai || '-'}
                </span>
              </div>
              <div className="font-mono text-slate-500 text-[11px]">
                เลขบัญชี {detailData?.bankAccountMasked} ({detailData?.bankName})
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: OVERVIEW & HISTORY (Figma 1 - media_1789984082531.png)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* TOP HEADER: Back Button + Page Title & Subtitle           */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            title="ย้อนกลับ"
            className="w-8 h-8 rounded-full bg-[#0B2046] hover:bg-[#081836] text-white flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              เงินเดือนของฉัน
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลรายได้รายหักของคุณเท่านั้น
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 SUMMARY METRIC CARDS (Matching Figma 1 100%)            */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 animate-pulse min-h-[140px]"
            >
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-36 bg-slate-200 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: เงินเดือนสุทธิ (Net Pay) - Dark Navy Card */}
          <div className="bg-[#0B2046] text-white rounded-2xl p-5 shadow-md flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">
                เงินเดือนสุทธิ (Net Pay)
              </span>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-white/80" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-white">
                  {formatMoneyInt(overview?.latestNetPay)}
                </span>
                <span className="text-xs font-medium text-slate-300">บาท</span>
              </div>
              <p className="text-[11px] text-slate-300/80 mt-1 font-mono truncate">
                โอนเข้าบัญชี {overview?.bankAccountMasked || 'xxx-xxx-xxx-x'}
              </p>
            </div>
          </div>

          {/* Card 2: รายได้รวม - White Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                รายได้รวม
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatMoneyInt(overview?.latestGrossIncome)}
                </span>
                <span className="text-xs font-medium text-slate-400">บาท</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate" title={overview?.grossSubtext}>
                {overview?.grossSubtext || 'เงินเดือน + ค่าตอบแทน'}
              </p>
            </div>
          </div>

          {/* Card 3: รายการหักรวม - White Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                รายการหักรวม
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatMoneyInt(overview?.latestTotalDeductions)}
                </span>
                <span className="text-xs font-medium text-slate-400">บาท</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate" title={overview?.deductionSubtext}>
                {overview?.deductionSubtext || 'ภาษี ประกันสังคม'}
              </p>
            </div>
          </div>

          {/* Card 4: ยอดสะสมทั้งปี (YTD) - White Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ยอดสะสมทั้งปี (YTD)
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatMoneyInt(overview?.ytdTotalGross)}
                </span>
                <span className="text-xs font-medium text-slate-400">บาท</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
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
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[580px]">
          <div className="space-y-5 flex-1">
            {/* Table Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
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
                  className="w-full sm:w-56 h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B2046]"
                />
              </div>
            </div>

            {/* Slips History Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-3 px-3.5 whitespace-nowrap">เดือน-ปี</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">รายได้รวม</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">รายการหักรวม</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">เงินเดือนสุทธิ</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">วันที่โอน</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">สถานะ</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((row) => (
                      <tr
                        key={row.payrollId}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => handleSelectSlip(row.payrollId)}
                      >
                        <td className="py-3.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                          {row.periodMonthName}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatMoney(row.totalGrossIncome)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-mono text-rose-600 whitespace-nowrap">
                          {formatMoney(row.totalDeductions)}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatMoney(row.netPayableSalary)}
                        </td>
                        <td className="py-3.5 px-3.5 text-center text-slate-600 whitespace-nowrap">
                          {row.paymentDateThai}
                        </td>
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSlip(row.payrollId);
                              }}
                              title="ดูรายละเอียดสลิป"
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-[#0B2046] hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPdf(row.payrollId, row.periodMonthName);
                              }}
                              disabled={downloadingId === row.payrollId}
                              title="ดาวน์โหลดสลิปเงินเดือน (PDF)"
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {downloadingId === row.payrollId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
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
          </div>

          {/* Pagination & Page Size Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-6 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-600">แสดงผล</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0B2046] cursor-pointer shadow-2xs"
              >
                <option value={5}>5 รายการ / หน้า</option>
                <option value={8}>8 รายการ / หน้า</option>
                <option value={10}>10 รายการ / หน้า</option>
                <option value={12}>12 รายการ / หน้า</option>
                <option value={20}>20 รายการ / หน้า</option>
              </select>
              <span className="text-slate-400">
                (แสดง {paginatedHistory.length} จากทั้งหมด {filteredHistory.length} รายการ)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                      currentPage === p
                        ? 'bg-[#0B2046] text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2 Visual Charts (4 Cols - Matching Figma 1) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Chart: Pie / Donut Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-3.5 h-3.5 text-[#0B2046]" />
              สัดส่วนเงินเดือนงวดล่าสุด
            </h3>

            {/* SVG Pie Chart */}
            <div className="relative flex items-center justify-center py-2">
              <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                {/* Background base circle */}
                <circle cx="50" cy="50" r="38" fill="#F8FAFC" />
                {/* Green slice: Base Salary */}
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="20"
                  strokeDasharray="140 188"
                  strokeDashoffset="0"
                />
                {/* Yellow slice: OT / Allowances */}
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="20"
                  strokeDasharray="30 188"
                  strokeDashoffset="-140"
                />
                {/* Blue slice: Net Pay */}
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  fill="transparent"
                  stroke="#3B82F6"
                  strokeWidth="20"
                  strokeDasharray="20 188"
                  strokeDashoffset="-170"
                />
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="space-y-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>เงินเดือนพื้นฐาน</span>
                </div>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatMoney(overview?.chartData?.baseSalaryAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span>ค่าล่วงเวลา / เบี้ยขยัน</span>
                </div>
                <span className="font-semibold text-slate-800 font-mono">
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
                <span className="font-semibold text-slate-800 font-mono">
                  {formatMoney(overview?.chartData?.deductionsAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Chart: Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#0B2046]" />
              แนวโน้มเงินเดือนสุทธิ
            </h3>

            {/* Custom Simple Bar Chart */}
            <div className="h-36 flex items-end justify-center gap-4 pt-4 px-2 border-b border-slate-200">
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
                    <span className="text-[10px] text-slate-500 font-medium">
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
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
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
