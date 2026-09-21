'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { leaveService } from '@/services/leaveService';
import { MyLeaveSummary } from '@/types/leave';
import {
  ChevronLeft,
  Calendar,
  Download,
  Users,
  Clock,
  AlertTriangle,
  Plus,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

export default function LeaveBalancesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { error, success } = useToast();

  // Current Thai Buddhist Year (e.g. 2026 -> 2569)
  const currentCEYear = new Date().getFullYear();
  const currentThaiYear = currentCEYear + 543;

  const [selectedYear, setSelectedYear] = useState<number>(currentThaiYear);
  const [summary, setSummary] = useState<MyLeaveSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Available Thai Buddhist Years for dropdown (current year, and past 3 years)
  const availableYears = [
    currentThaiYear,
    currentThaiYear - 1,
    currentThaiYear - 2,
    currentThaiYear - 3,
  ];

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumb({ section: 'ยอดวันลาคงเหลือ', page: 'ภาพรวมยอดวันลา' });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  // Load Leave Summary
  const fetchSummary = async (thaiYear: number) => {
    setIsLoading(true);
    try {
      const ceYear = thaiYear - 543;
      const data = await leaveService.getMyLeaveSummary({
        year: ceYear,
        employeeId: user?.employeeId,
      });
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load leave balance summary:', err);
      error(err.message || 'ไม่สามารถโหลดข้อมูลยอดวันลาคงเหลือได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchSummary(selectedYear);
    }
  }, [selectedYear, isAuthLoading, user?.employeeId]);

  // Handle Export Report (CSV / Excel format with UTF-8 BOM)
  const handleExport = () => {
    if (!summary) return;
    setIsExporting(true);

    try {
      const csvRows: string[] = [];

      // Title & metadata
      csvRows.push(`"รายงานยอดวันลาคงเหลือประจำปี พ.ศ. ${selectedYear}"`);
      csvRows.push(`"พนักงาน:","${summary.employeeName} (${summary.employeeCode})"`);
      csvRows.push(`"ตำแหน่ง:","${summary.positionTitle || '-'}"`);
      csvRows.push(`"แผนก:","${summary.departmentName || '-'}"`);
      csvRows.push(`"วันที่ออกรายงาน:","${new Date().toLocaleDateString('th-TH')}"`);
      csvRows.push('');

      // Table Header
      csvRows.push('"ลำดับ","ประเภทการลา","โควตาทั้งหมด","ใช้ไปแล้ว","คงเหลือ","หน่วย","หมายเหตุ"');

      // 8 Categories
      const categories = [
        { no: 1, name: 'ลาป่วย', item: summary.sickLeave },
        { no: 2, name: 'ลากิจ', item: summary.personalLeave },
        { no: 3, name: 'ลาพักร้อน', item: summary.annualLeave },
        { no: 4, name: 'ลาพิเศษ', item: summary.specialLeave },
        {
          no: 5,
          name: 'ลาบวช',
          item: summary.ordinationLeave,
          note: `จำนวนครั้ง: ${summary.ordinationLeave.usedTimes ?? 0}/${summary.ordinationLeave.maxTimes ?? 1} ครั้ง`,
        },
        {
          no: 6,
          name: 'ลาเกณฑ์ทหาร',
          item: summary.militaryLeave,
          note: `จำนวนครั้ง: ${summary.militaryLeave.usedTimes ?? 0}/${summary.militaryLeave.maxTimes ?? 1} ครั้ง`,
        },
        { no: 7, name: 'ลาคลอด', item: summary.maternityLeave },
        {
          no: 8,
          name: 'เวลาทำ OT ทั้งหมด',
          item: {
            quotaDays: summary.totalOvertimeHours,
            usedDays: summary.totalOvertimeHours,
            remainingDays: 0,
            unit: 'ชั่วโมง',
          },
        },
      ];

      categories.forEach((cat) => {
        csvRows.push(
          `"${cat.no}","${cat.name}","${cat.item.quotaDays}","${cat.item.usedDays}","${cat.item.remainingDays}","${cat.item.unit}","${cat.note || ''}"`
        );
      });

      // Encode UTF-8 with BOM
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `leave_balance_summary_${summary.employeeCode || 'EMP'}_${selectedYear}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('ส่งออกรายงานยอดวันลาคงเหลือเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error('Failed to export report:', err);
      error('เกิดข้อผิดพลาดในการส่งออกรายงาน');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ========================================================= */}
      {/* TOP HEADER: Back button + Page Title + Year & Export CTA  */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Back button + Title & Subtitle */}
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
              ยอดวันลาคงเหลือ
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลการบันทึกยอดวันลาประจำตัวของพนักงานรายคน
            </p>
          </div>
        </div>

        {/* Right: Year Filter Selector + Export Button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Thai Buddhist Year Dropdown */}
          <div className="relative inline-block">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200/90 rounded-xl shadow-xs text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Report Button (Mockup Navy button) */}
          <button
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-medium shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>ส่งออกรายงาน (Export)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 8 SUMMARY CARDS GRID (Matching Mockup 100%)               */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 animate-pulse min-h-[140px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
              </div>
              <div className="h-8 w-24 bg-slate-200 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: ลาป่วยปีนี้ไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลาป่วยปีนี้ไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.sickLeave ? `${summary.sickLeave.usedDays}/${summary.sickLeave.quotaDays}` : '0/30'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
            </div>
          </div>

          {/* Card 2: ลากิจปีนี้ไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลากิจปีนี้ไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.personalLeave ? `${summary.personalLeave.usedDays}/${summary.personalLeave.quotaDays}` : '0/3'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
            </div>
          </div>

          {/* Card 3: ลาพักร้อนปีนี้ไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลาพักร้อนปีนี้ไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.annualLeave ? `${summary.annualLeave.usedDays}/${summary.annualLeave.quotaDays}` : '0/6'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
            </div>
          </div>

          {/* Card 4: ลาพิเศษปีนี้ไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลาพิเศษปีนี้ไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.specialLeave ? `${summary.specialLeave.usedDays}/${summary.specialLeave.quotaDays}` : '0/10'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
            </div>
          </div>

          {/* Card 5: ลาบวชไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลาบวชไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.ordinationLeave ? `${summary.ordinationLeave.usedDays}/${summary.ordinationLeave.quotaDays}` : '0/30'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-800 tracking-tight">
                  {summary?.ordinationLeave ? `${summary.ordinationLeave.usedTimes ?? 0}/${summary.ordinationLeave.maxTimes ?? 1}` : '0/1'}
                </span>
                <span className="text-xs font-medium text-slate-400">ครั้ง</span>
              </div>
            </div>
          </div>

          {/* Card 6: ลาเกณฑ์ทหารไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลาเกณฑ์ทหารไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.militaryLeave ? `${summary.militaryLeave.usedDays}/${summary.militaryLeave.quotaDays}` : '0/365'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-800 tracking-tight">
                  {summary?.militaryLeave ? `${summary.militaryLeave.usedTimes ?? 0}/${summary.militaryLeave.maxTimes ?? 1}` : '0/1'}
                </span>
                <span className="text-xs font-medium text-slate-400">ครั้ง</span>
              </div>
            </div>
          </div>

          {/* Card 7: ลาคลอดไปแล้ว */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                ลาคลอดไปแล้ว
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary?.maternityLeave ? `${summary.maternityLeave.usedDays}/${summary.maternityLeave.quotaDays}` : '0/98'}
                </span>
                <span className="text-xs font-medium text-slate-400">วัน</span>
              </div>
            </div>
          </div>

          {/* Card 8: เวลาทำ OT ทั้งหมด */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">
                เวลาทำ OT ทั้งหมด
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {summary ? summary.totalOvertimeHours : '0'}
                </span>
                <span className="text-xs font-medium text-slate-400">ชั่วโมง</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
