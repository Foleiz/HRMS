'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { essAttendanceService } from '@/services/essAttendanceService';
import { AttendanceDaily, MyAttendanceMonthlySummary } from '@/types/attendance';
import { AttendanceAdjustment, CreateAttendanceAdjustmentRequest } from '@/types/attendanceAdjustment';
import {
  Clock,
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
  CalendarDays,
} from 'lucide-react';

export default function EssAttendancePage() {
  const { user } = useAuth();
  const toast = useToast();

  // ─────────────────────────────────────────────────────────────
  // State: Data
  // ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'history' | 'adjustments'>('history');

  // Filter Month & Year for History
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [historyList, setHistoryList] = useState<AttendanceDaily[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MyAttendanceMonthlySummary | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Adjustments list
  const [adjustmentsList, setAdjustmentsList] = useState<AttendanceAdjustment[]>([]);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(false);

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

  // ─────────────────────────────────────────────────────────────
  // Adjustment Modal Actions
  // ─────────────────────────────────────────────────────────────
  const openAdjustmentModal = (record?: AttendanceDaily) => {
    if (record) {
      setFormData({
        attendanceId: record.id > 0 ? record.id : undefined,
        workDate: record.workDate,
        adjustedClockIn: record.actualIn ? formatTime(record.actualIn) : '08:30',
        adjustedClockOut: record.actualOut ? formatTime(record.actualOut) : '17:30',
        reason: '',
      });
    } else {
      setFormData({
        workDate: new Date().toISOString().split('T')[0],
        adjustedClockIn: '08:30',
        adjustedClockOut: '17:30',
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

      if (!targetAttendanceId) {
        toast.warning('ไม่พบข้อมูลบันทึกเวลาของวันที่เลือกในระบบ');
        return;
      }

      const req: CreateAttendanceAdjustmentRequest = {
        attendanceId: targetAttendanceId,
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
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'เกิดข้อผิดพลาดในการยื่นคำขอ';
      toast.error(errorMsg);
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleCancelAdjustment = async (id: number) => {
    if (!confirm('คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?')) return;
    try {
      await essAttendanceService.cancelAdjustment(id);
      toast.success('ยกเลิกคำขอปรับปรุงเวลาเรียบร้อยแล้ว');
      loadAdjustments();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ไม่สามารถยกเลิกคำขอได้';
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            วันหยุดประจำสัปดาห์
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <RotateCcw className="w-3 h-3" /> ยกเลิกแล้ว
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─────────────────────────────────────────────────────────────
          Page Header
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              บันทึกเวลาของฉัน (ESS)
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Employee Self-Service
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {user?.fullName} {user?.employeeCode ? `(รหัส ${user.employeeCode})` : ''} • ตรวจสอบประวัติเวลาเข้า-ออกงานจากระบบสแกนนิ้ว/Excel และยื่นคำขอปรับเวลา
          </p>
        </div>

        <button
          onClick={() => openAdjustmentModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#0052CC] hover:bg-[#0747A6] text-white shadow-sm transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          ยื่นคำขอปรับเวลาใหม่
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Tab Navigation
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-[#0052CC] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติเวลาของฉัน
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'adjustments'
              ? 'bg-[#0052CC] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          คำขอปรับปรุงเวลา ({adjustmentsList.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TAB CONTENT: History & Monthly Summary
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Month / Year Filter & Monthly Summary Cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#0052CC]" />
              <span className="font-semibold text-slate-800 text-sm">เลือกเดือนที่ต้องการดู:</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {thaiMonths.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Stat Cards */}
          {monthlySummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-slate-500">วันทำงานทั้งหมด</span>
                <div className="text-2xl font-bold text-slate-800">{monthlySummary.totalWorkDays} วัน</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-emerald-600 font-medium">เข้างานตรงเวลา</span>
                <div className="text-2xl font-bold text-emerald-600">{monthlySummary.presentCount} วัน</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-amber-600 font-medium">มาสาย</span>
                <div className="text-2xl font-bold text-amber-600">
                  {monthlySummary.lateCount} ครั้ง{' '}
                  <span className="text-xs font-normal text-slate-400">({monthlySummary.totalLateMinutes} นาที)</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs text-rose-600 font-medium">ขาดงาน / ออกก่อน</span>
                <div className="text-2xl font-bold text-rose-600">
                  {monthlySummary.absentCount} วัน{' '}
                  <span className="text-xs font-normal text-slate-400">
                    (ออกก่อน {monthlySummary.earlyLeaveCount} ครั้ง)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">ตารางบันทึกเวลาประจำวัน</h3>
              <span className="text-xs text-slate-400">{historyList.length} รายการ</span>
            </div>

            {isLoadingHistory ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0052CC]" />
                กำลังโหลดประวัติเวลา...
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                ไม่พบข้อมูลบันทึกเวลาในเดือนนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">วันที่</th>
                      <th className="py-3 px-4">กะการทำงาน</th>
                      <th className="py-3 px-4">เวลาเข้าจริง</th>
                      <th className="py-3 px-4">เวลาออกจริง</th>
                      <th className="py-3 px-4">มาสาย</th>
                      <th className="py-3 px-4">ออกก่อน</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyList.map((rec) => (
                      <tr key={rec.id || rec.workDate} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {formatThaiDate(rec.workDate)}
                          <span className="block text-xs font-mono text-slate-400">{rec.workDate}</span>
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
                          <button
                            onClick={() => openAdjustmentModal(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                            title="ยื่นขอปรับเวลาสำหรับวันนี้"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            ขอปรับเวลา
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TAB CONTENT: Adjustment Requests
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">ประวัติคำขอปรับปรุงเวลาเข้า-ออกงาน</h3>
            <span className="text-xs text-slate-400">{adjustmentsList.length} รายการ</span>
          </div>

          {isLoadingAdjustments ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0052CC]" />
              กำลังโหลดรายการคำขอ...
            </div>
          ) : adjustmentsList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              คุณยังไม่เคยยื่นคำขอปรับปรุงเวลา
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">วันที่ขอปรับ</th>
                    <th className="py-3 px-4">เวลาเดิม</th>
                    <th className="py-3 px-4">เวลาที่ขอปรับ</th>
                    <th className="py-3 px-4">เหตุผล</th>
                    <th className="py-3 px-4">สถานะคำขอ</th>
                    <th className="py-3 px-4">วันที่ยื่นคำขอ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustmentsList.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {adj.workDate}
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
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL: Submit Adjustment
      ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0052CC]">
                  <FileEdit className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">ยื่นคำขอปรับปรุงเวลาเข้า-ออก</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">วันที่ทำงานที่ต้องการปรับ</label>
                <input
                  type="date"
                  required
                  value={formData.workDate}
                  onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">เวลาเข้างานที่ขอปรับ</label>
                  <input
                    type="time"
                    required
                    value={formData.adjustedClockIn}
                    onChange={(e) => setFormData({ ...formData, adjustedClockIn: e.target.value })}
                    className="w-full text-sm font-mono border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">เวลาออกงานที่ขอปรับ</label>
                  <input
                    type="time"
                    required
                    value={formData.adjustedClockOut}
                    onChange={(e) => setFormData({ ...formData, adjustedClockOut: e.target.value })}
                    className="w-full text-sm font-mono border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
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
        </div>
      )}
    </div>
  );
}
