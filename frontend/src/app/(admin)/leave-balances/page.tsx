'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { useToast } from '@/context/ToastContext';
import { leaveService } from '@/services/leaveService';
import { MyLeaveSummary, LeaveTypeCard } from '@/types/leave';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { resolveLeaveColor, withAlpha } from '@/lib/leaveColors';
import { CustomSelect } from '@/components/ui/CustomSelect';

export default function LeaveBalancesPage() {
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

  const leaveCards: LeaveTypeCard[] = summary?.leaveCards ?? [];
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const totalOf = (c: LeaveTypeCard) => c.quotaDays + c.carriedForwardDays + c.adjustedDays;
  const timesLabel = (c: LeaveTypeCard) =>
    c.maxTimes != null ? `${c.usedTimes ?? 0}/${c.maxTimes} ครั้ง${c.timesScope === 'LIFETIME' ? ' (ตลอดอายุงาน)' : ' (ต่อปี)'}` : '';

  // Handle Export Report (CSV / Excel format with UTF-8 BOM)
  const handleExport = () => {
    if (!summary) return;
    setIsExporting(true);

    try {
      const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const csvRows: string[] = [];

      csvRows.push(q(`รายงานยอดวันลาคงเหลือประจำปี พ.ศ. ${selectedYear}`));
      csvRows.push(`${q('พนักงาน:')},${q(`${summary.employeeName} (${summary.employeeCode})`)}`);
      csvRows.push(`${q('ตำแหน่ง:')},${q(summary.positionTitle || '-')}`);
      csvRows.push(`${q('แผนก:')},${q(summary.departmentName || '-')}`);
      csvRows.push(`${q('วันที่ออกรายงาน:')},${q(new Date().toLocaleDateString('th-TH'))}`);
      csvRows.push('');

      csvRows.push(['ลำดับ', 'ประเภทการลา', 'สิทธิ์ประจำปี', 'ยกมา', 'ปรับปรุง', 'ใช้ไปแล้ว', 'คงเหลือ', 'หน่วย', 'หมายเหตุ'].map(q).join(','));
      leaveCards.forEach((c, i) => {
        csvRows.push(
          [i + 1, c.name, c.quotaDays, c.carriedForwardDays, c.adjustedDays, c.usedDays, c.remainingDays, 'วัน', timesLabel(c)]
            .map(q)
            .join(',')
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
      {/* ACTIONS: Year Filter Selector + Export Button             */}
      {/* ========================================================= */}
      <div className="flex items-center justify-end gap-3">
        {/* Thai Buddhist Year Dropdown */}
        <div className="relative inline-block">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/90 rounded-xl shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <CustomSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </CustomSelect>
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

      {/* ========================================================= */}
      {/* LEAVE BALANCE CARDS — one per entitled leave type        */}
      {/* ========================================================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">ยอดวันลาประจำปี พ.ศ. {selectedYear}</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm space-y-4 animate-pulse min-h-[150px]"
              >
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-8 w-24 bg-slate-200 rounded mt-4" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : leaveCards.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            ยังไม่มีสิทธิ์การลาในปีนี้ — ตรวจสอบนโยบายการลาของประเภท/ระดับพนักงานที่เมนู &quot;การลา&quot;
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {leaveCards.map((c) => {
              const color = resolveLeaveColor(c.color, c.code || c.leaveTypeId);
              const total = totalOf(c);
              const pct = total > 0 ? Math.min(100, (c.usedDays / total) * 100) : 0;
              return (
                <div
                  key={c.leaveTypeId}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 border-t-4 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[150px]"
                  style={{ borderTopColor: color, backgroundImage: `linear-gradient(180deg, ${withAlpha(color, 0.07)}, transparent 60%)` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold leading-snug" style={{ color }}>
                      {c.name}
                    </h3>
                    {!c.isPaidLeave && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        ไม่ได้รับค่าจ้าง
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        {fmt(c.usedDays)}/{fmt(total)}
                      </span>
                      <span className="text-xs font-medium text-slate-400">วัน (ใช้ไป/สิทธิ์)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        คงเหลือ <b className="text-slate-800 dark:text-slate-100">{fmt(c.remainingDays)}</b> วัน
                      </span>
                      {c.carriedForwardDays > 0 && <span>ยกมา {fmt(c.carriedForwardDays)} วัน</span>}
                      {c.adjustedDays !== 0 && <span>ปรับปรุง {c.adjustedDays > 0 ? '+' : ''}{fmt(c.adjustedDays)} วัน</span>}
                      {c.maxTimes != null && <span>{timesLabel(c)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
