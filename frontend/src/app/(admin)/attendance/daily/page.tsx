'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  X,
  Sunrise,
  Sun,
  Moon,
  Building2,
} from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { organizationService } from '@/services/organizationService';
import { shiftService } from '@/services/shiftService';
import {
  AttendanceDaily,
  DailyAttendanceSummary,
  UpdateAttendanceRequest,
} from '@/types/attendance';
import { Department } from '@/types/organization';
import { Shift } from '@/types/shift';
import ThaiTimePicker from '@/components/common/ThaiTimePicker';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function DailyAttendancePage() {
  // State: Date selection (Default to today in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Data States
  const [summary, setSummary] = useState<DailyAttendanceSummary | null>(null);
  const [records, setRecords] = useState<AttendanceDaily[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Loading & Alert States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceDaily | null>(null);
  const [editForm, setEditForm] = useState<{
    shiftId?: number;
    actualInTime: string;
    actualOutTime: string;
    status: string;
    isAbsent: boolean;
  }>({
    shiftId: undefined,
    actualInTime: '',
    actualOutTime: '',
    status: 'PRESENT',
    isAbsent: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Clock-In/Out Modal State
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [clockModalType, setClockModalType] = useState<'in' | 'out'>('in');
  const [clockEmpId, setClockEmpId] = useState<number>(0);
  const [clockTime, setClockTime] = useState('08:30');
  const [savingClock, setSavingClock] = useState(false);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // Load initial departments & shifts
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [deptList, shiftList] = await Promise.all([
          organizationService.getDepartments(),
          shiftService.getShifts(),
        ]);
        setDepartments(deptList);
        setShifts(shiftList);
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Attendance Data & Summary
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, pagedRes] = await Promise.all([
        attendanceService.getDailySummary(selectedDate),
        attendanceService.getDailyAttendance({
          date: selectedDate,
          departmentId: selectedDepartment === 'ALL' ? undefined : selectedDepartment,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          search: searchKeyword.trim() || undefined,
          page: currentPage,
          pageSize: 20,
        }),
      ]);

      setSummary(summaryRes);
      setRecords(pagedRes.items);
      setTotalCount(pagedRes.totalCount);
      setTotalPages(pagedRes.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
      setErrorMessage('ไม่สามารถโหลดข้อมูลบันทึกเวลาได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedDepartment, selectedStatus, searchKeyword, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format date in Thai
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const thaiYear = y + 543;
    return `${d} ${THAI_MONTHS[m - 1]} ${thaiYear}`;
  };

  // Quick Date Navigation (-1 Day, Today, +1 Day)
  const adjustDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const handleRecalculate = async () => {
    try {
      setRefreshing(true);
      const count = await attendanceService.recalculateDaily(selectedDate);
      setSuccessMessage(`ประมวลผลเวลาประจำวันเรียบร้อยแล้ว (${count} รายการใหม่)`);
      await fetchData();
    } catch (err) {
      console.error('Failed to recalculate daily attendance:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการประมวลผลเวลา กรุณาลองใหม่อีกครั้ง');
      setRefreshing(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (rec: AttendanceDaily) => {
    setEditingRecord(rec);

    const parseTimeToHHmm = (dtStr?: string) => {
      if (!dtStr) return '';
      const dt = new Date(dtStr);
      const h = String(dt.getHours()).padStart(2, '0');
      const m = String(dt.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    setEditForm({
      shiftId: rec.shiftId,
      actualInTime: parseTimeToHHmm(rec.actualIn),
      actualOutTime: parseTimeToHHmm(rec.actualOut),
      status: rec.status,
      isAbsent: rec.isAbsent,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      setSavingEdit(true);

      const combineDateAndTime = (timeStr: string) => {
        if (!timeStr) return undefined;
        const [h, m] = timeStr.split(':');
        const dt = new Date(selectedDate);
        dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return dt.toISOString();
      };

      const req: UpdateAttendanceRequest = {
        shiftId: editForm.shiftId,
        actualIn: editForm.actualInTime ? combineDateAndTime(editForm.actualInTime) : undefined,
        actualOut: editForm.actualOutTime ? combineDateAndTime(editForm.actualOutTime) : undefined,
        status: editForm.status,
        isAbsent: editForm.isAbsent,
      };

      await attendanceService.updateAttendance(editingRecord.id, req);
      setSuccessMessage('แก้ไขข้อมูลบันทึกเวลาเรียบร้อยแล้ว');
      setEditModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to update attendance:', err);
      setErrorMessage('ไม่สามารถบันทึกการแก้ไขได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Quick Clock In / Out Modal
  const openQuickClockModal = (type: 'in' | 'out', empId: number = 0) => {
    setClockModalType(type);
    setClockEmpId(empId);
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setClockTime(`${h}:${m}`);
    setClockModalOpen(true);
  };

  const handleSaveQuickClock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clockEmpId <= 0) {
      setErrorMessage('กรุณาเลือกพนักงาน');
      return;
    }

    try {
      setSavingClock(true);
      const [h, m] = clockTime.split(':');
      const dt = new Date(selectedDate);
      dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      const timeIso = dt.toISOString();

      if (clockModalType === 'in') {
        await attendanceService.clockIn({
          employeeId: clockEmpId,
          clockInTime: timeIso,
          workDate: selectedDate,
        });
        setSuccessMessage('ลงเวลาเข้างานสำเร็จ');
      } else {
        await attendanceService.clockOut({
          employeeId: clockEmpId,
          clockOutTime: timeIso,
          workDate: selectedDate,
        });
        setSuccessMessage('ลงเวลาออกงานสำเร็จ');
      }

      setClockModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to clock in/out:', err);
      setErrorMessage('ไม่สามารถลงเวลาได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSavingClock(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string, isAbsent: boolean) => {
    if (isAbsent || status === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>ขาดงาน</span>
        </span>
      );
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ตรงเวลา</span>
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>มาสาย</span>
          </span>
        );
      case 'EARLY_LEAVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>ออกก่อนเวลา</span>
          </span>
        );
      case 'LATE_AND_EARLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>สายและออกก่อน</span>
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>วันหยุดประเพณี</span>
          </span>
        );
      case 'OFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>วันหยุดสัปดาห์</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>รอดำเนินการ</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  // Format Time helper
  const formatTimeStr = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m} น.`;
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0B2046]/5 rounded-xl text-[#0B2046]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ตรวจบันทึกเวลาเข้า-ออกงาน</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ตรวจสอบเวลาสแกนเข้า-ออกงานจริง คำนวณสาย ออกก่อน และสรุปความพร้อมของกำลังพลประจำวัน
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Stepper */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => adjustDate(-1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition"
              title="วันก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-xs font-bold text-[#0B2046] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0B2046]" />
              <span>{formatThaiDate(selectedDate)}</span>
            </div>
            <button
              onClick={() => adjustDate(1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition"
              title="วันถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium text-slate-700"
          />

          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setSelectedDate(today);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            วันนี้
          </button>

          <button
            onClick={handleRecalculate}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="ประมวลผลเวลาใหม่"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0B2046]' : ''}`} />
            <span>คำนวณใหม่</span>
          </button>

          <button
            onClick={() => openQuickClockModal('in')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>ลงเวลาด่วน</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Employees */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">พนักงานทั้งหมด</span>
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {summary?.totalEmployees ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">คนในระบบ</p>
        </div>

        {/* Present */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700">มาตรงเวลา</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {summary?.presentCount ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1">เข้างานปกติ</p>
        </div>

        {/* Late */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-700">มาสาย</span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {summary?.lateCount ?? 0}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-1">เกินเวลาผ่อนปรน</p>
        </div>

        {/* Early Leave */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700">ออกก่อนเวลา</span>
            <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            {summary?.earlyLeaveCount ?? 0}
          </div>
          <p className="text-[11px] text-purple-600/80 mt-1">ก่อนเวลาสิ้นสุดกะ</p>
        </div>

        {/* Absent */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700">ขาดงาน</span>
            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {summary?.absentCount ?? 0}
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1">ไม่พบการลงเวลา</p>
        </div>

        {/* Attendance Rate */}
        <div className="bg-gradient-to-br from-[#0B2046] to-[#1E3A8A] p-4 rounded-2xl text-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">อัตราการเข้างาน</span>
            <div className="p-1.5 bg-white/10 rounded-lg text-white">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">
            {summary?.attendanceRate ?? 0}%
          </div>
          <p className="text-[11px] text-slate-300 mt-1">เทียบวันทำงานปกติ</p>
        </div>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส หรือกะ..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
            />
          </div>

          {/* Department Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedDepartment}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10);
                setSelectedDepartment(val);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium text-slate-700"
            >
              <option value="ALL">ทุกแผนก / ฝ่าย</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium text-slate-700"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="PRESENT">ตรงเวลา</option>
              <option value="LATE">มาสาย</option>
              <option value="EARLY_LEAVE">ออกก่อนเวลา</option>
              <option value="ABSENT">ขาดงาน</option>
              <option value="HOLIDAY">วันหยุดประเพณี</option>
              <option value="OFF">วันหยุดประจำสัปดาห์</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">
          พบทั้งหมด <span className="font-bold font-mono text-slate-900">{totalCount}</span> รายการ
        </div>
      </div>

      {/* 4. Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0B2046]" />
            กำลังโหลดข้อมูลบันทึกเวลาประจำวัน...
          </div>
        ) : records.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">ไม่พบรายการบันทึกเวลาในวันที่เลือก</p>
            <p className="text-xs text-slate-400 mt-1">
              ลองกดปุ่ม &quot;คำนวณใหม่&quot; เพื่อสร้างรายการประจำวัน หรือเปลี่ยนตัวกรองค้นหา
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-3.5 whitespace-nowrap">รหัสพนักงาน</th>
                  <th className="p-3.5 whitespace-nowrap">ชื่อ - นามสกุล</th>
                  <th className="p-3.5 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                  <th className="p-3.5 whitespace-nowrap">กะการทำงาน</th>
                  <th className="p-3.5 whitespace-nowrap text-center">เวลาเข้าจริง</th>
                  <th className="p-3.5 whitespace-nowrap text-center">เวลาออกจริง</th>
                  <th className="p-3.5 whitespace-nowrap text-center">มาสาย</th>
                  <th className="p-3.5 whitespace-nowrap text-center">ออกก่อน</th>
                  <th className="p-3.5 whitespace-nowrap text-center">ชั่วโมงสุทธิ</th>
                  <th className="p-3.5 whitespace-nowrap text-center">สถานะ</th>
                  <th className="p-3.5 whitespace-nowrap text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {records.map((r) => {
                  const hours = Math.floor(r.workedMinutes / 60);
                  const mins = r.workedMinutes % 60;
                  const workedFormatted = r.workedMinutes > 0 ? `${hours} ชม. ${mins} น.` : '-';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {r.employeeCode}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {r.employeeName}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{r.departmentName || '-'}</div>
                        <div className="text-[11px] text-slate-400">{r.positionName || '-'}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {r.shiftName ? (
                          <div>
                            <span className="font-semibold text-slate-800">{r.shiftName}</span>
                            <div className="text-[11px] font-mono text-slate-500">
                              {r.shiftTimeWindow || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {r.actualIn ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                              r.lateMinutes > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {formatTimeStr(r.actualIn)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {r.actualOut ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                              r.earlyLeaveMinutes > 0
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {formatTimeStr(r.actualOut)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {r.lateMinutes > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {r.lateMinutes} นาที
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap">
                        {r.earlyLeaveMinutes > 0 ? (
                          <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {r.earlyLeaveMinutes} นาที
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono whitespace-nowrap text-slate-700 font-semibold">
                        {workedFormatted}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(r.status, r.isAbsent)}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition"
                          title="แก้ไขเวลา"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              หน้า <span className="font-bold">{currentPage}</span> จากทั้งหมด <span className="font-bold">{totalPages}</span> หน้า
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 rounded-lg font-bold transition ${
                    currentPage === pg
                      ? 'bg-[#0B2046] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal: Edit Attendance */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">แก้ไขข้อมูลบันทึกเวลา</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  พนักงาน: {editingRecord.employeeName} ({editingRecord.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กะการทำงาน
                </label>
                <select
                  value={editForm.shiftId || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      shiftId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                >
                  <option value="">-- ไม่ระบุกะ --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shiftName} ({s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)} น.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Pickers (ThaiTimePicker) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <ThaiTimePicker
                    label="เวลาเข้างานจริง"
                    value={editForm.actualInTime || '08:30'}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, actualInTime: val }))}
                    align="left"
                  />
                </div>
                <div>
                  <ThaiTimePicker
                    label="เวลาออกงานจริง"
                    value={editForm.actualOutTime || '17:30'}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, actualOutTime: val }))}
                    align="right"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium"
                >
                  <option value="PRESENT">ตรงเวลา</option>
                  <option value="LATE">มาสาย</option>
                  <option value="EARLY_LEAVE">ออกก่อนเวลา</option>
                  <option value="LATE_AND_EARLY">สายและออกก่อน</option>
                  <option value="ABSENT">ขาดงาน</option>
                  <option value="HOLIDAY">วันหยุดประเพณี</option>
                  <option value="OFF">วันหยุดสัปดาห์</option>
                </select>
              </div>

              {/* Is Absent Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAbsentCheck"
                  checked={editForm.isAbsent}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, isAbsent: e.target.checked }))}
                  className="rounded border-slate-300 text-[#0B2046] focus:ring-[#0B2046]/20 w-4 h-4"
                />
                <label htmlFor="isAbsentCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  ระบุเป็นวันขาดงาน (ไม่นับชั่วโมงทำงาน)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Quick Clock In / Out */}
      {clockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    clockModalType === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {clockModalType === 'in' ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {clockModalType === 'in' ? 'ลงเวลาเข้างาน (Clock In)' : 'ลงเวลาออกงาน (Clock Out)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    วันที่ {formatThaiDate(selectedDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClockModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickClock} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setClockModalType('in')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    clockModalType === 'in' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  เข้างาน (Clock In)
                </button>
                <button
                  type="button"
                  onClick={() => setClockModalType('out')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    clockModalType === 'out' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ออกงาน (Clock Out)
                </button>
              </div>

              {/* Select Employee */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกพนักงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={clockEmpId}
                  onChange={(e) => setClockEmpId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 font-medium text-slate-700"
                  required
                >
                  <option value={0}>-- เลือกพนักงาน --</option>
                  {records.map((r) => (
                    <option key={r.employeeId} value={r.employeeId}>
                      {r.employeeCode} - {r.employeeName} ({r.departmentName || 'ไม่ระบุแผนก'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Picker */}
              <div>
                <ThaiTimePicker
                  label={clockModalType === 'in' ? 'เวลาเข้างาน' : 'เวลาออกงาน'}
                  value={clockTime}
                  onChange={(val) => setClockTime(val)}
                  align="left"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClockModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingClock}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0B2046] hover:bg-[#0B2046]/90 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {savingClock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>บันทึกการลงเวลา</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
