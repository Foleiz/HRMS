'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sun,
  Moon,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { workCalendarService } from '@/services/workCalendarService';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import {
  WorkWeekDay,
  Holiday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
} from '@/types/workCalendar';

type TabType = 'work-week' | 'holidays';

const dayColorMap: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  0: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800' }, // อาทิตย์
  1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' }, // จันทร์
  2: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-800' }, // อังคาร
  3: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' }, // พุธ
  4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' }, // พฤหัสบดี
  5: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-800' }, // ศุกร์
  6: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' }, // เสาร์
};

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const thaiDayNamesShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  const dayName = thaiDayNamesShort[d.getDay()];
  const thaiYear = year + 543;

  return `${dayName} ${day} ${thaiMonths[month]} ${thaiYear}`;
}

function calculateDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '-';
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return '-';
  let totalMin = (eH * 60 + eM) - (sH * 60 + sM);
  if (totalMin < 0) totalMin += 24 * 60;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${mins} นาที`;
}

export default function WorkCalendarPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState<TabType>('work-week');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Data states
  const [workWeek, setWorkWeek] = useState<WorkWeekDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Bulk working hours states
  const [bulkStartTime, setBulkStartTime] = useState('08:30');
  const [bulkEndTime, setBulkEndTime] = useState('17:30');

  // Alert states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states (Holiday)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [holidayForm, setHolidayForm] = useState<{ id?: number; holidayDate: string; holidayName: string; holidayType: string }>({
    holidayDate: '',
    holidayName: '',
    holidayType: 'PUBLIC',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string; date: string } | null>(null);

  // Sync breadcrumb
  useEffect(() => {
    setBreadcrumb({
      section: 'ตั้งค่าระบบ',
      page: activeTab === 'work-week' ? 'วันทำงานประจำสัปดาห์' : 'จัดการวันหยุดประจำปี',
    });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const [weekData, holidayData] = await Promise.all([
        workCalendarService.getWorkWeek(),
        workCalendarService.getHolidays(selectedYear),
      ]);
      setWorkWeek(weekData);
      setHolidays(holidayData);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทินการทำงาน');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Handle Work Week toggle
  const handleToggleDay = (dayOfWeek: number) => {
    setWorkWeek((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek === dayOfWeek) {
          const nextWorking = !d.isWorkingDay;
          return {
            ...d,
            isWorkingDay: nextWorking,
            startTime: nextWorking ? (d.startTime || '08:30') : null,
            endTime: nextWorking ? (d.endTime || '17:30') : null,
          };
        }
        return d;
      })
    );
  };

  // Handle time change for specific day
  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setWorkWeek((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  // Handle bulk apply working hours
  const handleApplyBulkTime = () => {
    setWorkWeek((prev) =>
      prev.map((d) =>
        d.isWorkingDay
          ? { ...d, startTime: bulkStartTime, endTime: bulkEndTime }
          : d
      )
    );
    setSuccessMessage(`ปรับเวลาทำงานเป็น ${bulkStartTime} - ${bulkEndTime} ให้ทุกวันทำงานเรียบร้อยแล้ว (อย่าลืมกดปุ่มบันทึก)`);
  };

  const handleSaveWorkWeek = async () => {
    try {
      setSaving(true);
      const updated = await workCalendarService.updateWorkWeek({
        days: workWeek.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isWorkingDay: d.isWorkingDay,
          startTime: d.isWorkingDay ? (d.startTime || '08:30') : null,
          endTime: d.isWorkingDay ? (d.endTime || '17:30') : null,
        })),
      });
      setWorkWeek(updated);
      setSuccessMessage('บันทึกการตั้งค่าวันทำงานและเวลาเข้า-ออกงานสำเร็จ');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถบันทึกการตั้งค่าวันทำงานได้');
    } finally {
      setSaving(false);
    }
  };

  // Holiday Modal Handlers
  const handleOpenCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setHolidayForm({
      holidayDate: today,
      holidayName: '',
      holidayType: 'PUBLIC',
    });
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEditModal = (h: Holiday) => {
    setHolidayForm({
      id: h.id,
      holidayDate: h.holidayDate,
      holidayName: h.holidayName,
      holidayType: h.holidayType,
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const created = await workCalendarService.createHoliday({
          holidayDate: holidayForm.holidayDate,
          holidayName: holidayForm.holidayName,
          holidayType: holidayForm.holidayType,
        });
        setHolidays((prev) => [...prev, created].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)));
        setSuccessMessage('เพิ่มวันหยุดประจำปีสำเร็จ');
      } else if (holidayForm.id) {
        const updated = await workCalendarService.updateHoliday(holidayForm.id, {
          holidayDate: holidayForm.holidayDate,
          holidayName: holidayForm.holidayName,
          holidayType: holidayForm.holidayType,
        });
        setHolidays((prev) =>
          prev.map((h) => (h.id === updated.id ? updated : h)).sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
        );
        setSuccessMessage('แก้ไขข้อมูลวันหยุดสำเร็จ');
      }
      setModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลวันหยุดได้');
    }
  };

  const handleConfirmDelete = (h: Holiday) => {
    setItemToDelete({ id: h.id, name: h.holidayName, date: h.holidayDate });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      await workCalendarService.deleteHoliday(itemToDelete.id);
      setHolidays((prev) => prev.filter((h) => h.id !== itemToDelete.id));
      setSuccessMessage(`ลบวันหยุด "${itemToDelete.name}" สำเร็จ`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'ไม่สามารถลบข้อมูลวันหยุดได้');
    }
  };

  // Filtered holidays
  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      h.holidayName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      h.holidayDate.includes(searchQuery.trim());
    const matchesType = filterType === 'ALL' || h.holidayType === filterType;
    return matchesSearch && matchesType;
  });

  const workingDaysCount = workWeek.filter((d) => d.isWorkingDay).length;
  const offDaysCount = 7 - workingDaysCount;

  return (
    <div className="space-y-6">
      {/* 1. Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Sub-navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 shadow-sm overflow-x-auto">
        <div className="flex gap-2 text-sm font-medium whitespace-nowrap min-w-max">
          <button
            onClick={() => {
              setActiveTab('work-week');
              setSearchQuery('');
            }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'work-week'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>วันทำงานประจำสัปดาห์</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('holidays');
              setSearchQuery('');
            }}
            className={`pb-3 px-3.5 border-b-2 font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'holidays'
                ? 'border-[#0B2046] text-[#0B2046]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>วันหยุดประจำปี</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Content Panels */}
      <div className="bg-white border border-slate-200 border-t-0 rounded-b-2xl p-6 shadow-sm">
        {/* ========================================================= */}
        {/* TAB 1: WORK WEEK */}
        {/* ========================================================= */}
        {activeTab === 'work-week' && (
          <div className="space-y-6">
            {/* Header / Sub-title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">กำหนดวันและเวลาทำงานปกติของบริษัท</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบุวันทำงานปกติและเวลาเข้า-ออกงานมาตรฐานขององค์กร เพื่อใช้คำนวณการเข้างาน สาย และการทำงานล่วงเวลา (OT)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold whitespace-nowrap">
                  <Sun className="w-3.5 h-3.5" />
                  ทำงาน {workingDaysCount} วัน
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold whitespace-nowrap">
                  <Moon className="w-3.5 h-3.5" />
                  วันหยุด {offDaysCount} วัน
                </div>
              </div>
            </div>

            {/* Quick Link Notice Banner to Shift Schedules */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-700">
                <div className="w-7 h-7 rounded-lg bg-[#0B2046]/10 text-[#0B2046] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">เวลาทำงานมาตรฐานระดับองค์กร</span>
                  <span className="text-slate-500 block sm:inline sm:ml-1.5">
                    — ใช้เป็นค่าเริ่มต้นสำหรับพนักงานทั่วไป หากต้องการจัดเวร สลับกะ หรือจัดตารางเฉพาะบุคคล/แผนก
                  </span>
                </div>
              </div>
              <Link
                href="/attendance/schedules"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-[#0B2046] font-semibold text-xs shadow-sm transition-all whitespace-nowrap shrink-0 group"
              >
                <span>ไปยังหน้าจัดกะและตารางงาน</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Quick Bulk Apply Bar */}
            <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">กำหนดเวลาทำงานพร้อมกันทุกวันทำงาน</h3>
                  <p className="text-[11px] text-slate-500">
                    ระบุเวลาเข้าและเลิกงานที่ต้องการ แล้วกดปุ่มเพื่ออัปเดตให้กับทุกวันที่เปิดทำงาน (ไม่กระทบวันหยุด)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
                  <span className="text-slate-500 font-medium">เข้า:</span>
                  <input
                    type="time"
                    value={bulkStartTime}
                    onChange={(e) => setBulkStartTime(e.target.value)}
                    className="font-semibold text-slate-800 bg-transparent focus:outline-none text-xs"
                  />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 font-medium">ออก:</span>
                  <input
                    type="time"
                    value={bulkEndTime}
                    onChange={(e) => setBulkEndTime(e.target.value)}
                    className="font-semibold text-slate-800 bg-transparent focus:outline-none text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyBulkTime}
                  className="px-3.5 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  นำไปใช้กับทุกวันทำงาน
                </button>
              </div>
            </div>

            {/* 7-Day Grid Cards */}
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                กำลังโหลดการตั้งค่าวันทำงาน...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                {workWeek.map((day) => {
                  const colors = dayColorMap[day.dayOfWeek] || dayColorMap[0];
                  return (
                    <div
                      key={day.id}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between min-h-[220px] ${
                        day.isWorkingDay
                          ? 'border-[#0B2046] bg-white shadow-md shadow-[#0B2046]/5 hover:border-[#081836]'
                          : 'border-slate-200 bg-slate-50/70 opacity-90 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      {/* Top: Day Name, Badge & Toggle Switch */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${colors.badge}`}>
                            {day.dayNameThai.replace('วัน', '')}
                          </span>
                          
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleDay(day.dayOfWeek)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              day.isWorkingDay ? 'bg-[#0B2046]' : 'bg-slate-300'
                            }`}
                            title={day.isWorkingDay ? 'คลิกเพื่อตั้งเป็นวันหยุด' : 'คลิกเพื่อตั้งเป็นวันทำงาน'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                day.isWorkingDay ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        <div>
                          <div className="text-sm font-bold text-slate-900">{day.dayNameThai}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{day.dayNameEnglish}</div>
                        </div>
                      </div>

                      {/* Middle: Work Time Inputs or Off Day Box */}
                      {day.isWorkingDay ? (
                        <div className="space-y-2 py-2.5 my-1.5 border-y border-slate-100">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> เข้างาน
                            </span>
                            <input
                              type="time"
                              value={day.startTime || '08:30'}
                              onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                              className="w-24 px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B2046] focus:bg-white text-center"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> เลิกงาน
                            </span>
                            <input
                              type="time"
                              value={day.endTime || '17:30'}
                              onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                              className="w-24 px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B2046] focus:bg-white text-center"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>ชั่วโมงทำงาน:</span>
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              {calculateDuration(day.startTime, day.endTime)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-5 my-1.5 border-y border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
                          <Moon className="w-5 h-5 text-slate-300" />
                          <span className="text-[11px] font-medium">วันหยุดประจำสัปดาห์</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDay(day.dayOfWeek)}
                            className="mt-0.5 text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                          >
                            + เปิดเป็นวันทำงาน
                          </button>
                        </div>
                      )}

                      {/* Bottom Status Pill */}
                      <div className="pt-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap w-full justify-center ${
                            day.isWorkingDay
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              day.isWorkingDay ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {day.isWorkingDay ? 'วันทำงานปกติ' : 'วันหยุดประจำสัปดาห์'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                💡 สามารถคลิกสลับวันทำงาน/วันหยุด และกำหนดเวลาเข้า-ออกงานแยกตามวันได้อย่างอิสระ
              </span>

              <button
                onClick={handleSaveWorkWeek}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึกการตั้งค่าวันและเวลาทำงาน
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: HOLIDAYS */}
        {/* ========================================================= */}
        {activeTab === 'holidays' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl w-full">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อวันหยุด หรือวันที่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                  />
                </div>

                {/* Year Filter */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value={2025}>ปี พ.ศ. 2568 (2025)</option>
                  <option value={2026}>ปี พ.ศ. 2569 (2026)</option>
                  <option value={2027}>ปี พ.ศ. 2570 (2027)</option>
                </select>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="ALL">ทุกประเภทวันหยุด</option>
                  <option value="PUBLIC">วันหยุดตามประเพณี</option>
                  <option value="COMPANY_SPECIAL">วันหยุดพิเศษบริษัท</option>
                  <option value="SUBSTITUTE">วันหยุดชดเชย</option>
                </select>
              </div>

              {/* Add Holiday Button */}
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                เพิ่มวันหยุดประจำปี
              </button>
            </div>

            {/* Holidays Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B2046] text-white font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center w-12">ลำดับ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">วันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ชื่อวันหยุด</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ประเภทวันหยุด</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2046]" />
                        กำลังโหลดข้อมูลวันหยุดประจำปี...
                      </td>
                    </tr>
                  ) : filteredHolidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 whitespace-nowrap">
                        ไม่พบข้อมูลวันหยุดสำหรับปี {selectedYear + 543} ({selectedYear})
                      </td>
                    </tr>
                  ) : (
                    filteredHolidays.map((h, idx) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              {h.holidayDate}
                            </span>
                            <span className="text-slate-600 font-medium">
                              ({formatThaiDate(h.holidayDate)})
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {h.holidayName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                              h.holidayType === 'PUBLIC'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : h.holidayType === 'COMPANY_SPECIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {h.holidayTypeThai}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(h)}
                              title="แก้ไข"
                              className="p-1.5 text-slate-500 hover:text-[#0B2046] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(h)}
                              title="ลบ"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. Create / Edit Holiday Modal */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalMode === 'create' ? 'เพิ่มวันหยุดประจำปี' : 'แก้ไขข้อมูลวันหยุด'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่วันหยุด *</label>
                <input
                  type="date"
                  required
                  value={holidayForm.holidayDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อวันหยุด *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น วันขึ้นปีใหม่, วันสงกรานต์..."
                  value={holidayForm.holidayName}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20 focus:border-[#0B2046]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทวันหยุด *</label>
                <select
                  value={holidayForm.holidayType}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayType: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#F1F5F9] border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B2046]/20"
                >
                  <option value="PUBLIC">วันหยุดตามประเพณี</option>
                  <option value="COMPANY_SPECIAL">วันหยุดพิเศษบริษัท</option>
                  <option value="SUBSTITUTE">วันหยุดชดเชย</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-semibold shadow-md shadow-[#0B2046]/20 transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. Delete Confirmation Modal */}
      {/* ========================================================= */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">ยืนยันการลบวันหยุด?</h3>
            <p className="text-xs text-slate-500 mb-4">
              คุณต้องการลบวันหยุด <span className="font-semibold text-slate-800">"{itemToDelete.name}"</span> ({itemToDelete.date}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
