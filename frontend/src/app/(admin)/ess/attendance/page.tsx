'use client';

import { useLoadPhase } from '@/hooks/useLoadPhase';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { TabBar, type TabBarItem } from '@/components/ui';
import { ModalShell } from '@/components/ui/ModalShell';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import AccessDenied from '@/components/common/AccessDenied';
import { confirmAction } from '@/lib/sweetalert';
import { getSmartYearRange } from '@/lib/yearUtils';
import { essAttendanceService } from '@/services/essAttendanceService';
import { AttendanceDaily, MyAttendanceMonthlySummary } from '@/types/attendance';
import { AttendanceAdjustment, CreateAttendanceAdjustmentRequest } from '@/types/attendanceAdjustment';
import {
  Clock,
  ClipboardCheck,
  History,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  PlusCircle,
  X,
  Send,
  Loader2,
  Calendar,
} from 'lucide-react';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';
import { CustomSelect } from '@/components/ui/CustomSelect';

export default function EssAttendancePage() {
  const { user, hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const { setBreadcrumb } = useBreadcrumb();

  const canViewEss =
    hasPermission('ESS_TIME_VIEW') ||
    hasPermission('TIME_DAILY_VIEW') ||
    hasPermission('TIME_VIEW') ||
    hasPermission('TIME_SCHEDULE_VIEW') ||
    hasPermission('TIME_IMPORT_VIEW') ||
    hasRole('ADMIN') ||
    hasRole('SYSTEM_SUPER') ||
    Boolean(user?.employeeId);

  // ─────────────────────────────────────────────────────────────
  // State: Data
  // ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'history' | 'adjustments'>('history');

  // Sync breadcrumb with activeTab
  useEffect(() => {
    setBreadcrumb({
      section: 'บันทึกเวลาของฉัน (ESS)',
      page: activeTab === 'adjustments' ? 'คำขอปรับปรุงเวลา' : 'ตรวจบันทึกเวลาของฉัน',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Filter Month & Year for History
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [historyList, setHistoryList] = useState<AttendanceDaily[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MyAttendanceMonthlySummary | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const historyPhase = useLoadPhase(isLoadingHistory);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Adjustments list
  const [adjustmentsList, setAdjustmentsList] = useState<AttendanceAdjustment[]>([]);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(false);
  const adjustmentsPhase = useLoadPhase(isLoadingAdjustments);

  // Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [formData, setFormData] = useState<{
    attendanceId?: number;
    workDate: string;
    adjustedClockIn: string;
    adjustedClockOut: string;
    reason: string;
  }>({
    workDate: new Date().toISOString().split('T')[0],
    adjustedClockIn: '08:30',
    adjustedClockOut: '17:30',
    reason: '',
  });

  // ─────────────────────────────────────────────────────────────
  // Load History & Summary
  // ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const [historyData, summaryData] = await Promise.all([
        essAttendanceService.getMyHistory(selectedYear, selectedMonth),
        essAttendanceService.getMySummary(selectedYear, selectedMonth),
      ]);
      setHistoryList(historyData);
      setMonthlySummary(summaryData);
    } catch (err: unknown) {
      console.error('Failed to load history:', err);
      toast.error('ไม่สามารถโหลดประวัติบันทึกเวลาได้');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedYear, selectedMonth, toast]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await essAttendanceService.recalculateMyAttendance(selectedYear, selectedMonth);
      toast.success('คำนวณเวลาเข้างานและสถานะใหม่เรียบร้อยแล้ว');
      await loadHistory();
    } catch (err: unknown) {
      console.error('Failed to recalculate:', err);
      toast.error('ไม่สามารถคำนวณเวลาใหม่ได้');
    } finally {
      setIsRecalculating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Load Adjustments
  // ─────────────────────────────────────────────────────────────
  const loadAdjustments = useCallback(async () => {
    try {
      setIsLoadingAdjustments(true);
      const data = await essAttendanceService.getMyAdjustments();
      setAdjustmentsList(data.items);
    } catch (err: unknown) {
      console.error('Failed to load adjustments:', err);
    } finally {
      setIsLoadingAdjustments(false);
    }
  }, []);


  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else {
      loadAdjustments();
    }
  }, [activeTab, loadHistory, loadAdjustments]);

  // Helper to format ISO to HH:mm for <input type="time" />
  const formatInputTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Adjustment Modal Actions
  // ─────────────────────────────────────────────────────────────
  // วันนี้ตามเวลาเครื่อง (toISOString เป็น UTC → ก่อน 07:00 จะได้เมื่อวาน)
  const todayLocalStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const isFutureDate = (dateStr?: string) => !!dateStr && dateStr.slice(0, 10) > todayLocalStr;

  const openAdjustmentModal = (record?: AttendanceDaily) => {
    if (record) {
      setFormData({
        attendanceId: record.id > 0 ? record.id : undefined,
        workDate: record.workDate,
        adjustedClockIn: record.actualIn ? formatInputTime(record.actualIn) : '08:30',
        adjustedClockOut: record.actualOut ? formatInputTime(record.actualOut) : '17:30',
        reason: '',
      });
    } else {
      const todayStr = todayLocalStr;
      const matched = historyList.find((h) => h.workDate === todayStr);
      setFormData({
        attendanceId: matched && matched.id > 0 ? matched.id : undefined,
        workDate: todayStr,
        adjustedClockIn: matched?.actualIn ? formatInputTime(matched.actualIn) : '08:30',
        adjustedClockOut: matched?.actualOut ? formatInputTime(matched.actualOut) : '17:30',
        reason: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.warning('กรุณาระบุเหตุผลการขอปรับปรุงเวลา');
      return;
    }

    try {
      setIsSubmittingAdjustment(true);

      // Find attendanceId if not set
      let targetAttendanceId = formData.attendanceId;
      if (!targetAttendanceId) {
        const found = historyList.find((h) => h.workDate === formData.workDate);
        if (found && found.id > 0) {
          targetAttendanceId = found.id;
        }
      }

      if (!targetAttendanceId && !formData.workDate) {
        toast.warning('กรุณาระบุวันที่ทำงานที่ต้องการปรับปรุงเวลา');
        return;
      }

      if (isFutureDate(formData.workDate)) {
        toast.warning('ขอปรับเวลาได้เฉพาะวันนี้หรือวันที่ผ่านมาแล้ว');
        return;
      }

      const req: CreateAttendanceAdjustmentRequest = {
        attendanceId: targetAttendanceId || 0,
        workDate: formData.workDate,
        adjustedClockIn: formData.adjustedClockIn ? `${formData.workDate}T${formData.adjustedClockIn}:00` : null,
        adjustedClockOut: formData.adjustedClockOut ? `${formData.workDate}T${formData.adjustedClockOut}:00` : null,
        reason: formData.reason.trim(),
      };

      await essAttendanceService.submitAdjustment(req);
      toast.success('ยื่นคำขอปรับปรุงเวลาเรียบร้อยแล้ว รอการพิจารณาจากหัวหน้างาน/HR');
      setIsModalOpen(false);
      if (activeTab === 'adjustments') {
        loadAdjustments();
      } else {
        setActiveTab('adjustments');
      }
    } catch (err: unknown) {
      const resData = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;
      const errorMsg =
        (resData?.errors && resData.errors.length > 0 ? resData.errors[0] : null) ||
        resData?.message ||
        'เกิดข้อผิดพลาดในการยื่นคำขอ';
      toast.error(errorMsg);
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleCancelAdjustment = async (id: number) => {
    const isConfirmed = await confirmAction({
      title: 'ยืนยันการยกเลิกคำขอ',
      text: 'คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?',
      confirmButtonText: 'ยกเลิกคำขอ',
      cancelButtonText: 'ปิด',
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      await essAttendanceService.cancelAdjustment(id);
      toast.success('ยกเลิกคำขอปรับปรุงเวลาเรียบร้อยแล้ว');
      loadAdjustments();
    } catch (err: unknown) {
      const resData = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;
      const errorMsg =
        (resData?.errors && resData.errors.length > 0 ? resData.errors[0] : null) ||
        resData?.message ||
        'ไม่สามารถยกเลิกคำขอได้';
      toast.error(errorMsg);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Helper Formatters
  // ─────────────────────────────────────────────────────────────
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '-';
    }
  };

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatThaiShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${y + 543}`;
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status?: string, isAbsent?: boolean) => {
    if (isAbsent || status === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" /> ขาดงาน
        </span>
      );
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> ตรงเวลา
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> มาสาย
          </span>
        );
      case 'EARLY_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3 h-3" /> ออกก่อน
          </span>
        );
      case 'LATE_AND_EARLY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> ทั้งสายและออกก่อน
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            วันหยุดนักขัตฤกษ์
          </span>
        );
      case 'OFF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:text-slate-400 border border-slate-200">
            วันหยุดประจำสัปดาห์
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 dark:text-slate-400 border border-slate-200">
            ยังไม่ลงเวลา
          </span>
        );
    }
  };

  const renderAdjustmentStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> รอพิจารณา
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> ไม่อนุมัติ
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:text-slate-400 border border-slate-200">
            <RotateCcw className="w-3 h-3" /> ยกเลิกแล้ว
          </span>
        );
      default:
        return <span className="text-xs text-slate-500 dark:text-slate-400">{status}</span>;
    }
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const pendingCount = adjustmentsList.filter((a) => a.status === 'PENDING').length;

  if (!canViewEss) {
    return <AccessDenied message="คุณไม่มีสิทธิ์เข้าถึงหน้าบันทึกเวลาของฉัน (ESS)" />;
  }

  return (
    <div className="space-y-6 pb-12">
{/* การ์ดสรุปประจำเดือน (บนสุด) */}
      {activeTab === 'history' && monthlySummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. วันทำงานทั้งหมด */}
          <div className="bg-slate-100 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="text-xs font-bold">วันทำงานทั้งหมด</span>
              <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
              {monthlySummary.totalWorkDays} <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">วัน</span>
            </div>
          </div>

          {/* 2. เข้างานตรงเวลา */}
          <div className="bg-emerald-100 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="text-xs font-bold">เข้างานตรงเวลา</span>
              <div className="w-7 h-7 rounded-full bg-white dark:bg-emerald-900/60 shadow-xs flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {monthlySummary.presentCount} <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">วัน</span>
            </div>
          </div>

          {/* 3. มาสาย */}
          <div className="bg-amber-100 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-xs font-bold">มาสาย</span>
              <div className="w-7 h-7 rounded-full bg-white dark:bg-amber-900/60 shadow-xs flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
              {monthlySummary.lateCount} <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">ครั้ง</span>{' '}
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">({monthlySummary.totalLateMinutes} นาที)</span>
            </div>
          </div>

          {/* 4. ขาดงาน / ออกก่อน */}
          <div className="bg-rose-100 dark:bg-rose-950/60 p-4 rounded-2xl border border-rose-300 dark:border-rose-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
              <span className="text-xs font-bold">ขาดงาน / ออกก่อน</span>
              <div className="w-7 h-7 rounded-full bg-white dark:bg-rose-900/60 shadow-xs flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300">
              {monthlySummary.absentCount} <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">วัน</span>{' '}
              <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                (ออกก่อน {monthlySummary.earlyLeaveCount} ครั้ง)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Sub-menu Tabs (รูปแบบเดียวกับเมนูพนักงาน)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 rounded-t-2xl">
        <TabBar
          aria-label="เมนูเวลาทำงานของฉัน"
          items={([
            { key: 'history', label: 'ตรวจบันทึกเวลาของฉัน', onClick: () => setActiveTab('history') },
            { key: 'adjustments', label: <><span>คำขอปรับปรุงเวลา</span> {pendingCount > 0 && ( <span className="px-1.5 py-0.5 text-2xs font-bold rounded-full bg-amber-500 text-white animate-pulse"> {pendingCount} </span> )}</>, onClick: () => setActiveTab('adjustments') },
          ] as (TabBarItem | null)[]).filter((t): t is TabBarItem => t !== null)}
          activeKey={(activeTab === 'history') ? 'history' : (activeTab === 'adjustments') ? 'adjustments' : null}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TAB CONTENT: History & Monthly Summary
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-6">


          {/* History Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ตารางบันทึกเวลาประจำวัน</h3>
                <span className="text-xs text-slate-400">{historyList.length} รายการ</span>
              </div>
              <div className="flex items-center gap-2">
                <CustomSelect
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {thaiMonths.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </CustomSelect>

                <CustomSelect
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getSmartYearRange({ forwardYears: 1, backYears: 5, selectedYear }).map((y) => (
                    <option key={y} value={y}>
                      พ.ศ. {y + 543}
                    </option>
                  ))}
                </CustomSelect>

                {/* Recalculate Button (รูปแบบเดียวกับหน้าตรวจบันทึกเวลา) */}
                <button
                  type="button"
                  onClick={handleRecalculate}
                  disabled={isRecalculating || isLoadingHistory}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                  title="ประมวลผลคำนวณเวลาใหม่สำหรับเดือนนี้"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-primary dark:text-blue-400' : ''}`} />
                </button>
              </div>
            </div>

            <RefreshIndicator active={historyPhase.refreshing} />
            {historyPhase.initialLoading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0052CC]" />
                กำลังโหลดประวัติเวลา...
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                ไม่พบข้อมูลบันทึกเวลาในเดือนนี้
              </div>
            ) : (
              <>
                {/* Desktop View: Full Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="table-standard w-full min-w-[750px] text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">
                      <tr className="whitespace-nowrap">
                        <th className="py-3.5 px-4 whitespace-nowrap">วันที่</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">กะการทำงาน</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">เวลาเข้าจริง</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">เวลาออกจริง</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">มาสาย</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">ออกก่อน</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">สถานะ</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyList.map((rec) => (
                        <tr key={rec.id || rec.workDate} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {formatThaiDate(rec.workDate)}
                            <span className="block text-xs font-mono text-slate-400">{formatThaiShortDate(rec.workDate)}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <span className="font-semibold block text-slate-700">{rec.shiftName || 'กะปกติ'}</span>
                            <span className="text-slate-400 font-mono">{rec.shiftTimeWindow || '-'}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {formatTime(rec.actualIn)}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {formatTime(rec.actualOut)}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono">
                            {rec.lateMinutes > 0 ? (
                              <span className="text-amber-600 font-semibold">{rec.lateMinutes} นาที</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono">
                            {rec.earlyLeaveMinutes > 0 ? (
                              <span className="text-orange-600 font-semibold">{rec.earlyLeaveMinutes} นาที</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(rec.status, rec.isAbsent)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isFutureDate(rec.workDate) ? (
                              <span className="text-xs text-slate-300">-</span>
                            ) : (
                            <button
                              onClick={() => openAdjustmentModal(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                              title="ยื่นขอปรับเวลาสำหรับวันนี้"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              ขอปรับเวลา
                            </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Stacked Cards */}
                <div className="md:hidden divide-y divide-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 dark:divide-slate-700/60">
                  {historyList.map((rec) => (
                    <div key={rec.id || rec.workDate} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {formatThaiDate(rec.workDate)}
                          </div>
                          <span className="text-xs font-mono text-slate-400">{formatThaiShortDate(rec.workDate)}</span>
                        </div>
                        <div>
                          {renderStatusBadge(rec.status, rec.isAbsent)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">เวลาเข้า</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {formatTime(rec.actualIn)}
                          </span>
                          {rec.lateMinutes > 0 && (
                            <span className="block text-[10px] text-amber-600 font-medium mt-0.5">
                              สาย {rec.lateMinutes} น.
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">เวลาออก</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {formatTime(rec.actualOut)}
                          </span>
                          {rec.earlyLeaveMinutes > 0 && (
                            <span className="block text-[10px] text-orange-600 font-medium mt-0.5">
                              ออกก่อน {rec.earlyLeaveMinutes} น.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-slate-500 truncate max-w-[180px]">
                          {rec.shiftName || 'กะปกติ'} ({rec.shiftTimeWindow || '-'})
                        </span>
                        {isFutureDate(rec.workDate) ? (
                          <span className="text-xs text-slate-300">-</span>
                        ) : (
                        <button
                          onClick={() => openAdjustmentModal(rec)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          ขอปรับเวลา
                        </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TAB CONTENT: Adjustment Requests
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'adjustments' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div className="flex items-baseline gap-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ประวัติคำขอปรับปรุงเวลาเข้า-ออกงาน</h3>
            <span className="text-xs text-slate-400">{adjustmentsList.length} รายการ</span>
          </div>

          <RefreshIndicator active={adjustmentsPhase.refreshing} />
          {adjustmentsPhase.initialLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0052CC]" />
              กำลังโหลดรายการคำขอ...
            </div>
          ) : adjustmentsList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              คุณยังไม่เคยยื่นคำขอปรับปรุงเวลา
            </div>
          ) : (
              <>
                {/* Desktop View: Full Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="table-standard w-full min-w-[700px] text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">
                      <tr className="whitespace-nowrap">
                        <th className="py-3.5 px-4 whitespace-nowrap">วันที่ขอปรับ</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">เวลาเดิม</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">เวลาที่ขอปรับ</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">เหตุผล</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">สถานะคำขอ</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">วันที่ยื่นคำขอ</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adjustmentsList.map((adj) => (
                        <tr key={adj.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {formatThaiShortDate(adj.workDate)}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">
                            {formatTime(adj.originalClockIn)} - {formatTime(adj.originalClockOut)}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700">
                            {formatTime(adj.adjustedClockIn)} - {formatTime(adj.adjustedClockOut)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate" title={adj.reason}>
                            {adj.reason}
                          </td>
                          <td className="py-3 px-4">
                            {renderAdjustmentStatusBadge(adj.status)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                            {adj.createdAt ? new Date(adj.createdAt).toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {adj.status === 'PENDING' ? (
                              <button
                                onClick={() => handleCancelAdjustment(adj.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                ยกเลิกคำขอ
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Stacked Cards */}
                <div className="md:hidden divide-y divide-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 dark:divide-slate-700/60">
                  {adjustmentsList.map((adj) => (
                    <div key={adj.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-900 text-sm">
                            วันที่ขอปรับ: {formatThaiShortDate(adj.workDate)}
                          </span>
                          <span className="block text-2xs text-slate-400 font-mono mt-0.5">
                            ยื่นเมื่อ: {adj.createdAt ? new Date(adj.createdAt).toLocaleString('th-TH') : '-'}
                          </span>
                        </div>
                        <div>
                          {renderAdjustmentStatusBadge(adj.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">เวลาเดิม</span>
                          <span className="font-mono text-slate-500 font-medium">
                            {formatTime(adj.originalClockIn)} - {formatTime(adj.originalClockOut)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">เวลาที่ขอปรับ</span>
                          <span className="font-mono font-bold text-blue-700">
                            {formatTime(adj.adjustedClockIn)} - {formatTime(adj.adjustedClockOut)}
                          </span>
                        </div>
                      </div>

                      {adj.reason && (
                        <div className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          <span className="font-medium text-slate-700">เหตุผล: </span>
                          {adj.reason}
                        </div>
                      )}

                      {adj.status === 'PENDING' && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleCancelAdjustment(adj.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            ยกเลิกคำขอ
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: Submit Adjustment
      ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <ModalShell className="z-50 bg-slate-900/40 backdrop-blur-sm" innerClassName="items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0052CC]">
                  <FileEdit className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">ยื่นคำขอปรับปรุงเวลาเข้า-ออก</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">วันที่ทำงานที่ต้องการปรับ</label>
                <ThaiDatePicker
                  value={formData.workDate}
                  onChange={(newDate) => {
                    const matched = historyList.find((h) => h.workDate === newDate);
                    setFormData((prev) => ({
                      ...prev,
                      workDate: newDate,
                      attendanceId: matched && matched.id > 0 ? matched.id : undefined,
                      adjustedClockIn: matched?.actualIn ? formatInputTime(matched.actualIn) : (prev.adjustedClockIn || '08:30'),
                      adjustedClockOut: matched?.actualOut ? formatInputTime(matched.actualOut) : (prev.adjustedClockOut || '17:30'),
                    }));
                  }}
                  maxDate={todayLocalStr}
                  placeholder="เลือกวันที่ทำงานที่ต้องการปรับ"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">เวลาเข้างานที่ขอปรับ <span className="text-rose-500">*</span></label>
                  <ThaiTimePicker
                    required
                    value={formData.adjustedClockIn}
                    onChange={(val) => setFormData({ ...formData, adjustedClockIn: val })}
                    align="left"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">เวลาออกงานที่ขอปรับ <span className="text-rose-500">*</span></label>
                  <ThaiTimePicker
                    required
                    value={formData.adjustedClockOut}
                    onChange={(val) => setFormData({ ...formData, adjustedClockOut: val })}
                    align="right"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  เหตุผลการขอปรับปรุงเวลา <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ระบุเหตุผล เช่น ลืมสแกนนิ้ว, ปฏิบัติงานนอกสถานที่, สแกนนิ้วไม่ติด ฯลฯ"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0052CC] hover:bg-[#0747A6] text-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isSubmittingAdjustment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  ส่งคำขอปรับเวลา
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

